import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ExternalLink, Eye, EyeOff, RotateCcw, Rocket, Upload } from 'lucide-react'
import { useC, useContent, published } from '../store/content'
import { useProgress } from '../store/progress'
import type { Content } from '../types'
import { ListEditor, ObjectForm } from './Form'
import * as S from './fields'
import { publishContent } from '../lib/publish'
import { PRESETS } from '../lib/themes'
import { uid } from '../lib/utils'

type Obj = Record<string, unknown>
const TABS = ['Profile', 'Theme', 'Sections', 'Projects', 'Journey', 'Achievements', 'Open source', 'Skills', 'Albums', 'Easter eggs', 'Site', 'Publish'] as const
type Tab = (typeof TABS)[number]

function Publish({ c }: { c: Content }) {
  const dirty = useContent((s) => s.draft !== null)
  const { replace, discard } = useContent()
  const [token, setToken] = useState(() => { try { return localStorage.getItem('pf.token') ?? '' } catch { return '' } })
  const [remember, setRemember] = useState(() => { try { return !!localStorage.getItem('pf.token') } catch { return false } })
  const [msg, setMsg] = useState('content: update portfolio via CMS')
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'err'; text?: string }>({ kind: 'idle' })
  const json = useMemo(() => JSON.stringify(c, null, 2) + '\n', [c])

  const publish = async () => {
    setState({ kind: 'busy' })
    try {
      try { remember ? localStorage.setItem('pf.token', token) : localStorage.removeItem('pf.token') } catch { /* ignore */ }
      const url = await publishContent({ token, repo: c.site.publishRepo, branch: c.site.publishBranch, path: c.site.publishPath, json, message: msg })
      setState({ kind: 'ok', text: url })
    } catch (e) { setState({ kind: 'err', text: (e as Error).message }) }
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
    <div className="max-w-xl space-y-6">
      <div className="panel p-4 text-sm">
        <b>{dirty ? 'You have unpublished local changes.' : 'No local changes. Showing what is published.'}</b>
        <p className="mt-1 text-xs text-muted">Edits are saved in this browser only. Publishing commits <code>{c.site.publishPath}</code> to <code>{c.site.publishRepo}</code>, and the Pages workflow redeploys in about a minute.</p>
      </div>
      <label className="block text-xs">
        <span className="mb-1 block font-bold uppercase tracking-widest text-muted">GitHub token (fine-grained, Contents: read & write on this repo)</span>
        <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-accent" />
      </label>
      <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember on this device (stored unencrypted in localStorage)</label>
      <label className="block text-xs">
        <span className="mb-1 block font-bold uppercase tracking-widest text-muted">Commit message</span>
        <input value={msg} onChange={(e) => setMsg(e.target.value)} className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-accent" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={!token || state.kind === 'busy'} onClick={publish}><Rocket size={14} /> {state.kind === 'busy' ? 'Publishing…' : 'Publish to GitHub'}</button>
        <button className="btn btn-ghost" onClick={download}><Download size={14} /> Download JSON</button>
        <label className="btn btn-ghost cursor-pointer"><Upload size={14} /> Import JSON<input type="file" accept="application/json" hidden onChange={(e) => void upload(e.target.files?.[0])} /></label>
        <button className="btn btn-ghost" disabled={!dirty} onClick={() => confirm('Discard all local edits and go back to the published content?') && discard()}><RotateCcw size={14} /> Discard draft</button>
      </div>
      {state.kind === 'ok' && <p className="text-sm text-green-400">Committed. <a className="underline" href={state.text} target="_blank" rel="noreferrer">View commit</a> — the site redeploys shortly.</p>}
      {state.kind === 'err' && <p className="text-sm text-red-400">{state.text}</p>}
    </div>
  )
}

export default function AdminApp() {
  const c = useC()
  const dirty = useContent((s) => s.draft !== null)
  const update = useContent((s) => s.update)
  const unlock = useProgress((s) => s.unlock)
  const [tab, setTab] = useState<Tab>('Profile')
  const [preview, setPreview] = useState(true)
  useEffect(() => { unlock('boss') }, [unlock])

  const set = <K extends keyof Content>(k: K, v: unknown) => update((d) => { (d as unknown as Obj)[k] = v })
  const previewSrc = `${location.pathname}?preview=1#/`

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 bg-bg/80 px-4 py-2 backdrop-blur">
        <Link to="/" className="font-display text-lg font-bold"><span className="text-grad">LJ</span> <span className="text-muted">/ backstage</span></Link>
        {dirty && <span className="chip text-amber-400">Unpublished changes</span>}
        <div className="ml-auto flex gap-2">
          <button className="btn btn-ghost hidden lg:inline-flex" onClick={() => setPreview((p) => !p)}>{preview ? <EyeOff size={14} /> : <Eye size={14} />} Preview</button>
          <Link to="/" className="btn btn-ghost"><ExternalLink size={14} /> View site</Link>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav className="w-40 shrink-0 overflow-y-auto border-r border-white/10 p-2 sm:w-48" aria-label="CMS sections">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`mb-1 block w-full rounded-md px-3 py-2 text-left text-xs font-bold uppercase tracking-widest ${tab === t ? 'bg-primary/25 text-accent' : 'text-muted hover:text-ink'}`}>{t}</button>
          ))}
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto p-5">
          <h1 className="font-display mb-5 text-2xl font-bold">{tab}</h1>
          {tab === 'Profile' && <ObjectForm schema={S.profileSchema} value={c.profile as unknown as Obj} onChange={(v) => set('profile', v)} />}
          {tab === 'Theme' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-ghost" onClick={() => set('theme', { ...c.theme, ...published.theme })}>Original</button>
                {Object.entries(PRESETS).map(([n, p]) => <button key={n} className="btn btn-ghost" onClick={() => set('theme', { ...c.theme, ...p })}>{n}</button>)}
              </div>
              <ObjectForm schema={S.themeSchema} value={c.theme as unknown as Obj} onChange={(v) => set('theme', v)} />
            </div>
          )}
          {tab === 'Sections' && <><p className="mb-4 text-xs text-muted">Reorder or hide sections. Order here is the order on the page.</p><ListEditor fixed schema={S.sectionSchema} items={c.sections as unknown as Obj[]} onChange={(v) => set('sections', v)} itemLabel={(x) => String(x.title)} subtitle={(x) => (x.visible ? '' : 'hidden')} blank={() => ({})} /></>}
          {tab === 'Projects' && <ListEditor schema={S.projectSchema} items={c.projects as unknown as Obj[]} onChange={(v) => set('projects', v)} itemLabel={(x) => String(x.title)} subtitle={(x) => String(x.status)} blank={() => ({ id: uid('project'), title: 'New project', tagline: '', description: '', status: 'wip', year: String(new Date().getFullYear()), tags: [], stack: [], repo: '', url: '', colorA: '#8b5cf6', colorB: '#312e81', emoji: '🚀', featured: false, highlights: [] })} />}
          {tab === 'Journey' && <ListEditor schema={S.journeySchema} items={c.journey as unknown as Obj[]} onChange={(v) => set('journey', v)} itemLabel={(x) => `${x.date} · ${x.title}`} blank={() => ({ id: uid('j'), date: String(new Date().getFullYear()), title: 'New milestone', detail: '', kind: 'milestone', icon: '⭐' })} />}
          {tab === 'Achievements' && <ListEditor schema={S.achievementSchema} items={c.achievements as unknown as Obj[]} onChange={(v) => set('achievements', v)} itemLabel={(x) => String(x.title)} subtitle={(x) => String(x.rarity)} blank={() => ({ id: uid('ach'), title: 'New achievement', description: '', icon: '🏆', rarity: 'rare', date: String(new Date().getFullYear()), issuer: '', featured: false })} />}
          {tab === 'Open source' && <ListEditor schema={S.ossSchema} items={c.openSource as unknown as Obj[]} onChange={(v) => set('openSource', v)} itemLabel={(x) => String(x.name)} subtitle={(x) => String(x.status)} blank={() => ({ id: uid('os'), name: 'Project', repo: 'owner/repo', status: 'MERGED', description: '', url: 'https://github.com/' })} />}
          {tab === 'Skills' && <ListEditor schema={S.skillGroupSchema} items={c.skills as unknown as Obj[]} onChange={(v) => set('skills', v)} itemLabel={(x) => String(x.title)} blank={() => ({ id: uid('grp'), title: 'New group', skills: [] })} />}
          {tab === 'Albums' && <ListEditor schema={S.albumSchema} items={c.albums as unknown as Obj[]} onChange={(v) => set('albums', v)} itemLabel={(x) => String(x.title)} subtitle={(x) => `${(x.photos as unknown[]).length} photos`} blank={() => ({ id: uid('album'), title: 'New album', date: String(new Date().getFullYear()), location: '', description: '', emoji: '📸', photos: [] })} />}
          {tab === 'Easter eggs' && <><p className="mb-4 text-xs text-muted">Edit the text, rarity and XP of hidden achievements. The triggers themselves live in code, so IDs are fixed and eggs can't be added or removed here.</p><ListEditor fixed schema={S.eggSchema} items={c.eggs as unknown as Obj[]} onChange={(v) => set('eggs', v)} itemLabel={(x) => `${x.icon} ${x.title}`} subtitle={(x) => String(x.rarity)} blank={() => ({})} /></>}
          {tab === 'Site' && <ObjectForm schema={S.siteSchema} value={c.site as unknown as Obj} onChange={(v) => set('site', v)} />}
          {tab === 'Publish' && <Publish c={c} />}
        </main>
        {preview && (
          <aside className="hidden w-[38%] max-w-xl shrink-0 border-l border-white/10 lg:block">
            <iframe title="Live preview" src={previewSrc} className="h-full w-full bg-bg" />
          </aside>
        )}
      </div>
    </div>
  )
}
