// Schema-driven CMS: every collection is described here, and Form.tsx renders it.
export type Field =
  | { key: string; label: string; type: 'text' | 'textarea' | 'url' | 'color' | 'number' | 'bool' | 'image' | 'tags' | 'lines'; help?: string }
  | { key: string; label: string; type: 'select'; options: string[]; help?: string }
  | { key: string; label: string; type: 'list'; item: Schema; itemLabel: (x: never) => string; blank: () => unknown; help?: string }
export type Schema = Field[]

const S = (key: string, label: string, help?: string): Field => ({ key, label, type: 'text', help })
const T = (key: string, label: string, help?: string): Field => ({ key, label, type: 'textarea', help })
const rarity = ['common', 'uncommon', 'rare', 'epic', 'legendary']

type Any = Record<string, string>
const lab = (k: string) => (x: never) => (x as Any)[k] || '(untitled)'

export const profileSchema: Schema = [
  S('name', 'Name'), S('handle', 'GitHub handle'), S('tagline', 'Tagline'), T('bio', 'Bio'),
  { key: 'avatar', label: 'Avatar', type: 'image', help: 'URL or upload. Defaults to your GitHub avatar.' },
  S('location', 'Location'),
  { key: 'status', label: 'Status', type: 'select', options: ['online', 'away', 'offline'] },
  S('statusText', 'Status text'),
  { key: 'typing', label: 'Typewriter lines', type: 'lines', help: 'One per line.' },
  { key: 'mission', label: 'Current mission', type: 'lines', help: 'One per line.' },
  { key: 'links', label: 'Links', type: 'list', item: [S('label', 'Label'), { key: 'url', label: 'URL', type: 'url' }, { key: 'icon', label: 'Icon', type: 'select', options: ['github', 'linkedin', 'mail', 'link'] }], itemLabel: lab('label'), blank: () => ({ label: 'New link', url: 'https://', icon: 'link' }) },
  { key: 'spoken', label: 'Spoken languages', type: 'list', item: [S('language', 'Language'), S('level', 'Level')], itemLabel: lab('language'), blank: () => ({ language: 'Language', level: 'Fluent' }) },
]

export const themeSchema: Schema = [
  { key: 'bg', label: 'Background', type: 'color' },
  { key: 'surface', label: 'Surface', type: 'color' },
  { key: 'primary', label: 'Primary', type: 'color' },
  { key: 'secondary', label: 'Secondary', type: 'color' },
  { key: 'accent', label: 'Accent', type: 'color' },
  { key: 'text', label: 'Text', type: 'color' },
  { key: 'muted', label: 'Muted text', type: 'color' },
  { key: 'font', label: 'Body font', type: 'select', options: ['mono', 'sans'] },
  { key: 'hero3d', label: '3D hero scene', type: 'bool' },
]

export const sectionSchema: Schema = [
  { key: 'visible', label: 'Visible', type: 'bool' }, S('label', 'Nav label'), S('title', 'Title'), T('subtitle', 'Subtitle'),
]

const stat: Schema = [S('label', 'Label'), S('value', 'Value')]
export const projectSchema: Schema = [
  S('id', 'ID', 'Unique slug, used by the terminal (cat <id>).'), S('title', 'Title'), S('tagline', 'Tagline'), T('description', 'Description'),
  { key: 'status', label: 'Status', type: 'select', options: ['live', 'shipped', 'wip', 'archived'] },
  S('year', 'Year'), S('emoji', 'Cover emoji'),
  { key: 'colorA', label: 'Cover colour A', type: 'color' }, { key: 'colorB', label: 'Cover colour B', type: 'color' },
  { key: 'tags', label: 'Tags', type: 'tags' },
  { key: 'stack', label: 'Stack icons', type: 'tags', help: 'skillicons.dev slugs (python, react…) or emoji.' },
  S('repo', 'GitHub repo', 'owner/name. Enables live stars/updated date if public.'), { key: 'url', label: 'Live URL', type: 'url' },
  { key: 'featured', label: 'Flagship (shown in Showcase)', type: 'bool' },
  { key: 'highlights', label: 'Highlights', type: 'list', item: stat, itemLabel: lab('label'), blank: () => ({ label: 'Metric', value: '0' }) },
]

export const journeySchema: Schema = [
  S('date', 'Date', 'Free text: "Jul 2025", "2026"…'), S('title', 'Title'), T('detail', 'Detail'), S('icon', 'Icon emoji'),
  { key: 'kind', label: 'Kind', type: 'select', options: ['start', 'project', 'award', 'oss', 'milestone'] },
]

export const achievementSchema: Schema = [
  S('title', 'Title'), T('description', 'Description'), S('icon', 'Icon emoji'),
  { key: 'rarity', label: 'Rarity', type: 'select', options: rarity }, S('date', 'Date'), S('issuer', 'Issuer'),
  { key: 'featured', label: 'Featured in Showcase', type: 'bool' },
]

export const ossSchema: Schema = [S('name', 'Name'), S('repo', 'Repo (owner/name)'), S('status', 'Status', 'MERGED, APPROVED, CONTRIBUTED…'), T('description', 'Description'), { key: 'url', label: 'Link', type: 'url' }]

export const skillGroupSchema: Schema = [
  S('title', 'Group title'),
  { key: 'skills', label: 'Skills', type: 'list', item: [S('name', 'Name'), S('icon', 'Icon', 'skillicons.dev slug or emoji'), { key: 'level', label: 'Level (0-100)', type: 'number' }], itemLabel: lab('name'), blank: () => ({ name: 'Skill', icon: 'git', level: 50 }) },
]

export const albumSchema: Schema = [
  S('title', 'Title'), S('date', 'Date'), S('location', 'Location'), S('emoji', 'Emoji'), T('description', 'Description'),
  { key: 'photos', label: 'Photos', type: 'list', item: [{ key: 'src', label: 'Image', type: 'image' }, S('caption', 'Caption')], itemLabel: lab('caption'), blank: () => ({ src: '', caption: 'New photo' }) },
]

export const eggSchema: Schema = [
  S('title', 'Title'), T('description', 'Unlocked text'), S('hint', 'Locked hint'), S('icon', 'Icon'),
  { key: 'rarity', label: 'Rarity', type: 'select', options: rarity }, { key: 'xp', label: 'XP reward', type: 'number' },
]

export const siteSchema: Schema = [
  S('githubUser', 'GitHub user (live stats)'), S('publishRepo', 'Publish repo (owner/name)'), S('publishBranch', 'Publish branch'), S('publishPath', 'content.json path'),
  { key: 'bugCount', label: 'Hidden bug count', type: 'number', help: 'Bugs placed in code: 8. Lower it if you remove some.' },
  T('arcadeIntro', 'Arcade intro'),
  { key: 'games', label: 'Enabled games', type: 'tags', help: 'bugsquash, tictactoe, memory, snake' },
]
