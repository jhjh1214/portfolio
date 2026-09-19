export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type SectionId =
  | 'showcase'
  | 'projects'
  | 'journey'
  | 'achievements'
  | 'opensource'
  | 'skills'
  | 'album'
  | 'arcade'
export type GameId = 'bugsquash' | 'tictactoe' | 'memory' | 'snake'
export type ProjectStatus = 'live' | 'shipped' | 'wip' | 'archived'

export interface LinkItem {
  label: string
  url: string
  icon: string
}
export interface Stat {
  label: string
  value: string
}

export interface Profile {
  name: string
  handle: string
  tagline: string
  bio: string
  avatar: string
  location: string
  status: string
  statusText: string
  typing: string[]
  links: LinkItem[]
  spoken: { language: string; level: string }[]
  mission: string[]
}

export interface Theme {
  bg: string
  surface: string
  primary: string
  secondary: string
  accent: string
  text: string
  muted: string
  font: 'mono' | 'sans'
  hero3d: boolean
  particles: boolean
}

export interface SectionConfig {
  id: SectionId
  label: string
  title: string
  subtitle: string
  visible: boolean
}

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
  colorA: string
  colorB: string
  emoji: string
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

export interface OpenSourceItem {
  id: string
  name: string
  repo: string
  status: string
  description: string
  url: string
}

export interface Skill {
  name: string
  icon: string
  level: number
}
export interface SkillGroup {
  id: string
  title: string
  skills: Skill[]
}

export interface Photo {
  src: string
  caption: string
}
export interface Album {
  id: string
  title: string
  date: string
  location: string
  description: string
  emoji: string
  photos: Photo[]
}

export interface EggDef {
  id: string
  title: string
  description: string
  hint: string
  icon: string
  rarity: Rarity
  xp: number
}

export interface Site {
  githubUser: string
  publishRepo: string
  publishBranch: string
  publishPath: string
  bugCount: number
  arcadeIntro: string
  games: GameId[]
}

export interface Content {
  profile: Profile
  theme: Theme
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
