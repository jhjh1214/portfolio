// Security tests for the portfolio backend, run against the local stack (`npm run backend:up`).
// Exercises the real Postgres row-level security + GoTrue email OTP + TOTP MFA. Exit code 1 on any failure.
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { TOTP, Secret } from 'otpauth'
import { ANON_KEY, URL, sign } from './keys.mjs'

const rnd = Math.random().toString(36).slice(2, 8)
const OWNER = `owner-${rnd}@example.test`
const V1 = `visitor1-${rnd}@example.test`
const V2 = `visitor2-${rnd}@example.test`
let failed = 0
const ok = (name, cond, extra = '') => { if (!cond) failed++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`) }

const psql = (sql) => execFileSync('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', 'postgres', '-tAc', sql], { cwd: new globalThis.URL('.', import.meta.url), encoding: 'utf8' }).trim()
const client = () => createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

async function latestCode(email) {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`http://localhost:54324/api/v1/search?query=${encodeURIComponent('to:' + email)}`)).json()
    if (list.messages?.length) {
      const msg = await (await fetch(`http://localhost:54324/api/v1/message/${list.messages[0].ID}`)).json()
      const m = /\b(\d{6})\b/.exec(msg.Text || '')
      if (m) return m[1]
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('no code email for ' + email)
}
async function signIn(email, name) {
  const c = client()
  const { error } = await c.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: { display_name: name } } })
  if (error) throw error
  const token = await latestCode(email)
  const { data, error: e2 } = await c.auth.verifyOtp({ email, token, type: 'email' })
  if (e2) throw e2
  return { c, user: data.user }
}
const rpcBool = async (c, fn) => (await c.rpc(fn)).data

psql(`insert into public.owner_emails(email) values ('${OWNER}')`)
psql("notify pgrst, 'reload schema'")
await new Promise((r) => setTimeout(r, 1500))
psql('truncate public.messages')

// ---- Anonymous
{
  const a = client()
  const r = await a.from('site_content').select('*')
  ok('anon can read published content', !r.error)
  const w = await a.from('site_content').upsert({ id: 'main', data: { hacked: true } })
  ok('anon cannot write content', !!w.error, w.error?.code)
  const m = await a.from('messages').insert({ name: 'Ann', email: 'ann@example.test', whatsapp: '+60123456789', body: 'hello' })
  ok('anon can send a message', !m.error, m.error?.message)
  const rd = await a.from('messages').select('*')
  ok('anon cannot read messages', !!rd.error || (rd.data?.length ?? 0) === 0, rd.error?.code)
  const bad1 = await a.from('messages').insert({ name: 'x', email: 'not-an-email', body: 'hi' })
  ok('invalid email rejected', !!bad1.error)
  const bad2 = await a.from('messages').insert({ name: 'x', email: 'x@example.test', whatsapp: '0123456789', body: 'hi' })
  ok('non-E.164 WhatsApp rejected', !!bad2.error)
  const bad3 = await a.from('messages').insert({ name: 'x', email: 'x@example.test', body: 'a'.repeat(4001) })
  ok('oversized message rejected', !!bad3.error)
  for (let i = 0; i < 2; i++) await a.from('messages').insert({ name: 'Ann', email: 'ann@example.test', body: `n${i}` })
  const limited = await a.from('messages').insert({ name: 'Ann', email: 'ann@example.test', body: 'n3' })
  ok('4th message from the same email within an hour is rate limited', !!limited.error && /rate_limited/.test(limited.error.message), limited.error?.message)
  const cnt = await a.rpc('friend_count')
  ok('anon can read friend count only', !cnt.error && typeof cnt.data === 'number')
  const po = await a.from('profiles').select('*')
  ok('anon cannot read profiles', !!po.error || (po.data?.length ?? 0) === 0)
  const oe = await a.from('owner_emails').select('*')
  ok('owner allow-list is unreachable', !!oe.error || (oe.data?.length ?? 0) === 0)
}

// ---- Forged token
{
  const forged = sign({ role: 'authenticated', sub: '00000000-0000-0000-0000-000000000001', email: OWNER, aal: 'aal2', exp: Math.floor(Date.now() / 1000) + 3600 })
  const bad = createClient(URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${forged.slice(0, -3)}abc` } }, auth: { persistSession: false } })
  const r = await bad.from('messages').select('*')
  ok('token with a bad signature is rejected', !!r.error && (r.error.code === 'PGRST301' || r.status === 401), `${r.status} ${r.error?.code}`)
}

// ---- Visitors
const v1 = await signIn(V1, 'Vee One')
const v2 = await signIn(V2, 'Vee Two')
{
  const p = await v1.c.from('profiles').select('*')
  ok('visitor gets a profile created from the sign-up name', p.data?.length === 1 && p.data[0].display_name === 'Vee One')
  ok("visitor sees only their own profile", p.data?.every((x) => x.id === v1.user.id))
  const up = await v1.c.from('profiles').update({ progress: { xp: 42 }, theme: 'steam', mode: 'dark' }).eq('id', v1.user.id).select()
  ok('visitor can save their own progress and theme', up.data?.[0]?.progress?.xp === 42 && up.data[0].theme === 'steam')
  const steal = await v2.c.from('profiles').update({ progress: { xp: 999999 } }).eq('id', v1.user.id).select()
  ok("visitor cannot modify another visitor's profile", (steal.data?.length ?? 0) === 0)
  const badTheme = await v1.c.from('profiles').update({ theme: 'nope' }).eq('id', v1.user.id)
  ok('invalid theme rejected by constraint', !!badTheme.error)
  const w = await v1.c.from('site_content').upsert({ id: 'main', data: { hacked: true } })
  ok('visitor cannot write content', !!w.error)
  const rd = await v1.c.from('messages').select('*')
  ok('visitor cannot read messages', (rd.data?.length ?? 0) === 0)
  ok('visitor is not owner', (await rpcBool(v1.c, 'is_owner_email')) === false && (await rpcBool(v1.c, 'is_owner')) === false)
  const spoof = await v1.c.from('messages').insert({ user_id: v2.user.id, name: 'x', email: 'spoof@example.test', body: 'as someone else' })
  ok("visitor cannot send a message as another user", !!spoof.error)
  const mine = await v1.c.from('messages').insert({ name: 'Vee', email: V1, body: 'linked to me' })
  ok('signed-in message is linked to the sender', !mine.error && psql(`select count(*) from public.messages where user_id='${v1.user.id}'`) === '1')
  // Email-change hijack attempt
  await v1.c.auth.updateUser({ email: OWNER })
  await v1.c.auth.refreshSession()
  ok('requesting an email change to the owner address does not confer owner rights', (await rpcBool(v1.c, 'is_owner_email')) === false)
  const cnt = await v1.c.rpc('friend_count')
  ok('friend count includes signed-up visitors', cnt.data >= 2)
}

// ---- A visitor with MFA is still not the owner
{
  const en = await v2.c.auth.mfa.enroll({ factorType: 'totp' })
  const totp = new TOTP({ secret: Secret.fromBase32(en.data.totp.secret), digits: 6, period: 30 })
  const ch = await v2.c.auth.mfa.challenge({ factorId: en.data.id })
  const vf = await v2.c.auth.mfa.verify({ factorId: en.data.id, challengeId: ch.data.id, code: totp.generate() })
  ok('visitor can complete MFA (aal2)', !vf.error)
  const w = await v2.c.from('site_content').upsert({ id: 'main', data: { hacked: true } })
  ok('aal2 alone does not grant write access', !!w.error)
  ok('aal2 visitor is still not owner', (await rpcBool(v2.c, 'is_owner')) === false)
}

// ---- Owner
{
  const o = await signIn(OWNER, 'Owner')
  ok('owner email is recognised', (await rpcBool(o.c, 'is_owner_email')) === true)
  ok('owner without 2FA is NOT yet owner', (await rpcBool(o.c, 'is_owner')) === false)
  const w1 = await o.c.from('site_content').upsert({ id: 'main', data: { v: 1 } })
  ok('owner without 2FA cannot write content', !!w1.error)
  const r1 = await o.c.from('messages').select('*')
  ok('owner without 2FA cannot read messages', (r1.data?.length ?? 0) === 0)

  const en = await o.c.auth.mfa.enroll({ factorType: 'totp' })
  ok('owner can enrol TOTP', !en.error && !!en.data?.totp?.secret)
  const totp = new TOTP({ secret: Secret.fromBase32(en.data.totp.secret), digits: 6, period: 30 })
  const ch = await o.c.auth.mfa.challenge({ factorId: en.data.id })
  const wrong = await o.c.auth.mfa.verify({ factorId: en.data.id, challengeId: ch.data.id, code: '000000' })
  ok('wrong TOTP code is rejected', !!wrong.error)
  const ch2 = await o.c.auth.mfa.challenge({ factorId: en.data.id })
  const good = await o.c.auth.mfa.verify({ factorId: en.data.id, challengeId: ch2.data.id, code: totp.generate() })
  ok('correct TOTP code upgrades the session to aal2', !good.error)

  ok('owner with 2FA is owner', (await rpcBool(o.c, 'is_owner')) === true)
  const w2 = await o.c.from('site_content').upsert({ id: 'main', data: { v: 2 } }).select()
  ok('owner with 2FA can write content', !w2.error && w2.data?.[0]?.data?.v === 2, w2.error?.message)
  const pub = await client().from('site_content').select('data').eq('id', 'main').single()
  ok('published content is visible to anonymous visitors', pub.data?.data?.v === 2)
  const r2 = await o.c.from('messages').select('*').order('created_at', { ascending: false })
  ok('owner with 2FA reads all messages', (r2.data?.length ?? 0) >= 4, `(${r2.data?.length})`)
  const mark = await o.c.from('messages').update({ read_at: new Date().toISOString() }).eq('id', r2.data[0].id).select()
  ok('owner can mark a message read', mark.data?.[0]?.read_at != null)
  const allProfiles = await o.c.from('profiles').select('id')
  ok('owner can list friends (profiles)', (allProfiles.data?.length ?? 0) >= 3, `(${allProfiles.data?.length})`)
  const del = await o.c.from('messages').delete().eq('id', r2.data[0].id).select()
  ok('owner can delete a message', del.data?.length === 1)
}

psql(`delete from public.owner_emails where email='${OWNER}'`)
console.log(failed ? `\n${failed} FAILED` : '\nAll backend security checks passed')
process.exit(failed ? 1 : 0)
