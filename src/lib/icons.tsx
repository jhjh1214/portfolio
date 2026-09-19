import type { ComponentType } from 'react'
import {
  Award, Trophy, Medal, ShieldCheck, Link2, Cpu, Radio, Car, Waves, Gamepad2, Blocks, GitMerge, GitPullRequest, Handshake,
  FlaskConical, Bug, Sofa, Globe, Sprout, Rocket, Wrench, Terminal, MapPin, Camera, Zap, Users, MessageCircle, Lock, Sparkles,
  Leaf, Moon, Compass, Puzzle, Ship, Briefcase, Landmark, TreePalm, Grid3x3, ScanFace, LayoutTemplate, MousePointerClick,
  RotateCw, Database, Plug, Code, Star, Keyboard, Lightbulb, Layers, Package, Smartphone, Wifi,
} from 'lucide-react'
import {
  siPython, siTypescript, siJavascript, siDart, siSolidity, siFlask, siFastapi, siNodedotjs, siSpring, siAngular, siReact,
  siFlutter, siPostgresql, siSqlite, siMongodb, siFirebase, siDocker, siLinux, siGit, siGithub, siOpenjdk, siC, siSass,
} from 'simple-icons'

type LucideLike = ComponentType<{ size?: number | string; className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>

/** Curated icon keys the CMS can pick from. */
export const ICONS: Record<string, LucideLike> = {
  award: Award, trophy: Trophy, medal: Medal, 'shield-check': ShieldCheck, link: Link2, cpu: Cpu, radio: Radio, car: Car,
  waves: Waves, gamepad: Gamepad2, blocks: Blocks, 'git-merge': GitMerge, 'git-pr': GitPullRequest, handshake: Handshake,
  flask: FlaskConical, bug: Bug, sofa: Sofa, globe: Globe, sprout: Sprout, rocket: Rocket, wrench: Wrench, terminal: Terminal,
  'map-pin': MapPin, camera: Camera, zap: Zap, users: Users, message: MessageCircle, lock: Lock, sparkles: Sparkles, leaf: Leaf,
  moon: Moon, compass: Compass, puzzle: Puzzle, ship: Ship, briefcase: Briefcase, landmark: Landmark, palm: TreePalm,
  grid: Grid3x3, 'scan-face': ScanFace, layout: LayoutTemplate, click: MousePointerClick, rotate: RotateCw, database: Database,
  plug: Plug, code: Code, star: Star, keyboard: Keyboard, lightbulb: Lightbulb, layers: Layers, package: Package,
  smartphone: Smartphone, wifi: Wifi,
}
export const ICON_KEYS = Object.keys(ICONS)

export function Icon({ name, size = 20, className, strokeWidth = 1.75 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const C = ICONS[name] ?? Star
  return <C size={size} className={className} strokeWidth={strokeWidth} aria-hidden />
}

interface Brand { title: string; path: string }
const BRANDS: Record<string, Brand> = {
  python: siPython, typescript: siTypescript, javascript: siJavascript, dart: siDart, solidity: siSolidity, flask: siFlask,
  fastapi: siFastapi, nodejs: siNodedotjs, spring: siSpring, angular: siAngular, react: siReact, flutter: siFlutter,
  postgres: siPostgresql, sqlite: siSqlite, mongodb: siMongodb, firebase: siFirebase, docker: siDocker, linux: siLinux,
  git: siGit, github: siGithub, java: siOpenjdk, c: siC, sass: siSass,
}
export const hasBrand = (k: string) => k in BRANDS

/** Monochrome technology mark (theme-coloured). Falls back to a curated icon, then a generic one. */
export function TechIcon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  const b = BRANDS[name]
  if (!b) return <Icon name={name in ICONS ? name : 'code'} size={size} className={className} />
  return (
    <svg role="img" aria-label={b.title} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={b.path} />
    </svg>
  )
}

export function LinkedinMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  )
}

/** Icon for a profile link entry. */
export function LinkIcon({ name, size = 18 }: { name: string; size?: number }) {
  if (name === 'linkedin') return <LinkedinMark size={size} />
  if (name === 'github') return <TechIcon name="github" size={size} />
  return <Icon name="globe" size={size} />
}
