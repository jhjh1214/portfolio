import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Plus, Trash2, Upload } from 'lucide-react'
import type { Field, Schema } from './fields'
import { compressToBlob, fileToDataUrl } from '../lib/images'
import { ICON_KEYS, Icon } from '../lib/icons'
import { api, assetUrl, backendOn } from '../lib/api'
import { useAuth } from '../store/auth'
import { uid } from '../lib/utils'

type Obj = Record<string, unknown>

/** Upload to the site's own API when connected as owner; otherwise embed a compressed copy in the content. */
async function storeImage(file: File, owner: boolean): Promise<string> {
  if (backendOn && owner) {
    const r = await api<{ url: string }>('/api/owner/media', { raw: await compressToBlob(file) })
    if (!r.data) throw new Error(r.error === 'too_large' ? 'That photo is too large.' : 'Upload failed. Try again.')
    return r.data.url
  }
  return fileToDataUrl(file)
}

function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const owner = useAuth((s) => s.owner)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="field" value={value.startsWith('data:') ? '(embedded image)' : value} readOnly={value.startsWith('data:')} placeholder="https://... or upload" onChange={(e) => onChange(e.target.value)} />
        <label className="btn btn-soft btn-sm cursor-pointer whitespace-nowrap self-center">
          <Upload size={15} aria-hidden /> {busy ? 'Uploading' : 'Upload'}
          <input type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try { setErr(''); setBusy(true); onChange(await storeImage(f, owner)) } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
            e.target.value = ''
          }} />
        </label>
        {value && <button className="btn btn-ghost btn-icon !min-h-10 !w-10 self-center" onClick={() => onChange('')} aria-label="Clear image"><Trash2 size={16} /></button>}
      </div>
      {value && <img src={assetUrl(value)} alt="" className="h-24 rounded-lg border-[1.5px] border-line object-cover" />}
      {value.startsWith('data:') && <p className="text-xs text-muted">Embedded in the content (~{Math.round(value.length / 1024)} KB). Connect the backend and sign in as owner to upload to the site instead.</p>}
      {err && <p role="alert" className="text-sm font-medium text-accent">{err}</p>}
    </div>
  )
}

function FieldInput({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: unknown) => void }) {
  switch (f.type) {
    case 'textarea': return <textarea className="field" rows={4} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
    case 'number': return <input type="number" className="field" value={(value as number) ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
    case 'bool': return (
      <button type="button" role="switch" aria-checked={!!value} onClick={() => onChange(!value)} className={`relative h-7 w-12 rounded-full border-[1.5px] transition-colors ${value ? 'border-primary bg-primary' : 'border-line bg-raised'}`}>
        <span className={`absolute top-[3px] h-5 w-5 rounded-full transition-all ${value ? 'left-[23px] bg-on-primary' : 'left-[3px] bg-ink'}`} />
      </button>
    )
    case 'select': return <select className="field" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
    case 'icon': return (
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[1.5px] border-ink bg-raised"><Icon name={(value as string) ?? ''} size={22} /></span>
        <select className="field" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>{ICON_KEYS.map((o) => <option key={o} value={o}>{o}</option>)}</select>
      </div>
    )
    case 'tags': return <input className="field" value={((value as string[]) ?? []).join(', ')} placeholder="comma, separated" onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
    case 'lines': return <textarea className="field" rows={4} value={((value as string[]) ?? []).join('\n')} onChange={(e) => onChange(e.target.value.split('\n'))} onBlur={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} />
    case 'image': return <ImageInput value={(value as string) ?? ''} onChange={onChange} />
    case 'list': return <ListEditor schema={f.item} items={(value as Obj[]) ?? []} onChange={onChange} itemLabel={f.itemLabel as (x: Obj) => string} blank={f.blank as () => Obj} />
    default: return <input type={f.type === 'url' ? 'url' : 'text'} className="field" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
  }
}

export function ObjectForm({ schema, value, onChange }: { schema: Schema; value: Obj; onChange: (v: Obj) => void }) {
  return (
    <div className="grid gap-4">
      {schema.map((f) => (
        <div key={f.key}>
          <label className="block">
            <span className="label mb-1 flex flex-wrap items-baseline gap-2">{f.label}{f.help && <span className="text-xs font-normal">{f.help}</span>}</span>
            {f.type !== 'list' && f.type !== 'image' && f.type !== 'icon' && f.type !== 'bool' ? <FieldInput f={f} value={value[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} /> : null}
          </label>
          {(f.type === 'list' || f.type === 'image' || f.type === 'icon' || f.type === 'bool') && <FieldInput f={f} value={value[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} />}
        </div>
      ))}
    </div>
  )
}

export function ListEditor({ schema, items, onChange, itemLabel, blank, fixed, subtitle }: {
  schema: Schema; items: Obj[]; onChange: (v: Obj[]) => void; itemLabel: (x: Obj) => string; blank: () => Obj; fixed?: boolean; subtitle?: (x: Obj) => string
}) {
  const [open, setOpen] = useState<number | null>(null)
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const n = [...items]; [n[i], n[j]] = [n[j], n[i]]
    onChange(n); setOpen(open === i ? j : open === j ? i : open)
  }
  const btn = 'btn btn-ghost btn-icon !min-h-9 !w-9'
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="card-raised">
          <div className="flex items-center gap-1 px-2 py-1.5">
            <button className="flex flex-1 items-center gap-2 px-1 py-1.5 text-left" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              {open === i ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
              <span className="font-semibold">{itemLabel(it)}</span>
              {subtitle && <span className="text-sm text-muted">{subtitle(it)}</span>}
            </button>
            <button className={btn} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={15} /></button>
            <button className={btn} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={15} /></button>
            {!fixed && <button className={btn} onClick={() => { const n = [...items]; n.splice(i + 1, 0, structuredClone(it)); if ('id' in it) (n[i + 1] as Obj).id = uid(String(it.id).split('-')[0]); onChange(n) }} aria-label="Duplicate"><Copy size={15} /></button>}
            {!fixed && <button className={btn} onClick={() => { if (confirm(`Delete "${itemLabel(it)}"?`)) { onChange(items.filter((_, k) => k !== i)); setOpen(null) } }} aria-label="Delete"><Trash2 size={15} /></button>}
          </div>
          {open === i && <div className="border-t-[1.5px] border-line p-4"><ObjectForm schema={schema} value={it} onChange={(v) => onChange(items.map((x, k) => (k === i ? v : x)))} /></div>}
        </div>
      ))}
      {!fixed && <button className="btn btn-soft w-full" onClick={() => { onChange([...items, blank()]); setOpen(items.length) }}><Plus size={16} aria-hidden /> Add</button>}
    </div>
  )
}
