import { useState } from 'react'
import { Tabs } from 'radix-ui'
import { useC } from '../store/content'
import { BugSquash } from '../games/BugSquash'
import { TicTacToe } from '../games/TicTacToe'
import { Memory } from '../games/Memory'
import { Snake } from '../games/Snake'
import { HiddenBug } from '../components/kit'
import { Icon } from '../lib/icons'
import { play } from '../lib/sound'
import type { GameId } from '../types'

const GAMES: Record<GameId, { title: string; icon: string; Comp: () => React.JSX.Element; blurb: string }> = {
  bugsquash: { title: 'Bug Squash', icon: 'bug', Comp: BugSquash, blurb: 'Whack-a-bug, engineer edition.' },
  tictactoe: { title: 'Unbeatable', icon: 'grid', Comp: TicTacToe, blurb: 'A minimax AI. Good luck.' },
  memory: { title: 'Stack Match', icon: 'layers', Comp: Memory, blurb: 'Pair up the tech.' },
  snake: { title: 'Debugger', icon: 'terminal', Comp: Snake, blurb: 'A snake that eats bugs.' },
}

export function Arcade() {
  const c = useC()
  const ids = c.site.games.filter((g) => GAMES[g])
  const [cur, setCur] = useState<GameId>(ids[0] ?? 'bugsquash')
  return (
    <div className="relative">
      <HiddenBug id="b8" className="-top-14 left-2" />
      <p className="prose-tight mb-6 text-muted">{c.site.arcadeIntro}</p>
      <Tabs.Root value={cur} onValueChange={(v) => { setCur(v as GameId); play('select') }}>
        <Tabs.List className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Arcade games">
          {ids.map((id) => (
            <Tabs.Trigger key={id} value={id} className="card lift flex flex-col items-start gap-2 p-4 text-left data-[state=active]:!border-ink data-[state=active]:bg-ink data-[state=active]:text-bg data-[state=active]:shadow-[0_4px_0_var(--accent)]">
              <Icon name={GAMES[id].icon} size={24} />
              <span className="font-display text-lg font-bold leading-none">{GAMES[id].title}</span>
              <span className="text-xs opacity-75">{GAMES[id].blurb}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {ids.map((id) => {
          const G = GAMES[id].Comp
          return <Tabs.Content key={id} value={id} className="card p-5 sm:p-8"><G /></Tabs.Content>
        })}
      </Tabs.Root>
    </div>
  )
}
