import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react'
import { useC } from '../store/content'
import { useLockScroll, HiddenBug } from '../components/ui'
import type { Photo } from '../types'
import { cx } from '../lib/utils'

const hue = (s: string) => [...s].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360

function Tile({ photo, emoji, i, onClick }: { photo: Photo; emoji: string; i: number; onClick: () => void }) {
  const h = hue(photo.caption + i)
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9, rotate: 0 }}
      whileInView={{ opacity: 1, scale: 1, rotate: (i % 2 ? 1 : -1) * (1 + (i % 3)) }}
      whileHover={{ rotate: 0, scale: 1.04, zIndex: 5 }}
      viewport={{ once: true }}
      onClick={onClick}
      className="mb-5 block w-full break-inside-avoid rounded-md bg-white p-2 pb-8 text-left shadow-xl"
      aria-label={photo.caption || 'Open photo'}
    >
      {photo.src ? (
        <img src={photo.src} alt={photo.caption} loading="lazy" className="w-full rounded-sm object-cover" />
      ) : (
        <div className="grid aspect-[4/3] place-items-center rounded-sm text-5xl" style={{ background: `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${(h + 60) % 360} 70% 25%))` }}>
          <span style={{ filter: 'drop-shadow(0 4px 8px rgb(0 0 0 / .4))' }}>{emoji}</span>
        </div>
      )}
      <div className="mt-2 truncate px-1 text-center text-[11px] font-bold text-slate-700">{photo.caption}</div>
    </motion.button>
  )
}

function Lightbox({ photos, emoji, start, onClose }: { photos: Photo[]; emoji: string; start: number; onClose: () => void }) {
  const [i, setI] = useState(start)
  useLockScroll(true)
  const go = (d: number) => setI((n) => (n + d + photos.length) % photos.length)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }) // eslint-disable-line react-hooks/exhaustive-deps
  const p = photos[i]
  return (
    <motion.div className="fixed inset-0 z-[88] grid place-items-center bg-black/90 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button className="absolute right-4 top-4 text-white/80 hover:text-white" onClick={onClose} aria-label="Close"><X /></button>
      <button className="absolute left-3 text-white/80 hover:text-white" onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="Previous"><ChevronLeft size={36} /></button>
      <button className="absolute right-3 text-white/80 hover:text-white" onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="Next"><ChevronRight size={36} /></button>
      <AnimatePresence mode="wait">
        <motion.figure key={i} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="max-w-3xl text-center" onClick={(e) => e.stopPropagation()}>
          {p.src ? <img src={p.src} alt={p.caption} className="max-h-[75vh] rounded-md" /> : <div className="grid h-[50vh] w-[min(80vw,720px)] place-items-center rounded-md text-8xl" style={{ background: `linear-gradient(135deg, hsl(${hue(p.caption + i)} 70% 45%), hsl(${(hue(p.caption + i) + 60) % 360} 70% 25%))` }}>{emoji}</div>}
          <figcaption className="mt-3 text-sm text-slate-200">{p.caption} <span className="text-slate-500">· {i + 1}/{photos.length}</span></figcaption>
        </motion.figure>
      </AnimatePresence>
    </motion.div>
  )
}

export function AlbumSection() {
  const c = useC()
  const [aid, setAid] = useState(c.albums[0]?.id)
  const [lb, setLb] = useState<number | null>(null)
  const album = c.albums.find((a) => a.id === aid) ?? c.albums[0]
  if (!album) return <p className="text-sm text-muted">No albums yet. Add some in the CMS.</p>
  const empty = album.photos.every((p) => !p.src)
  return (
    <div className="relative">
      <HiddenBug id="b5" className="-top-8 right-6" />
      <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
        {c.albums.map((a) => (
          <button key={a.id} onClick={() => setAid(a.id)} className={cx('panel panel-hover flex shrink-0 items-center gap-3 px-4 py-3 text-left', a.id === album.id && 'border-accent/70')}>
            <span className="text-2xl">{a.emoji}</span>
            <span>
              <span className="block text-sm font-bold">{a.title}</span>
              <span className="block text-[10px] uppercase tracking-widest text-muted">{a.photos.length} shots · {a.date}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1"><MapPin size={12} /> {album.location}</span>
        <span>{album.description}</span>
        {empty && <span className="chip text-amber-400">Placeholder shots · add photos in /admin</span>}
      </div>
      <div className="columns-2 gap-5 md:columns-3">
        {album.photos.map((p, i) => <Tile key={`${album.id}-${i}`} photo={p} emoji={album.emoji} i={i} onClick={() => setLb(i)} />)}
      </div>
      <AnimatePresence>{lb !== null && <Lightbox photos={album.photos} emoji={album.emoji} start={lb} onClose={() => setLb(null)} />}</AnimatePresence>
    </div>
  )
}
