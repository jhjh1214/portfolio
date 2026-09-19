import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOTP, Secret } from 'otpauth'
import { createApp, type Bindings } from '../src/app'
import { sqliteDb } from '../src/sqlite'
import { devInbox } from '../src/mailer'
import { sha256Hex } from '../src/crypto'
import type { DB } from '../src/db'

const OWNER = 'owner@example.test'
const ORIGIN = 'https://site.example'
const SECRET = 'test-secret-that-is-long-enough-for-anything'
let db: DB
let env: Bindings
const app = createApp()

beforeEach(() => {
  db = sqliteDb(':memory:')
  env = { DB: db, APP_SECRET: SECRET, OWNER_EMAIL: OWNER, DEV_INBOX: '1', ALLOWED_ORIGINS: ORIGIN }
  devInbox.length = 0
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

type Init = { method?: string; body?: unknown; token?: string; headers?: Record<string, string>; raw?: string | Uint8Array }
async function call(path: string, o: Init = {}, e: Bindings = env) {
  const headers: Record<string, string> = { ...(o.headers ?? {}) }
  if (o.token) headers.authorization = `Bearer ${o.token}`
  if (o.body !== undefined) headers['content-type'] = 'application/json'
  const method = o.method ?? (o.body !== undefined || o.raw ? 'POST' : 'GET')
  const payload = method === 'GET' || method === 'HEAD' ? undefined : (o.raw ?? (o.body !== undefined ? JSON.stringify(o.body) : undefined))
  const res = await app.request(path, { method, headers, body: payload as never }, e)
  const text = await res.text()
  let json: any = null // eslint-disable-line @typescript-eslint/no-explicit-any
  try { json = JSON.parse(text) } catch { /* not json */ }
  return { status: res.status, json, headers: res.headers, text }
}
const lastCode = (to: string) => /\b(\d{6})\b/.exec([...devInbox].reverse().find((m) => m.to === to)!.text)![1]

async function signIn(email: string, name?: string) {
  expect((await call('/api/auth/request', { body: { email, name } })).status).toBe(200)
  const r = await call('/api/auth/verify', { body: { email, code: lastCode(email) } })
  expect(r.status).toBe(200)
  return r.json.token as string
}
const totpFor = (secret: string, t = Date.now()) => new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 }).generate({ timestamp: t })

/** Sign in as the owner and complete two-step verification. */
async function ownerSession() {
  const token = await signIn(OWNER, 'Owner')
  const setup = await call('/api/owner/totp/setup', { token, body: {} })
  expect(setup.status).toBe(200)
  const v = await call('/api/owner/totp/verify', { token, body: { code: totpFor(setup.json.secret) } })
  expect(v.status).toBe(200)
  return { token, secret: setup.json.secret as string }
}

describe('anonymous visitors', () => {
  it('can read published content and the friend count', async () => {
    expect((await call('/api/content')).json).toEqual({ data: null, updatedAt: null })
    expect((await call('/api/friends/count')).json.count).toBe(0)
  })

  it('cannot write content, read messages, list friends, or upload media', async () => {
    for (const [method, path] of [['PUT', '/api/owner/content'], ['GET', '/api/owner/messages'], ['GET', '/api/owner/friends'], ['POST', '/api/owner/media'], ['POST', '/api/owner/totp/setup']]) {
      expect((await call(path, { method, body: {} })).status, `${method} ${path}`).toBe(401)
    }
    expect((await call('/api/me')).status).toBe(401)
  })

  it('can send a valid message, which is stored and emailed to the owner', async () => {
    const r = await call('/api/messages', { body: { name: 'Ann', email: 'ann@example.test', whatsapp: '+60123456789', body: 'hello' } })
    expect(r.status).toBe(201)
    expect((await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM messages'))!.n).toBe(1)
    expect(devInbox.find((m) => m.to === OWNER)?.subject).toBe('New message from Ann')
  })

  it.each([
    ['bad email', { name: 'x', email: 'not-an-email', body: 'hi' }],
    ['non E.164 WhatsApp', { name: 'x', email: 'x@example.test', whatsapp: '0123456789', body: 'hi' }],
    ['empty body', { name: 'x', email: 'x@example.test', body: '  ' }],
    ['oversized body', { name: 'x', email: 'x@example.test', body: 'a'.repeat(4001) }],
    ['missing name', { email: 'x@example.test', body: 'hi' }],
  ])('rejects a message with %s', async (_n, body) => {
    expect((await call('/api/messages', { body })).status).toBe(400)
  })

  it('silently drops honeypot submissions without storing them', async () => {
    const r = await call('/api/messages', { body: { name: 'Bot', email: 'bot@example.test', body: 'buy now', company: 'ACME' } })
    expect(r.status).toBe(200)
    expect((await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM messages'))!.n).toBe(0)
  })

  it('rate limits messages per email (3 an hour)', async () => {
    const send = () => call('/api/messages', { body: { name: 'Ann', email: 'ann@example.test', body: 'hi' } })
    for (let i = 0; i < 3; i++) expect((await send()).status).toBe(201)
    expect((await send()).status).toBe(429)
    expect((await call('/api/messages', { body: { name: 'Bob', email: 'bob@example.test', body: 'hi' } })).status).toBe(201)
  })

  it('cannot read captured sign-in codes unless demo mode is on', async () => {
    await call('/api/auth/request', { body: { email: 'vee@example.test' } }) // demo mode captured a real code
    expect((await call('/api/dev/last-mail?to=vee@example.test')).status).toBe(200)
    const off = await call('/api/dev/last-mail?to=vee@example.test', {}, { ...env, DEV_INBOX: '0' })
    expect(off.status).toBe(404)
    expect(off.text).not.toMatch(/\d{6}/)
  })
})

describe('email one-time codes', () => {
  it('signs a new visitor in and creates their profile from the sign-up name', async () => {
    const token = await signIn('vee@example.test', 'Vee One')
    const me = await call('/api/me', { token })
    expect(me.json.user.email).toBe('vee@example.test')
    expect(me.json.user.displayName).toBe('Vee One')
    expect(me.json.owner).toBe(false)
    expect(me.json.ownerEmail).toBe(false)
  })

  it('stores only hashes: no plaintext code and no session token in the database', async () => {
    const token = await signIn('vee@example.test')
    expect(await db.first('SELECT 1 FROM sessions WHERE token_hash = ?', token)).toBeNull()
    expect(await db.first('SELECT 1 FROM sessions WHERE token_hash = ?', await sha256Hex(token))).not.toBeNull()
    await call('/api/auth/request', { body: { email: 'vee@example.test' } })
    const code = lastCode('vee@example.test')
    const row = await db.first<{ code_hash: string }>('SELECT code_hash FROM otp_codes')
    expect(row!.code_hash).not.toContain(code)
    expect(row!.code_hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('refuses a wrong code and reports it the same way as an expired or unknown one', async () => {
    await call('/api/auth/request', { body: { email: 'vee@example.test' } })
    const wrong = lastCode('vee@example.test') === '000000' ? '000001' : '000000'
    const a = await call('/api/auth/verify', { body: { email: 'vee@example.test', code: wrong } })
    const b = await call('/api/auth/verify', { body: { email: 'nobody@example.test', code: '123456' } })
    expect(a.status).toBe(400)
    expect(a.json).toEqual(b.json)
  })

  it('locks a code after 5 wrong tries, even if the right one is then entered', async () => {
    await call('/api/auth/request', { body: { email: 'vee@example.test' } })
    const good = lastCode('vee@example.test')
    const wrong = good === '000000' ? '000001' : '000000'
    for (let i = 0; i < 5; i++) expect((await call('/api/auth/verify', { body: { email: 'vee@example.test', code: wrong } })).status).toBe(400)
    expect((await call('/api/auth/verify', { body: { email: 'vee@example.test', code: good } })).status).toBe(429)
    expect((await call('/api/auth/verify', { body: { email: 'vee@example.test', code: good } })).status).toBe(400)
  })

  it('works exactly once', async () => {
    await call('/api/auth/request', { body: { email: 'vee@example.test' } })
    const code = lastCode('vee@example.test')
    expect((await call('/api/auth/verify', { body: { email: 'vee@example.test', code } })).status).toBe(200)
    expect((await call('/api/auth/verify', { body: { email: 'vee@example.test', code } })).status).toBe(400)
  })

  it('expires after 10 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await call('/api/auth/request', { body: { email: 'vee@example.test' } })
    const code = lastCode('vee@example.test')
    vi.setSystemTime(Date.now() + 10 * 60_000 + 1000)
    expect((await call('/api/auth/verify', { body: { email: 'vee@example.test', code } })).status).toBe(400)
  })

  it('a newer code replaces the older one', async () => {
    await call('/api/auth/request', { body: { email: 'vee@example.test' } })
    const first = lastCode('vee@example.test')
    let second = first
    while (second === first) { await call('/api/auth/request', { body: { email: 'vee@example.test' } }); second = lastCode('vee@example.test') }
    expect((await call('/api/auth/verify', { body: { email: 'vee@example.test', code: first } })).status).toBe(400)
    expect((await call('/api/auth/verify', { body: { email: 'vee@example.test', code: second } })).status).toBe(200)
  })

  it('rate limits code requests per email (5 an hour)', async () => {
    for (let i = 0; i < 5; i++) expect((await call('/api/auth/request', { body: { email: 'vee@example.test' } })).status).toBe(200)
    expect((await call('/api/auth/request', { body: { email: 'vee@example.test' } })).status).toBe(429)
  })

  it('does not reveal whether an account exists', async () => {
    await signIn('known@example.test')
    const a = await call('/api/auth/request', { body: { email: 'known@example.test' } })
    const b = await call('/api/auth/request', { body: { email: 'unknown@example.test' } })
    expect([a.status, a.json]).toEqual([b.status, b.json])
  })

  it('refuses to send when no email provider is configured (and not in demo mode)', async () => {
    const r = await call('/api/auth/request', { body: { email: 'vee@example.test' } }, { ...env, DEV_INBOX: '0' })
    expect(r.status).toBe(503)
  })
})

describe('sessions', () => {
  it('rejects forged, malformed and unknown tokens', async () => {
    await signIn('vee@example.test')
    for (const t of ['s_' + 'A'.repeat(43), 's_short', 'plainstring', '']) expect((await call('/api/me', { token: t || undefined })).status).toBe(401)
    const r = await app.request('/api/me', { headers: { authorization: 'Basic abc' } }, env)
    expect(r.status).toBe(401)
  })

  it('logout revokes the token', async () => {
    const token = await signIn('vee@example.test')
    expect((await call('/api/auth/logout', { token, method: 'POST' })).status).toBe(204)
    expect((await call('/api/me', { token })).status).toBe(401)
  })

  it('visitor sessions last 30 days and then expire', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const token = await signIn('vee@example.test')
    vi.setSystemTime(Date.now() + 29 * 24 * 3600_000)
    expect((await call('/api/me', { token })).status).toBe(200)
    vi.setSystemTime(Date.now() + 2 * 24 * 3600_000)
    expect((await call('/api/me', { token })).status).toBe(401)
  })

  it('owner sessions are shorter (12 hours)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const token = await signIn(OWNER)
    vi.setSystemTime(Date.now() + 13 * 3600_000)
    expect((await call('/api/me', { token })).status).toBe(401)
  })
})

describe('visitor data', () => {
  it('lets a visitor save and read their own progress, theme and mode', async () => {
    const token = await signIn('vee@example.test')
    expect((await call('/api/me', { token, method: 'PUT', body: { progress: { xp: 42 }, theme: 'steam', mode: 'dark' } })).status).toBe(200)
    const me = (await call('/api/me', { token })).json.user
    expect([me.progress.xp, me.theme, me.mode]).toEqual([42, 'steam', 'dark'])
  })

  it('validates what it stores', async () => {
    const token = await signIn('vee@example.test')
    expect((await call('/api/me', { token, method: 'PUT', body: { theme: 'nope' } })).status).toBe(400)
    expect((await call('/api/me', { token, method: 'PUT', body: { mode: 'sepia' } })).status).toBe(400)
    expect((await call('/api/me', { token, method: 'PUT', body: { progress: { blob: 'x'.repeat(21_000) } } })).status).toBe(413)
  })

  it('keeps visitors apart: each only ever sees their own account', async () => {
    const a = await signIn('a@example.test', 'Alpha')
    const b = await signIn('b@example.test', 'Beta')
    await call('/api/me', { token: a, method: 'PUT', body: { progress: { xp: 999 } } })
    const mine = (await call('/api/me', { token: b })).json.user
    expect([mine.email, mine.progress.xp ?? 0]).toEqual(['b@example.test', 0])
  })

  it('cannot use any owner endpoint', async () => {
    const token = await signIn('vee@example.test')
    for (const [method, path] of [['PUT', '/api/owner/content'], ['GET', '/api/owner/messages'], ['GET', '/api/owner/friends'], ['POST', '/api/owner/media'], ['POST', '/api/owner/totp/setup'], ['POST', '/api/owner/totp/verify']]) {
      expect((await call(path, { token, method, body: {} })).status, `${method} ${path}`).toBe(403)
    }
  })

  it('links a message to the sender when signed in, and lets them delete their account', async () => {
    const token = await signIn('vee@example.test')
    await call('/api/messages', { token, body: { name: 'Vee', email: 'vee@example.test', body: 'hi' } })
    expect((await db.first<{ user_id: string | null }>('SELECT user_id FROM messages'))!.user_id).not.toBeNull()
    expect((await call('/api/me', { token, method: 'DELETE' })).status).toBe(204)
    expect((await call('/api/me', { token })).status).toBe(401)
    expect((await db.first<{ user_id: string | null }>('SELECT user_id FROM messages'))!.user_id).toBeNull() // message kept, unlinked
  })
})

describe('owner: allow-listed email AND second factor', () => {
  it('an allow-listed email alone grants nothing', async () => {
    const token = await signIn(OWNER)
    const me = (await call('/api/me', { token })).json
    expect([me.ownerEmail, me.owner]).toEqual([true, false])
    for (const [method, path] of [['PUT', '/api/owner/content'], ['GET', '/api/owner/messages'], ['GET', '/api/owner/friends'], ['POST', '/api/owner/media']]) {
      const r = await call(path, { token, method, body: { data: { profile: {}, sections: [] } } })
      expect([r.status, r.json.error], `${method} ${path}`).toEqual([403, 'mfa_required'])
    }
  })

  it('defence in depth: a session marked as 2FA-verified is still refused if its email is not the owner', async () => {
    const token = await signIn('vee@example.test')
    await db.run('UPDATE sessions SET mfa = 1') // simulate a bug elsewhere that wrongly flags the session
    expect((await call('/api/owner/messages', { token })).status).toBe(403)
    expect((await call('/api/owner/content', { token, method: 'PUT', body: { data: { profile: {}, sections: [] } } })).status).toBe(403)
    expect((await call('/api/me', { token })).json.owner).toBe(false)
  })

  it('a second factor without the allow-listed email grants nothing', async () => {
    const token = await signIn('vee@example.test')
    expect((await call('/api/owner/totp/setup', { token, body: {} })).status).toBe(403)
    expect((await call('/api/owner/content', { token, method: 'PUT', body: { data: { profile: {}, sections: [] } } })).status).toBe(403)
  })

  it('enrols an authenticator that an independent TOTP library can generate codes for', async () => {
    const token = await signIn(OWNER)
    const setup = await call('/api/owner/totp/setup', { token, body: {} })
    expect(setup.json.uri).toMatch(/^otpauth:\/\/totp\/.+secret=[A-Z2-7]+/)
    const wrong = await call('/api/owner/totp/verify', { token, body: { code: '000000' } })
    expect(wrong.status).toBe(401)
    const ok = await call('/api/owner/totp/verify', { token, body: { code: totpFor(setup.json.secret) } })
    expect(ok.status).toBe(200)
    expect((await call('/api/me', { token })).json.owner).toBe(true)
  })

  it('stores the authenticator secret encrypted, never in plaintext', async () => {
    const { secret } = await ownerSession()
    const row = await db.first<{ secret_enc: string }>('SELECT secret_enc FROM owner_totp')
    expect(row!.secret_enc).not.toContain(secret)
  })

  it('a new sign-in starts without the second factor and must pass it again', async () => {
    const { secret } = await ownerSession()
    const fresh = await signIn(OWNER)
    expect((await call('/api/owner/content', { token: fresh, method: 'PUT', body: { data: { profile: {}, sections: [] } } })).json.error).toBe('mfa_required')
    // the same step cannot be reused; a code from the next step works
    const now = Date.now()
    const replay = await call('/api/owner/totp/verify', { token: fresh, body: { code: totpFor(secret, now) } })
    expect(replay.status).toBe(401)
    const next = await call('/api/owner/totp/verify', { token: fresh, body: { code: totpFor(secret, now + 30_000) } })
    expect(next.status).toBe(200)
  })

  it('an enrolled authenticator can not be replaced from any session', async () => {
    const { token } = await ownerSession()
    expect((await call('/api/owner/totp/setup', { token, body: {} })).status).toBe(409)
    const fresh = await signIn(OWNER)
    expect((await call('/api/owner/totp/setup', { token: fresh, body: {} })).status).toBe(409)
  })

  it('locks out guessing: at most 5 attempts in 5 minutes of any kind, then even the right code is refused', async () => {
    const { secret } = await ownerSession() // this already used 1 of the 5 attempts
    const fresh = await signIn(OWNER)
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) statuses.push((await call('/api/owner/totp/verify', { token: fresh, body: { code: '000000' } })).status)
    expect(statuses).toEqual([401, 401, 401, 401, 429, 429])
    expect((await call('/api/owner/totp/verify', { token: fresh, body: { code: totpFor(secret, Date.now() + 30_000) } })).status).toBe(429)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 6 * 60_000) // the window passes
    expect((await call('/api/owner/totp/verify', { token: fresh, body: { code: totpFor(secret, Date.now() + 30_000) } })).status).toBe(200)
  })

  it('publishes content that anonymous visitors immediately read', async () => {
    const { token } = await ownerSession()
    const data = { profile: { name: 'Lim' }, sections: [] }
    expect((await call('/api/owner/content', { token, method: 'PUT', body: { data } })).status).toBe(200)
    expect((await call('/api/content')).json.data).toEqual(data)
  })

  it('validates and size-limits content', async () => {
    const { token } = await ownerSession()
    expect((await call('/api/owner/content', { token, method: 'PUT', body: { data: { hacked: true } } })).status).toBe(400)
    expect((await call('/api/owner/content', { token, method: 'PUT', body: { nope: 1 } })).status).toBe(400)
    expect((await call('/api/owner/content', { token, method: 'PUT', raw: JSON.stringify({ data: { profile: {}, sections: [], pad: 'x'.repeat(1_600_000) } }) })).status).toBe(413)
  })

  it('reads, marks, and deletes messages, and lists friends', async () => {
    await call('/api/messages', { body: { name: 'Sam', email: 'sam@example.test', whatsapp: '+60123456789', body: 'Job offer' } })
    await signIn('friend@example.test', 'Friendly')
    const { token } = await ownerSession()
    const list = (await call('/api/owner/messages', { token })).json.messages
    expect(list).toHaveLength(1)
    expect([list[0].whatsapp, list[0].read_at]).toEqual(['+60123456789', null])
    expect((await call(`/api/owner/messages/${list[0].id}`, { token, method: 'PATCH', body: { read: true } })).status).toBe(200)
    expect((await call('/api/owner/messages', { token })).json.messages[0].read_at).not.toBeNull()
    const friends = (await call('/api/owner/friends', { token })).json.friends
    expect(friends.map((f: { displayName: string }) => f.displayName)).toContain('Friendly')
    expect((await call(`/api/owner/messages/${list[0].id}`, { token, method: 'DELETE' })).status).toBe(204)
    expect((await call(`/api/owner/messages/${list[0].id}`, { token, method: 'DELETE' })).status).toBe(404)
  })
})

describe('media uploads', () => {
  const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
  it('stores real images and serves them safely and cacheably', async () => {
    const { token } = await ownerSession()
    const up = await call('/api/owner/media', { token, raw: PNG })
    expect(up.status).toBe(201)
    const get = await app.request(up.json.url, {}, env)
    expect(get.status).toBe(200)
    expect(get.headers.get('content-type')).toBe('image/png')
    expect(get.headers.get('cache-control')).toContain('immutable')
    expect(get.headers.get('content-security-policy')).toContain('sandbox')
    expect(get.headers.get('x-content-type-options')).toBe('nosniff')
    expect([...new Uint8Array(await get.arrayBuffer())]).toEqual([...PNG])
  })

  it('refuses HTML or scripts disguised as images, whatever the header says', async () => {
    const { token } = await ownerSession()
    const r = await app.request('/api/owner/media', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'image/png' }, body: '<html><script>alert(1)</script>' }, env)
    expect(r.status).toBe(415)
  })

  it('enforces the size cap and owner-only access', async () => {
    const { token } = await ownerSession()
    expect((await call('/api/owner/media', { token, raw: new Uint8Array(700_001).fill(1) })).status).toBe(413)
    const visitor = await signIn('vee@example.test')
    expect((await call('/api/owner/media', { token: visitor, raw: PNG })).status).toBe(403)
  })
})

describe('cross-origin access', () => {
  it('allows the configured origin and answers its preflight', async () => {
    const pre = await app.request('/api/me', { method: 'OPTIONS', headers: { origin: ORIGIN, 'access-control-request-method': 'GET' } }, env)
    expect(pre.status).toBe(204)
    expect(pre.headers.get('access-control-allow-origin')).toBe(ORIGIN)
    expect((await app.request('/api/content', { headers: { origin: ORIGIN } }, env)).headers.get('access-control-allow-origin')).toBe(ORIGIN)
  })

  it('gives other origins no CORS grant, so their pages cannot read responses', async () => {
    const r = await app.request('/api/content', { headers: { origin: 'https://evil.example' } }, env)
    expect(r.headers.get('access-control-allow-origin')).toBeNull()
    const pre = await app.request('/api/me', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }, env)
    expect(pre.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('sends security headers and does not cache authenticated responses', async () => {
    const token = await signIn('vee@example.test')
    const r = await call('/api/me', { token })
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(r.headers.get('cache-control')).toBe('no-store')
  })
})
