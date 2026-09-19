import { useEffect } from 'react'
import { Toaster as Sonner, toast } from 'sonner'
import { onUnlock } from '../store/progress'
import { useIsMobile } from './kit'
import { Icon } from '../lib/icons'
import { RARITY_COLOR } from '../lib/utils'

/** Achievement toasts are Sonner toasts with a custom, Steam-style body. */
export function Toaster() {
  const mobile = useIsMobile()
  useEffect(() => onUnlock((def) => {
    toast.custom(() => (
      <div className="glass flex w-[min(92vw,22rem)] items-center gap-3 rounded-2xl p-3" style={{ borderColor: RARITY_COLOR[def.rarity], borderWidth: 1.5 }}>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-[1.5px] bg-surface text-ink" style={{ borderColor: RARITY_COLOR[def.rarity] }}><Icon name={def.icon} size={24} /></span>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-muted">Achievement unlocked</div>
          <div className="truncate font-display text-base font-bold text-ink">{def.title}</div>
          <div className="line-clamp-2 text-sm text-muted">{def.description}</div>
        </div>
      </div>
    ), { duration: 5000 })
  }), [])
  return <Sonner position={mobile ? 'top-center' : 'bottom-right'} offset={mobile ? 76 : 20} visibleToasts={3} />
}
