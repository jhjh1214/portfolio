import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { useC } from '../store/content'
import { HiddenBug, Modal } from '../components/kit'
import { TilePattern } from '../components/TileWall'
import { Icon } from '../lib/icons'
import { cx } from '../lib/utils'
import { assetUrl } from '../lib/api'
import { play } from '../lib/sound'
import type { Photo } from '../types'

const TONES = ['var(--primary)', 'var(--accent)', 'var(--cobalt)', 'var(--sun)']

function Frame({ photo, icon, i, big }: { photo: Photo; icon: string; i: number; big?: boolean }) {
  if (photo.src) return <img src={assetUrl(photo.src)} alt={photo.caption} loading="lazy" className={cx('w-full object-cover', big ? 'max-h-[60vh] rounded-xl' : 'aspect-[4/3]')} />
  return (
    <div className={cx('relative grid place-items-center overflow-hidden text-white', big ? 'aspect-[4/3] rounded-xl' : 'aspect-[4/3]')}>
      <TilePattern tone={TONES[i % 4]} kind={i % 4} />
      <span className="relative grid h-16 w-16 place-items-center rounded-2xl border-[1.5px] border-ink bg-surface text-ink"><Icon name={icon} size={30} /></span>
    </div>
  )
}

export function AlbumSection() {
  const c = useC()
  const [aid, setAid] = useState(c.albums[0]?.id)
  const [idx, setIdx] = useState<number | null>(null)
  const album = c.albums.find((a) => a.id === aid) ?? c.albums[0]
  const n = album?.photos.length ?? 0
  const go = (d: number) => { play('tick'); setIdx((i) => (i === null ? i : (i + d + n) % n)) }

  useEffect(() => {
    if (idx === null) return
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  })

  if (!album) return <p className="text-muted">No albums yet. Add one from the CMS.</p>
  const empty = album.photos.every((p) => !p.src)
  return (
    <div className="relative">
      <HiddenBug id="b5" className="-top-14 right-4" />
      <div className="mb-6 flex gap-3 overflow-x-auto pb-2" role="tablist" aria-label="Albums">
        {c.albums.map((a) => (
          <button key={a.id} role="tab" aria-selected={a.id === album.id} onClick={() => { setAid(a.id); play('select') }} className={cx('card lift flex shrink-0 items-center gap-3 px-4 py-3 text-left', a.id === album.id && '!border-ink shadow-[0_4px_0_var(--ink)]')}>
            <Icon name={a.icon} size={22} />
            <span><span className="block font-display font-bold leading-tight">{a.title}</span><span className="block text-xs text-muted">{a.photos.length} photos, {a.date}</span></span>
          </button>
        ))}
      </div>
      <p className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
        <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden /> {album.location}</span>
        <span>{album.description}</span>
        {empty && <span className="chip">Sample frames. Add real photos in the CMS.</span>}
      </p>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {album.photos.map((p, i) => (
          <li key={`${album.id}-${i}`}>
            <button onClick={() => { play('open'); setIdx(i) }} className="card lift block w-full overflow-hidden text-left" aria-label={`Open photo: ${p.caption}`}>
              <Frame photo={p} icon={album.icon} i={i} />
              <span className="block truncate px-3 py-2.5 text-sm font-semibold">{p.caption}</span>
            </button>
          </li>
        ))}
      </ul>

      <Modal open={idx !== null} onOpenChange={(o) => !o && setIdx(null)} title={idx !== null ? album.photos[idx]?.caption ?? '' : ''} description={idx !== null ? `${idx + 1} of ${n}, ${album.title}` : undefined} wide>
        {idx !== null && album.photos[idx] && (
          <div>
            <AnimatePresence mode="wait">
              <motion.div key={idx} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }}>
                <Frame photo={album.photos[idx]} icon={album.icon} i={idx} big />
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex justify-between">
              <button className="btn btn-soft" onClick={() => go(-1)}><ChevronLeft size={18} aria-hidden /> Previous</button>
              <button className="btn btn-soft" onClick={() => go(1)}>Next <ChevronRight size={18} aria-hidden /></button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
