import type { Content } from '../types'

/** Deep-merge `raw` over `base`: arrays are replaced wholesale, unknown/mistyped values fall back to base. */
export function normalize<T>(base: T, raw: unknown): T {
  if (Array.isArray(base)) return (Array.isArray(raw) ? raw : base) as T
  if (base && typeof base === 'object') {
    const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(base as object)) out[k] = normalize((base as Record<string, unknown>)[k], r[k])
    return out as T
  }
  return (typeof raw === typeof base ? raw : base) as T
}
export const normalizeContent = (base: Content, raw: unknown) => normalize(base, raw)
