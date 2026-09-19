import type { Theme } from '../types'

/** Terminal-selectable presets; applied on top of the CMS theme. */
export const PRESETS: Record<string, Partial<Theme>> = {
  sunset: { bg: '#12060a', surface: '#1e0d14', primary: '#f97316', secondary: '#e11d48', accent: '#fde68a' },
  matrix: { bg: '#020a04', surface: '#06140a', primary: '#16a34a', secondary: '#4ade80', accent: '#bbf7d0' },
  ice: { bg: '#04101c', surface: '#0a1c2e', primary: '#0ea5e9', secondary: '#6366f1', accent: '#e0f2fe' },
}
