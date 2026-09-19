import { Terminal as TermIcon, Volume2, VolumeX } from 'lucide-react'
import { useProgress } from '../store/progress'
import { useC } from '../store/content'
import { useFx } from '../store/fx'
import { levelProgress } from '../lib/level'

/** Visitor's own progress, like a Steam level chip. */
export function HUD() {
  const { xp, eggs, bugs, muted, toggleMute } = useProgress()
  const c = useC()
  const setTerminal = useFx((s) => s.setTerminal)
  const p = levelProgress(xp)
  const found = Object.keys(eggs).length
  return (
    <div className="panel fixed bottom-4 left-4 z-[80] flex items-center gap-3 px-3 py-2 text-[11px]">
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold"
        style={{ background: `conic-gradient(var(--accent) ${p.pct * 360}deg, rgb(255 255 255 / .1) 0)` }}
        title={`${xp} XP`}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-surface text-xs">{p.level}</span>
      </div>
      <div className="hidden min-w-[110px] sm:block">
        <div className="text-[10px] uppercase tracking-widest text-muted">Explorer Lv.{p.level}</div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="bg-grad h-full transition-all duration-700" style={{ width: `${p.pct * 100}%` }} />
        </div>
        <div className="mt-1 text-muted">🏆 {found}/{c.eggs.length} · 🐛 {bugs.length}/{c.site.bugCount}</div>
      </div>
      <button className="text-muted hover:text-accent" onClick={toggleMute} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}>
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      <button className="text-muted hover:text-accent" onClick={() => setTerminal(true)} aria-label="Open console (backtick)">
        <TermIcon size={16} />
      </button>
    </div>
  )
}
