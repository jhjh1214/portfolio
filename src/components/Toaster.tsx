import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useProgress, type Toast } from '../store/progress'
import { RARITY_COLOR } from '../lib/utils'

function ToastCard({ t }: { t: Toast }) {
  const dismiss = useProgress((s) => s.dismissToast)
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), 5200)
    return () => clearTimeout(id)
  }, [t.id, dismiss])
  const c = RARITY_COLOR[t.rarity]
  return (
    <motion.div
      layout
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      onClick={() => dismiss(t.id)}
      role="status"
      className="panel holo pointer-events-auto flex w-[min(92vw,340px)] cursor-pointer items-center gap-3 p-3"
      style={{ borderColor: c, boxShadow: `0 0 30px -8px ${c}` }}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl" style={{ background: `${c}26`, border: `1px solid ${c}` }}>
        {t.icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: c }}>Achievement unlocked</div>
        <div className="truncate text-sm font-bold">{t.title}</div>
        <div className="line-clamp-2 text-xs text-muted">{t.desc}</div>
      </div>
    </motion.div>
  )
}

export function Toaster() {
  const toasts = useProgress((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex flex-col gap-2" aria-live="polite">
      <AnimatePresence>{toasts.slice(-3).map((t) => <ToastCard key={t.id} t={t} />)}</AnimatePresence>
    </div>
  )
}
