import type { Mode, ThemeId } from '../types'

export interface Palette {
  bg: string
  surface: string
  raised: string
  line: string
  ink: string
  muted: string
  primary: string
  onPrimary: string
  accent: string
  sun: string
  cobalt: string
}
export interface ThemeDef {
  id: ThemeId
  name: string
  blurb: string
  light: Palette
  dark: Palette
}

// Peranakan tile colours shared by every palette that keeps the tile motif.
const tiles = { cobalt: '#2D4FD6' }

export const THEMES: ThemeDef[] = [
  {
    id: 'nyonya',
    name: 'Nyonya tile',
    blurb: 'Glazed teal, coral and sun-yellow from Malacca shophouse tiles.',
    light: { bg: '#E7F1ED', surface: '#FFFFFF', raised: '#F3F9F6', line: '#C5DBD3', ink: '#0F2E2D', muted: '#4A6764', primary: '#0A7C74', onPrimary: '#FFFFFF', accent: '#E8465C', sun: '#E9A81F', ...tiles },
    dark: { bg: '#0B1E22', surface: '#112A30', raised: '#17363D', line: '#26494F', ink: '#E6F3F0', muted: '#93B5B0', primary: '#35C9B8', onPrimary: '#06201D', accent: '#FF7C8E', sun: '#F7C75A', cobalt: '#6F8BFF' },
  },
  {
    id: 'steam',
    name: 'Steam classic',
    blurb: 'The blue-slate profile everyone recognises.',
    light: { bg: '#D9E1E9', surface: '#F4F7FA', raised: '#FFFFFF', line: '#B5C3D1', ink: '#1B2838', muted: '#52677B', primary: '#1F6FA8', onPrimary: '#FFFFFF', accent: '#5C7E10', sun: '#A86A08', cobalt: '#3B5BDB' },
    dark: { bg: '#171A21', surface: '#1B2838', raised: '#223349', line: '#33465C', ink: '#C7D5E0', muted: '#8BA1B4', primary: '#66C0F4', onPrimary: '#0E1A26', accent: '#A4D007', sun: '#F2B84B', cobalt: '#7C9BFF' },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    blurb: 'Phosphor green on black, for people who live in a shell.',
    light: { bg: '#ECEFE6', surface: '#F8FAF3', raised: '#FFFFFF', line: '#C4CCB9', ink: '#12200F', muted: '#495A44', primary: '#1E7B34', onPrimary: '#FFFFFF', accent: '#A84A06', sun: '#8A6A00', cobalt: '#1D4ED8' },
    dark: { bg: '#070B07', surface: '#0D150D', raised: '#132013', line: '#213C21', ink: '#C6F5C6', muted: '#74A874', primary: '#4ADE80', onPrimary: '#04130A', accent: '#FFB000', sun: '#FFB000', cobalt: '#60A5FA' },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    blurb: 'Soft pink with a teal counterpoint.',
    light: { bg: '#FAEBEF', surface: '#FFFFFF', raised: '#FFF6F8', line: '#EBCBD3', ink: '#3A1620', muted: '#7A4756', primary: '#C2255C', onPrimary: '#FFFFFF', accent: '#1F7F7C', sun: '#B8690F', cobalt: '#4C5FD5' },
    dark: { bg: '#1D0F15', surface: '#2A1520', raised: '#361B29', line: '#4F2C3D', ink: '#FBE3EA', muted: '#C79DAB', primary: '#FF6B9A', onPrimary: '#2A0716', accent: '#5FD3CF', sun: '#F6B75C', cobalt: '#8FA0FF' },
  },
  {
    id: 'mono',
    name: 'Newsprint',
    blurb: 'Ink and one loud red. Nothing else.',
    light: { bg: '#EFEFEC', surface: '#FFFFFF', raised: '#F7F7F5', line: '#D2D2CD', ink: '#141414', muted: '#5A5A56', primary: '#141414', onPrimary: '#FFFFFF', accent: '#D6001F', sun: '#D6001F', cobalt: '#141414' },
    dark: { bg: '#0E0E0E', surface: '#161616', raised: '#1F1F1F', line: '#2E2E2E', ink: '#F2F2F0', muted: '#A0A09A', primary: '#F2F2F0', onPrimary: '#111111', accent: '#FF4040', sun: '#FF4040', cobalt: '#F2F2F0' },
  },
]

export const themeById = (id: ThemeId) => THEMES.find((t) => t.id === id) ?? THEMES[0]

export function resolveMode(mode: Mode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(id: ThemeId, mode: Mode) {
  const resolved = resolveMode(mode)
  const p = themeById(id)[resolved]
  const s = document.documentElement.style
  const el = document.documentElement
  el.dataset.theme = id
  el.dataset.mode = resolved
  el.style.colorScheme = resolved
  s.setProperty('--bg', p.bg)
  s.setProperty('--surface', p.surface)
  s.setProperty('--raised', p.raised)
  s.setProperty('--line', p.line)
  s.setProperty('--ink', p.ink)
  s.setProperty('--muted', p.muted)
  s.setProperty('--primary', p.primary)
  s.setProperty('--on-primary', p.onPrimary)
  s.setProperty('--accent', p.accent)
  s.setProperty('--sun', p.sun)
  s.setProperty('--cobalt', p.cobalt)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg)
}
