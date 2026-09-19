import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useFx, burst } from '../store/fx'
import { useC } from '../store/content'
import { useProgress } from '../store/progress'
import { THEMES } from '../theme/palettes'
import { levelFromXp } from '../lib/level'
import { play } from '../lib/sound'
import type { Mode, ThemeId } from '../types'

interface Line { kind: 'in' | 'out' | 'err'; text: string }
const BANNER = ['LJ shell 1.0. Type "help". Tab completes, arrows recall history.']
const COMMANDS = ['help', 'whoami', 'ls', 'cat', 'awards', 'skills', 'open', 'theme', 'mode', 'sound', 'xp', 'secrets', 'contact', 'flip', 'matrix', 'flood', 'sudo', 'clear', 'exit']

export function Terminal() {
  const open = useFx((s) => s.terminal)
  const setOpen = useFx((s) => s.setTerminal)
  const fx = useFx((s) => s.play)
  const c = useC()
  const p = useProgress()
  const [lines, setLines] = useState<Line[]>(BANNER.map((text) => ({ kind: 'out' as const, text })))
  const [val, setVal] = useState('')
  const [hist, setHist] = useState<string[]>([])
  const [hi, setHi] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) { p.unlock('terminal'); setTimeout(() => inputRef.current?.focus(), 80) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => { endRef.current?.scrollIntoView() }, [lines])

  const out = (...t: string[]) => setLines((l) => [...l, ...t.map((text) => ({ kind: 'out' as const, text }))])
  const err = (text: string) => { play('error'); setLines((l) => [...l, { kind: 'err', text }]) }

  function run(raw: string) {
    setLines((l) => [...l, { kind: 'in', text: raw }])
    const [cmd, ...args] = raw.trim().split(/\s+/)
    const arg = args.join(' ').toLowerCase()
    switch (cmd?.toLowerCase()) {
      case '': break
      case 'help':
        out('whoami, ls, cat <project>, awards, skills, open <section>', 'theme <id|default>, mode <light|dark|system>, sound <on|off>', 'xp, secrets, contact, flip, matrix, flood, clear, exit', 'There are commands that are not listed here.')
        break
      case 'whoami': out(`${c.profile.name} (@${c.profile.handle})`, c.profile.tagline, c.profile.location); break
      case 'ls': out(...c.projects.map((x) => `${x.id.padEnd(22)} [${x.status}]`)); break
      case 'cat': {
        const x = c.projects.find((q) => q.id === arg || q.title.toLowerCase() === arg)
        if (!x) return err(`cat: ${arg || '?'}: no such project (try ls)`)
        out(`# ${x.title}`, x.tagline, x.description, ...x.highlights.map((h) => `  - ${h.label}: ${h.value}`))
        break
      }
      case 'awards': out(...c.achievements.map((a) => `${a.title} (${a.rarity})`)); break
      case 'skills': out(...c.skills.map((g) => `${g.title}: ${g.skills.map((s) => s.name).join(', ')}`)); break
      case 'open': {
        const s = c.sections.find((q) => q.id === arg || q.label.toLowerCase() === arg)
        if (!s) return err(`open: unknown section. Try: ${c.sections.map((q) => q.id).join(', ')}`)
        setOpen(false)
        setTimeout(() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }), 150)
        break
      }
      case 'theme': {
        if (arg === 'default') { p.setTheme(null); out('theme reset'); break }
        const t = THEMES.find((x) => x.id === arg)
        if (!t) return err(`theme: choose ${THEMES.map((x) => x.id).join(', ')} or default`)
        p.setTheme(t.id as ThemeId); out(`theme: ${t.name}`)
        break
      }
      case 'mode': {
        if (!['light', 'dark', 'system'].includes(arg)) return err('mode: choose light, dark or system')
        p.setMode(arg as Mode); out(`mode: ${arg}`)
        break
      }
      case 'sound': {
        if (arg !== 'on' && arg !== 'off') return err('sound: on or off')
        if ((arg === 'off') !== p.muted) p.toggleMute()
        out(`sound: ${arg}`)
        break
      }
      case 'xp': out(`Level ${levelFromXp(p.xp)}, ${p.xp} XP, ${Object.keys(p.eggs).length}/${c.eggs.length} achievements`); break
      case 'secrets': {
        const left = c.eggs.filter((e) => !p.eggs[e.id])
        out(left.length ? `${left.length} hidden achievements remain:` : 'You found everything. Go outside.', ...left.map((e) => `  - ${e.hint}`))
        break
      }
      case 'contact': out(...c.profile.links.map((l) => `${l.label}: ${l.url}`), 'Or scroll to the contact section.'); break
      case 'flip': out('(╯°□°）╯︵ ┻━┻'); setOpen(false); fx('flip', 2500); p.unlock('avatar7'); break
      case 'matrix': setOpen(false); fx('matrix', 6000); break
      case 'flood': setOpen(false); fx('flood', 5500); p.unlock('flood'); break
      case 'sudo':
        if (arg === 'hire-me' || arg === 'hire me') {
          p.unlock('hire'); burst(); play('win')
          out('[sudo] password for recruiter: ********', 'Access granted. Excellent taste.', ...c.profile.links.map((l) => `${l.label}: ${l.url}`))
        } else if (arg === 'admin') { out('Opening backstage...'); location.hash = '#/admin'; setOpen(false) }
        else err('sudo: nice try. (hint: hire-me)')
        break
      case 'rm': err(arg.includes('-rf') ? 'rm: I have a lot of tests. Try again.' : 'rm: missing operand'); break
      case 'ping': out('pong. 0% packet loss, 100% shipping.'); break
      case 'clear': setLines([]); break
      case 'exit': setOpen(false); break
      default: err(`${cmd}: command not found`)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-x-0 top-0 z-[95] mx-auto max-w-3xl px-3 pt-20" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} role="dialog" aria-label="Developer console">
          <div className="overflow-hidden rounded-2xl border-[1.5px] border-ink bg-[#0d1416] font-mono text-[#d7ebe6] shadow-2xl" onClick={() => inputRef.current?.focus()}>
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs text-white/60">
              <button className="h-3.5 w-3.5 rounded-full bg-[#ff5f57]" onClick={() => setOpen(false)} aria-label="Close console" />
              <span className="h-3.5 w-3.5 rounded-full bg-[#febc2e]" aria-hidden />
              <span className="h-3.5 w-3.5 rounded-full bg-[#28c840]" aria-hidden />
              <span className="ml-2">jhjh1214@portfolio: ~</span>
              <span className="ml-auto hidden sm:inline">Esc to close</span>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-3 text-[13px] leading-relaxed">
              {lines.map((l, i) => (
                <div key={i} className={l.kind === 'err' ? 'text-[#ff8f8f]' : l.kind === 'in' ? 'text-[#7ee0d0]' : 'whitespace-pre-wrap'}>{l.kind === 'in' ? '> ' : ''}{l.text}</div>
              ))}
              <form className="flex items-center gap-2 text-[#7ee0d0]" onSubmit={(e) => { e.preventDefault(); if (val.trim()) setHist((h) => [val, ...h]); setHi(-1); run(val); setVal('') }}>
                {'>'}
                <input
                  ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" aria-label="Console input"
                  className="flex-1 bg-transparent text-base text-white outline-none sm:text-[13px]"
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
