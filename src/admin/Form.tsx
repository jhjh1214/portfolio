import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Plus, Trash2, Upload } from 'lucide-react'
import type { Field, Schema } from './fields'
import { fileToDataUrl } from '../lib/images'
import { uid } from '../lib/utils'

type Obj = Record<string, unknown>
const inputCls = 'w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-accent'

function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [err, setErr] = useState('')
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className={inputCls} value={value.startsWith('data:') ? '(uploaded image)' : value} readOnly={value.startsWith('data:')} placeholder="https://… or upload" onChange={(e) => onChange(e.target.value)} />
        <label className="btn btn-ghost cursor-pointer whitespace-nowrap">
          <Upload size={14} /> Upload
          <input type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try { setErr(''); onChange(await fileToDataUrl(f)) } catch (x) { setErr((x as Error).message) }
            e.target.value = ''
          }} />
        </label>
        {value && <button className="btn btn-ghost" onClick={() => onChange('')} aria-label="Clear image"><Trash2 size={14} /></button>}
      </div>
      {value && <img src={value} alt="" className="h-24 rounded-md border border-white/10 object-cover" />}
      {value.startsWith('data:') && <p className="text-[11px] text-muted">Stored inside content.json (~{Math.round(value.length / 1024)} KB). Fine for a few photos; use URLs for many.</p>}
      {err && <p className="text-[11px] text-red-400">{err}</p>}
    </div>
  )
}

function FieldInput({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: unknown) => void }) {
  switch (f.type) {
    case 'textarea': return <textarea className={inputCls} rows={4} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
    case 'number': return <input type="number" className={inputCls} value={(value as number) ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
    case 'bool': return (
      <button type="button" role="switch" aria-checked={!!value} onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    )
    case 'color': return (
      <div className="flex gap-2">
        <input type="color" value={(value as string) || '#000000'} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent" />
        <input className={inputCls} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
    case 'select': return (
      <select className={inputCls} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
    case 'tags': return <input className={inputCls} value={((value as string[]) ?? []).join(', ')} placeholder="comma, separated" onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
    case 'lines': return <textarea className={inputCls} rows={4} value={((value as string[]) ?? []).join('\n')} onChange={(e) => onChange(e.target.value.split('\n'))} onBlur={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} />
    case 'image': return <ImageInput value={(value as string) ?? ''} onChange={onChange} />
    case 'list': return <ListEditor schema={f.item} items={(value as Obj[]) ?? []} onChange={onChange} itemLabel={f.itemLabel as (x: Obj) => string} blank={f.blank as () => Obj} />
    default: return <input type={f.type === 'url' ? 'url' : 'text'} className={inputCls} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
  }
}

export function ObjectForm({ schema, value, onChange }: { schema: Schema; value: Obj; onChange: (v: Obj) => void }) {
  return (
    <div className="grid gap-4">
      {schema.map((f) => (
        <label key={f.key} className="block text-xs">
          <span className="mb-1 flex items-baseline gap-2 font-bold uppercase tracking-widest text-muted">{f.label}{f.help && <span className="font-normal normal-case tracking-normal text-muted/60">{f.help}</span>}</span>
          <FieldInput f={f} value={value[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} />
        </label>
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
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-white/[.02]">
          <div className="flex items-center gap-1 px-2 py-1.5">
            <button className="flex flex-1 items-center gap-2 px-1 py-1 text-left text-sm" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              {open === i ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="font-bold">{itemLabel(it)}</span>
              {subtitle && <span className="text-[11px] text-muted">{subtitle(it)}</span>}
            </button>
            <button className="p-1.5 text-muted hover:text-accent" onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={14} /></button>
            <button className="p-1.5 text-muted hover:text-accent" onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={14} /></button>
            {!fixed && <button className="p-1.5 text-muted hover:text-accent" onClick={() => { const n = [...items]; n.splice(i + 1, 0, structuredClone(it)); if ('id' in it) (n[i + 1] as Obj).id = uid(String(it.id).split('-')[0]); onChange(n) }} aria-label="Duplicate"><Copy size={14} /></button>}
            {!fixed && <button className="p-1.5 text-muted hover:text-red-400" onClick={() => { if (confirm(`Delete "${itemLabel(it)}"?`)) { onChange(items.filter((_, k) => k !== i)); setOpen(null) } }} aria-label="Delete"><Trash2 size={14} /></button>}
          </div>
          {open === i && (
            <div className="border-t border-white/10 p-4">
              <ObjectForm schema={schema} value={it} onChange={(v) => onChange(items.map((x, k) => (k === i ? v : x)))} />
            </div>
          )}
        </div>
      ))}
      {!fixed && (
        <button className="btn btn-ghost w-full justify-center" onClick={() => { onChange([...items, blank()]); setOpen(items.length) }}>
          <Plus size={14} /> Add
        </button>
      )}
    </div>
  )
}
