import { useEffect, useState } from 'react'
import { motion, useScroll, useSpring } from 'motion/react'
import { useC } from '../store/content'

export function Nav() {
  const c = useC()
  const [active, setActive] = useState('')
  const { scrollYProgress } = useScroll()
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  const secs = c.sections.filter((s) => s.visible)

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    secs.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [secs.map((s) => s.id).join()]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-bg/70 backdrop-blur-xl" aria-label="Sections">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a href="#top" onClick={(e) => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }) }} className="glitch font-display shrink-0 text-lg font-bold tracking-tight">
          <span className="text-grad">LJ</span><span className="text-muted">.</span>
        </a>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {secs.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }) }}
              className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${active === s.id ? 'bg-primary/20 text-accent' : 'text-muted hover:text-ink'}`}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
      <motion.div className="bg-grad h-[2px] origin-left" style={{ scaleX: bar }} />
    </nav>
  )
}
