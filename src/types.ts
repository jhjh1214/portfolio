export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type SectionId = 'showcase' | 'projects' | 'journey' | 'achievements' | 'opensource' | 'skills' | 'album' | 'arcade' | 'contact'
export type GameId = 'bugsquash' | 'tictactoe' | 'memory' | 'snake'
export type ProjectStatus = 'live' | 'shipped' | 'wip' | 'archived'
export type ThemeId = 'nyonya' | 'cyber' | 'steam' | 'terminal' | 'sakura' | 'mono'
export type Mode = 'system' | 'light' | 'dark'
export type Tone = 'teal' | 'coral' | 'sun' | 'cobalt'

export interface LinkItem { label: string; url: string; icon: string }
export interface Stat { label: string; value: string }

export interface Profile {
  name: string
  handle: string
  tagline: string
  bio: string
  avatar: string
  location: string
  /** Only year and month are stored (and public): enough to show an age without publishing a full birthday. 0 = not set. */
  birthYear: number
  birthMonth: number
  status: 'online' | 'away' | 'offline'
  statusText: string
  typing: string[]
  links: LinkItem[]
  spoken: { language: string; level: string }[]
  mission: string[]
}

export interface ThemeConfig {
  defaultTheme: ThemeId
  defaultMode: Mode
  offered: ThemeId[]
  hero3d: boolean
}

export interface SectionConfig { id: SectionId; label: string; title: string; subtitle: string; visible: boolean }

export interface Project {
  id: string
  title: string
  tagline: string
  description: string
  status: ProjectStatus
  year: string
  tags: string[]
  stack: string[]
  repo: string
  url: string
  tone: Tone
  icon: string
  featured: boolean
  highlights: Stat[]
}

export interface JourneyItem {
  id: string
  date: string
  title: string
  detail: string
  kind: 'start' | 'project' | 'award' | 'oss' | 'milestone'
  icon: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: Rarity
  date: string
  issuer: string
  featured: boolean
}

export interface OpenSourceItem { id: string; name: string; repo: string; status: string; description: string; url: string }
export interface Skill { name: string; icon: string; level: number }
export interface SkillGroup { id: string; title: string; skills: Skill[] }
export interface Photo { src: string; caption: string }
export interface Album { id: string; title: string; date: string; location: string; description: string; icon: string; photos: Photo[] }

export interface EggDef {
  id: string
  title: string
  description: string
  hint: string
  touch: string
  icon: string
  rarity: Rarity
  xp: number
}

export interface Site {
  githubUser: string
  bugCount: number
  arcadeIntro: string
  games: GameId[]
  contactIntro: string
}

export interface Content {
  /** Bump when the content shape changes. Cached or published content from an older version is ignored, not merged. */
  version: number
  profile: Profile
  theme: ThemeConfig
  sections: SectionConfig[]
  projects: Project[]
  journey: JourneyItem[]
  achievements: Achievement[]
  openSource: OpenSourceItem[]
  skills: SkillGroup[]
  albums: Album[]
  eggs: EggDef[]
  site: Site
}
