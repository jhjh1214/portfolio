import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useC } from '../store/content'
import { BugSquash } from '../games/BugSquash'
import { TicTacToe } from '../games/TicTacToe'
import { Memory } from '../games/Memory'
import { Snake } from '../games/Snake'
import { HiddenBug } from '../components/ui'
import type { GameId } from '../types'
import { cx } from '../lib/utils'

const GAMES: Record<GameId, { title: string; icon: string; Comp: () => React.JSX.Element; blurb: string }> = {
  bugsquash: { title: 'Bug Squash', icon: '🐛', Comp: BugSquash, blurb: 'Whack-a-bug, engineer edition.' },
  tictactoe: { title: 'Unbeatable', icon: '⭕', Comp: TicTacToe, blurb: 'Minimax AI. Good luck.' },
  memory: { title: 'Stack Match', icon: '🧠', Comp: Memory, blurb: 'Pair up the tech.' },
  snake: { title: 'Debugger', icon: '🐍', Comp: Snake, blurb: 'A snake that eats bugs.' },
}

export function Arcade() {
  const c = useC()
  const ids = c.site.games.filter((g) => GAMES[g])
  const [cur, setCur] = useState<GameId>(ids[0] ?? 'bugsquash')
  const g = GAMES[cur] ?? GAMES.bugsquash
  return (
    <div className="relative">
      <HiddenBug id="b8" className="-top-10 left-6" />
      <p className="mb-6 text-sm text-muted">{c.site.arcadeIntro}</p>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ids.map((id) => (
          <button key={id} onClick={() => setCur(id)} className={cx('panel panel-hover p-4 text-center', id === cur && 'border-accent/80 shadow-[0_0_30px_-10px_var(--accent)]')}>
            <div className="text-3xl">{GAMES[id].icon}</div>
            <div className="mt-2 text-sm font-bold">{GAMES[id].title}</div>
            <div className="text-[10px] text-muted">{GAMES[id].blurb}</div>
          </button>
        ))}
      </div>
      <div className="panel p-6">
        <AnimatePresence mode="wait">
          <motion.div key={cur} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <g.Comp />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
