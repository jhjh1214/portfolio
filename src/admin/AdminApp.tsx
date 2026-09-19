import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { OTPInput, type SlotProps } from 'input-otp'
import { Download, ExternalLink, Eye, EyeOff, Inbox as InboxIcon, Lock, Mail, MessageCircle, RotateCcw, Rocket, ShieldCheck, Trash2, Upload, Users } from 'lucide-react'
import { useC, useContent } from '../store/content'
import { useProgress } from '../store/progress'
import { useAuth } from '../store/auth'
import { useUI } from '../store/ui'
import type { Content } from '../types'
import { ListEditor, ObjectForm } from './Form'
import * as S from './fields'
import QRCode from 'qrcode'
import { api, backendOn, friendlyError } from '../lib/api'
import { useInbox, type Message } from '../lib/messages'
import { levelFromXp } from '../lib/level'
import { uid, cx } from '../lib/utils'
import { play } from '../lib/sound'

type Obj = Record<string, unknown>
const TABS = ['Inbox', 'Friends', 'Profile', 'Theme', 'Sections', 'Projects', 'Journey', 'Achievements', 'Open source', 'Skills', 'Albums', 'Easter eggs', 'Site', 'Publish'] as const
type Tab = (typeof TABS)[number]

function Slot({ char, isActive }: SlotProps) {
  return <div className={cx('grid h-14 w-11 place-items-center rounded-xl border-[1.5px] bg-surface font-display text-2xl font-bold', isActive ? 'border-primary' : 'border-line')}>{char}</div>
}

/** Second factor. Owner writes and inbox reads are refused by the API until this is passed. */
function MfaStep() {
  const refresh = useAuth((s) => s.refresh)
  const enrolled = useAuth((s) => s.totpEnrolled)
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null)
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (enrolled) return
    void (async () => {
      const r = await api<{ secret: string; uri: string }>('/api/owner/totp/setup', { method: 'POST', body: {} })
      if (!r.data) { setErr(r.status === 409 ? 'Two-step verification is already set up. Reload this page and enter your code.' : friendlyError(r.error)); return }
      setSetup({ secret: r.data.secret, qr: await QRCode.toDataURL(r.data.uri, { margin: 1, width: 240 }) })
    })()
  }, [enrolled])

  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return
    setBusy(true); setErr('')
    const r = await api('/api/owner/totp/verify', { method: 'POST', body: { code: value } })
    setBusy(false)
    if (!r.ok) { setErr(r.error === 'rate_limited' ? 'Too many attempts. Wait five minutes and try again.' : 'That code is not right. Codes change every 30 seconds.'); setCode(''); play('error'); return }
    play('win'); await refresh()
  }

  return (
    <div className="card mx-auto mt-10 max-w-md p-7">
      <span className="grid h-12 w-12 place-items-center rounded-xl border-[1.5px] border-ink bg-primary text-on-primary"><ShieldCheck size={24} /></span>
      <h1 className="mt-4 text-3xl font-extrabold">{enrolled ? 'Enter your authenticator code' : 'Set up two-step verification'}</h1>
      {!enrolled && setup && (
        <div className="mt-3">
          <p className="text-muted">Scan this with an authenticator app (1Password, Authy, Google Authenticator), then enter the 6-digit code it shows. You only do this once.</p>
          <img src={setup.qr} alt="Authenticator QR code" className="mx-auto mt-4 h-44 w-44 rounded-xl border-[1.5px] border-line bg-white p-2" />
          <p className="mt-3 break-all text-center text-xs text-muted">Or enter this key manually: <code className="font-mono">{setup.secret}</code></p>
        </div>
      )}
      {enrolled && <p className="mt-2 text-muted">Open your authenticator app and enter the current 6-digit code.</p>}
      <div className="mt-5 flex justify-center">
        <OTPInput maxLength={6} value={code} onChange={setCode} onComplete={verify} inputMode="numeric" autoComplete="one-time-code" containerClassName="flex gap-2" aria-label="Authenticator code" render={({ slots }) => <>{slots.map((sl, k) => <Slot key={k} {...sl} />)}</>} />
      </div>
      {err && <p role="alert" className="mt-3 text-center text-sm font-medium text-accent">{err}</p>}
    </div>
  )
}

/** Everything a visitor must clear before the CMS renders. Real enforcement is in the database. */
function Gate() {
  const { session, ownerEmail, owner, ready } = useAuth()
  const signOut = useAuth((s) => s.signOut)
  const setAuth = useUI((s) => s.setAuth)
  if (!ready) return <p className="p-10 text-center text-muted">Checking your session...</p>
  if (!session) return (
    <div className="card mx-auto mt-10 max-w-md p-7">
      <span className="grid h-12 w-12 place-items-center rounded-xl border-[1.5px] border-ink bg-raised"><Lock size={24} /></span>
      <h1 className="mt-4 text-3xl font-extrabold">Backstage</h1>
      <p className="mt-2 text-muted">This area is for the site owner. Sign in with your email to continue.</p>
      <button className="btn mt-5" onClick={() => setAuth(true)}>Sign in</button>
    </div>
  )
  if (!ownerEmail) return (
    <div className="card mx-auto mt-10 max-w-md p-7">
      <h1 className="text-3xl font-extrabold">Owner access only</h1>
      <p className="mt-2 text-muted">You're signed in as {session.user.email}, but this account can't edit the site. If that's a mistake, sign in with the owner email.</p>
      <div className="mt-5 flex gap-3"><Link to="/" className="btn btn-soft">Back to the profile</Link><button className="btn btn-ghost" onClick={() => void signOut()}>Sign out</button></div>
    </div>
  )
  if (!owner) return <MfaStep />
  return null
}

const when = (t: number | string) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function Inbox() {
  const { items, loading, load, markRead, remove } = useInbox()
  const [sel, setSel] = useState<string | null>(null)
  useEffect(() => { void load() }, [load])
  const cur: Message | undefined = items.find((i) => i.id === sel) ?? items[0]
  if (!items.length) return <p className="card p-8 text-center text-muted">{loading ? 'Loading messages...' : 'No messages yet. When someone writes from the contact form, it shows up here and you get a notification.'}</p>
  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <ul className="card max-h-[70vh] divide-y-[1.5px] divide-line overflow-y-auto">
        {items.map((m) => (
          <li key={m.id}>
            <button onClick={() => { setSel(m.id); if (!m.read_at) void markRead(m.id) }} className={cx('block w-full px-4 py-3 text-left', cur?.id === m.id && 'bg-raised')}>
              <div className="flex items-center gap-2">{!m.read_at && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />}<span className={cx('truncate', !m.read_at && 'font-bold')}>{m.name}</span><span className="ml-auto shrink-0 text-xs text-muted">{new Date(m.created_at).toLocaleDateString()}</span></div>
              <div className="mt-0.5 line-clamp-1 text-sm text-muted">{m.body}</div>
            </button>
          </li>
        ))}
      </ul>
      {cur && (
        <article className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-2xl font-bold">{cur.name}</h2><p className="text-sm text-muted">{when(cur.created_at)}</p></div>
            <div className="flex gap-2">
              <button className="btn btn-soft btn-sm" onClick={() => void markRead(cur.id, !cur.read_at)}>{cur.read_at ? 'Mark unread' : 'Mark read'}</button>
              <button className="btn btn-soft btn-sm" onClick={() => confirm('Delete this message?') && void remove(cur.id)} aria-label="Delete message"><Trash2 size={15} /></button>
            </div>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed">{cur.body}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="btn" href={`mailto:${cur.email}?subject=${encodeURIComponent('Re: your message')}`}><Mail size={18} aria-hidden /> Reply by email</a>
            {cur.whatsapp && <a className="btn btn-soft" href={`https://wa.me/${cur.whatsapp.replace('+', '')}`} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden /> WhatsApp {cur.whatsapp}</a>}
          </div>
          <p className="mt-4 text-sm text-muted">{cur.email}</p>
        </article>
      )}
    </div>
  )
}

interface Friend { id: string; displayName: string; createdAt: number; progress: { xp?: number; eggs?: Record<string, number> } | null }
function Friends() {
  const [rows, setRows] = useState<Friend[] | null>(null)
  useEffect(() => { void api<{ friends: Friend[] }>('/api/owner/friends').then((r) => setRows(r.data?.friends ?? [])) }, [])
  if (!rows) return <p className="text-muted">Loading friends...</p>
  if (!rows.length) return <p className="card p-8 text-center text-muted">No one has signed in yet.</p>
  return (
    <ul className="card divide-y-[1.5px] divide-line">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-4 px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-ink bg-primary font-display font-bold text-on-primary">{(r.displayName || '?')[0].toUpperCase()}</span>
          <div className="min-w-0 flex-1"><div className="truncate font-semibold">{r.displayName || 'Unnamed friend'}</div><div className="text-sm text-muted">Joined {new Date(r.createdAt).toLocaleDateString()}</div></div>
          <div className="text-right text-sm"><div className="font-semibold">Level {levelFromXp(r.progress?.xp ?? 0)}</div><div className="text-muted">{Object.keys(r.progress?.eggs ?? {}).length} achievements</div></div>
        </li>
      ))}
    </ul>
  )
}

function Publish({ c }: { c: Content }) {
  const dirty = useContent((s) => s.draft !== null)
  const { replace, discard, setRemote } = useContent()
  const owner = useAuth((s) => s.owner)
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'err'; text?: string }>({ kind: 'idle' })
  const json = useMemo(() => JSON.stringify(c, null, 2) + '\n', [c])

  const publish = async () => {
    setState({ kind: 'busy' })
    const r = await api('/api/owner/content', { method: 'PUT', body: { data: c } })
    if (!r.ok) { setState({ kind: 'err', text: r.error === 'mfa_required' || r.status === 401 ? 'Your session expired. Sign in again.' : r.error === 'too_large' ? 'The content is too large to publish. Remove some embedded images.' : 'Could not publish. Try again.' }); play('error'); return }
    setRemote(c); discard(); play('win')
    setState({ kind: 'ok', text: 'Published. Visitors see the new content on their next load.' })
  }
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    a.download = 'content.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const upload = async (f?: File) => {
    if (!f) return
    try { replace(JSON.parse(await f.text())) } catch { alert('That file is not valid JSON.') }
  }
  return (
    <div className="max-w-xl space-y-5">
      <div className="card p-4"><b>{dirty ? 'You have unpublished changes.' : 'No unpublished changes.'}</b><p className="mt-1 text-sm text-muted">{backendOn ? 'Publishing saves the content to the site database. It is live immediately, with no redeploy.' : 'No backend is connected, so changes stay in this browser. To ship them, download the JSON and replace src/content/content.json in the repository.'}</p></div>
      <div className="flex flex-wrap gap-3">
        {backendOn && <button className="btn" disabled={!owner || !dirty || state.kind === 'busy'} onClick={publish}><Rocket size={18} aria-hidden /> {state.kind === 'busy' ? 'Publishing' : 'Publish changes'}</button>}
        <button className="btn btn-soft" onClick={download}><Download size={18} aria-hidden /> Download JSON</button>
        <label className="btn btn-soft cursor-pointer"><Upload size={18} aria-hidden /> Import JSON<input type="file" accept="application/json" hidden onChange={(e) => void upload(e.target.files?.[0])} /></label>
        <button className="btn btn-ghost" disabled={!dirty} onClick={() => confirm('Discard all unpublished changes?') && discard()}><RotateCcw size={18} aria-hidden /> Discard changes</button>
      </div>
      {state.kind === 'ok' && <p role="status" className="font-semibold text-primary">{state.text}</p>}
      {state.kind === 'err' && <p role="alert" className="font-medium text-accent">{state.text}</p>}
    </div>
  )
}

export default function AdminApp() {
  const c = useC()
  const dirty = useContent((s) => s.draft !== null)
  const update = useContent((s) => s.update)
  const { owner } = useAuth()
  const signOut = useAuth((s) => s.signOut)
  const unread = useInbox((s) => s.items.filter((i) => !i.read_at).length)
  const unlock = useProgress((s) => s.unlock)
  const [tab, setTab] = useState<Tab>(backendOn ? 'Inbox' : 'Profile')
  const [preview, setPreview] = useState(false)
  useEffect(() => { unlock('boss') }, [unlock])

  const gate = backendOn ? <Gate /> : null
  const allowed = !backendOn || owner
  const set = <K extends keyof Content>(k: K, v: unknown) => update((d) => { (d as unknown as Obj)[k] = v })
  const tabs = backendOn ? TABS : TABS.filter((t) => t !== 'Inbox' && t !== 'Friends')

  if (!allowed) return <div className="min-h-svh px-4 py-6"><Link to="/" className="btn btn-soft btn-sm">Back to the profile</Link>{gate}</div>

  return (
    <div className="flex h-svh flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b-[1.5px] border-line bg-surface px-4 py-2.5">
        <Link to="/" className="font-display text-xl font-extrabold">LJ<span className="text-accent">.</span> <span className="font-semibold text-muted">backstage</span></Link>
        {!backendOn && <span className="chip">Local mode. Not connected to a backend.</span>}
        {dirty && <span className="chip" style={{ borderColor: 'var(--accent)' }}>Unpublished changes</span>}
        <div className="ml-auto flex gap-2">
          <button className="btn btn-soft btn-sm hidden lg:inline-flex" onClick={() => setPreview((p) => !p)}>{preview ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />} Preview</button>
          <Link to="/" className="btn btn-soft btn-sm"><ExternalLink size={16} aria-hidden /> View site</Link>
          {backendOn && <button className="btn btn-ghost btn-sm" onClick={() => void signOut()}>Sign out</button>}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b-[1.5px] border-line p-2 md:w-52 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r-[1.5px]" aria-label="CMS sections">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined} className={cx('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold', tab === t ? 'bg-ink text-bg' : 'text-muted hover:bg-raised hover:text-ink')}>
              {t === 'Inbox' && <InboxIcon size={16} aria-hidden />}{t === 'Friends' && <Users size={16} aria-hidden />}{t}
              {t === 'Inbox' && unread > 0 && <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{unread}</span>}
            </button>
          ))}
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <h1 className="mb-5 text-3xl font-extrabold">{tab}</h1>
          {tab === 'Inbox' && <Inbox />}
          {tab === 'Friends' && <Friends />}
          {tab === 'Profile' && <ObjectForm schema={S.profileSchema} value={c.profile as unknown as Obj} onChange={(v) => set('profile', v)} />}
          {tab === 'Theme' && <ObjectForm schema={S.themeSchema} value={c.theme as unknown as Obj} onChange={(v) => set('theme', v)} />}
          {tab === 'Sections' && <><p className="mb-4 text-muted">Reorder or hide sections. The order here is the order on the page.</p><ListEditor fixed schema={S.sectionSchema} items={c.sections as unknown as Obj[]} onChange={(v) => set('sections', v)} itemLabel={(x) => String(x.title)} subtitle={(x) => (x.visible ? '' : 'hidden')} blank={() => ({})} /></>}
          {tab === 'Projects' && <ListEditor schema={S.projectSchema} items={c.projects as unknown as Obj[]} onChange={(v) => set('projects', v)} itemLabel={(x) => String(x.title)} subtitle={(x) => String(x.status)} blank={() => ({ id: uid('project'), title: 'New project', tagline: '', description: '', status: 'wip', year: String(new Date().getFullYear()), tags: [], stack: [], repo: '', url: '', tone: 'teal', icon: 'rocket', featured: false, highlights: [] })} />}
          {tab === 'Journey' && <ListEditor schema={S.journeySchema} items={c.journey as unknown as Obj[]} onChange={(v) => set('journey', v)} itemLabel={(x) => `${x.date}: ${x.title}`} blank={() => ({ id: uid('j'), date: String(new Date().getFullYear()), title: 'New milestone', detail: '', kind: 'milestone', icon: 'star' })} />}
          {tab === 'Achievements' && <ListEditor schema={S.achievementSchema} items={c.achievements as unknown as Obj[]} onChange={(v) => set('achievements', v)} itemLabel={(x) => String(x.title)} subtitle={(x) => String(x.rarity)} blank={() => ({ id: uid('ach'), title: 'New achievement', description: '', icon: 'trophy', rarity: 'rare', date: String(new Date().getFullYear()), issuer: '', featured: false })} />}
          {tab === 'Open source' && <ListEditor schema={S.ossSchema} items={c.openSource as unknown as Obj[]} onChange={(v) => set('openSource', v)} itemLabel={(x) => String(x.name)} subtitle={(x) => String(x.status)} blank={() => ({ id: uid('os'), name: 'Project', repo: 'owner/repo', status: 'Merged', description: '', url: 'https://github.com/' })} />}
          {tab === 'Skills' && <ListEditor schema={S.skillGroupSchema} items={c.skills as unknown as Obj[]} onChange={(v) => set('skills', v)} itemLabel={(x) => String(x.title)} blank={() => ({ id: uid('grp'), title: 'New group', skills: [] })} />}
          {tab === 'Albums' && <ListEditor schema={S.albumSchema} items={c.albums as unknown as Obj[]} onChange={(v) => set('albums', v)} itemLabel={(x) => String(x.title)} subtitle={(x) => `${(x.photos as unknown[]).length} photos`} blank={() => ({ id: uid('album'), title: 'New album', date: String(new Date().getFullYear()), location: '', description: '', icon: 'camera', photos: [] })} />}
          {tab === 'Easter eggs' && <><p className="mb-4 text-muted">Edit the wording, rarity and XP of hidden achievements. The triggers live in code, so they can't be added or removed here.</p><ListEditor fixed schema={S.eggSchema} items={c.eggs as unknown as Obj[]} onChange={(v) => set('eggs', v)} itemLabel={(x) => String(x.title)} subtitle={(x) => String(x.rarity)} blank={() => ({})} /></>}
          {tab === 'Site' && <ObjectForm schema={S.siteSchema} value={c.site as unknown as Obj} onChange={(v) => set('site', v)} />}
          {tab === 'Publish' && <Publish c={c} />}
        </main>
        {preview && (
          <aside className="hidden w-[38%] max-w-xl shrink-0 border-l-[1.5px] border-line lg:block">
            <iframe title="Live preview" src={`${location.pathname}?preview=1#/`} className="h-full w-full bg-bg" />
          </aside>
        )}
      </div>
    </div>
  )
}

