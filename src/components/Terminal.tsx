import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useFx, burst } from '../store/fx'
import { useC } from '../store/content'
import { useProgress } from '../store/progress'
import { PRESETS } from '../lib/themes'
import { levelFromXp } from '../lib/level'

interface Line { kind: 'in' | 'out' | 'err'; text: string }
const BANNER = [
  '  _     _   _ _   _  ____ ',
  ' | |   | | | | \\ | |/ ___|',
  ' | |   | |_| |  \\| | |  _ ',
  ' | |___|  _  | |\\  | |_| |',
  ' |_____|_| |_|_| \\_|\\____|',
  '',
  'LJH shell v1.0 — type "help". Tab completes.',
]
const COMMANDS = ['help', 'whoami', 'ls', 'cat', 'awards', 'skills', 'open', 'theme', 'xp', 'secrets', 'contact', 'flip', 'matrix', 'flood', 'sudo', 'clear', 'exit']

export function Terminal() {
  const open = useFx((s) => s.terminal)
  const setOpen = useFx((s) => s.setTerminal)
  const play = useFx((s) => s.play)
  const c = useC()
  const p = useProgress()
  const [lines, setLines] = useState<Line[]>(BANNER.map((text) => ({ kind: 'out' as const, text })))
  const [val, setVal] = useState('')
  const [hist, setHist] = useState<string[]>([])
  const [hi, setHi] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) { p.unlock('terminal'); setTimeout(() => inputRef.current?.focus(), 60) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => { endRef.current?.scrollIntoView() }, [lines])

  const out = (...t: string[]) => setLines((l) => [...l, ...t.map((text) => ({ kind: 'out' as const, text }))])
  const err = (text: string) => setLines((l) => [...l, { kind: 'err', text }])

  function run(raw: string) {
    setLines((l) => [...l, { kind: 'in', text: raw }])
    const [cmd, ...args] = raw.trim().split(/\s+/)
    const arg = args.join(' ').toLowerCase()
    switch (cmd?.toLowerCase()) {
      case '': break
      case 'help':
        out('whoami · ls · cat <project> · awards · skills · open <section>', 'theme <sunset|matrix|ice|default> · xp · secrets · contact', 'flip · matrix · flood · clear · exit', 'There are commands not listed here.')
        break
      case 'whoami': out(`${c.profile.name} (@${c.profile.handle})`, c.profile.tagline, c.profile.location); break
      case 'ls': out(...c.projects.map((x) => `${x.emoji}  ${x.id.padEnd(22)} [${x.status}]`)); break
      case 'cat': {
        const x = c.projects.find((q) => q.id === arg || q.title.toLowerCase() === arg)
        if (!x) return err(`cat: ${arg || '?'}: no such project (try ls)`)
        out(`# ${x.title}`, x.tagline, x.description, ...x.highlights.map((h) => `  • ${h.label}: ${h.value}`))
        break
      }
      case 'awards': out(...c.achievements.map((a) => `${a.icon}  ${a.title} (${a.rarity})`)); break
      case 'skills': out(...c.skills.map((g) => `${g.title}: ${g.skills.map((s) => s.name).join(', ')}`)); break
      case 'open': {
        const s = c.sections.find((q) => q.id === arg || q.label.toLowerCase() === arg)
        if (!s) return err(`open: unknown section. try: ${c.sections.map((q) => q.id).join(', ')}`)
        setOpen(false)
        setTimeout(() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }), 150)
        break
      }
      case 'theme': {
        if (arg === 'default') { p.setThemeName(null); out('theme reset.'); break }
        if (!PRESETS[arg]) return err(`theme: choose ${Object.keys(PRESETS).join(', ')} or default`)
        p.setThemeName(arg); out(`theme → ${arg}`)
        break
      }
      case 'xp': out(`Level ${levelFromXp(p.xp)} · ${p.xp} XP · ${Object.keys(p.eggs).length}/${c.eggs.length} achievements`); break
      case 'secrets': {
        const left = c.eggs.filter((e) => !p.eggs[e.id])
        out(left.length ? `${left.length} hidden achievements remain:` : 'You found everything. Go outside.', ...left.map((e) => `  ? ${e.hint}`))
        break
      }
      case 'contact': out(...c.profile.links.map((l) => `${l.label}: ${l.url}`)); break
      case 'flip': out('(╯°□°）╯︵ ┻━┻'); setOpen(false); play('flip', 2500); p.unlock('avatar7'); break
      case 'matrix': setOpen(false); play('matrix', 6000); break
      case 'flood': setOpen(false); play('flood', 5500); p.unlock('flood'); break
      case 'sudo':
        if (arg === 'hire-me' || arg === 'hire me') {
          p.unlock('hire'); burst()
          out('[sudo] password for recruiter: ********', 'Access granted. Excellent taste.', ...c.profile.links.map((l) => `→ ${l.label}: ${l.url}`))
        } else if (arg === 'admin') { out('Opening backstage…'); location.hash = '#/admin'; setOpen(false) }
        else err('sudo: nice try. (hint: hire-me)')
        break
      case 'rm': err(arg.includes('-rf') ? 'rm: I have a lot of tests. Try again.' : 'rm: missing operand'); break
      case 'ping': out('pong — 0% packet loss, 100% shipping.'); break
      case 'clear': setLines([]); break
      case 'exit': setOpen(false); break
      default: err(`${cmd}: command not found`)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 top-0 z-[95] mx-auto max-w-3xl px-3 pt-16"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
        >
          <div className="panel overflow-hidden border-accent/40 bg-black/85 shadow-2xl backdrop-blur" onClick={() => inputRef.current?.focus()}>
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[11px] text-muted">
              <button className="h-3 w-3 rounded-full bg-[#ff5f57]" onClick={() => setOpen(false)} aria-label="Close console" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-2">jhjh1214@portfolio: ~</span>
              <span className="ml-auto">esc to close</span>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-3 font-mono text-xs leading-relaxed">
              {lines.map((l, i) => (
                <div key={i} className={l.kind === 'err' ? 'text-red-400' : l.kind === 'in' ? 'text-accent' : 'whitespace-pre-wrap text-slate-300'}>
                  {l.kind === 'in' ? '❯ ' : ''}{l.text}
                </div>
              ))}
              <form
                className="flex items-center gap-2 text-accent"
                onSubmit={(e) => { e.preventDefault(); if (val.trim()) setHist((h) => [val, ...h]); setHi(-1); run(val); setVal('') }}
              >
                ❯
                <input
                  ref={inputRef}
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  aria-label="Console input"
                  className="flex-1 bg-transparent text-slate-100 outline-none focus-visible:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false)
                    if (e.key === 'ArrowUp') { e.preventDefault(); const n = Math.min(hi + 1, hist.length - 1); setHi(n); setVal(hist[n] ?? val) }
                    if (e.key === 'ArrowDown') { e.preventDefault(); const n = Math.max(hi - 1, -1); setHi(n); setVal(n < 0 ? '' : hist[n]) }
                    if (e.key === 'Tab') { e.preventDefault(); const m = COMMANDS.filter((x) => x.startsWith(val)); if (m.length === 1) setVal(m[0] + ' ') }
                    e.stopPropagation()
                  }}
                />
              </form>
              <div ref={endRef} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
