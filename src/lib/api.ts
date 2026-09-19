/**
 * Client for the portfolio's own API (server/). Two ways to point at it:
 *   VITE_API_URL=same-origin        same origin: the Worker (or the demo server) serves both the site and /api
 *   VITE_API_URL=https://x.workers.dev   the site is hosted elsewhere (for example GitHub Pages) and calls the API cross-site
 * With neither set the site still works; contact, sign-in and the CMS report "not connected".
 */
const raw = import.meta.env.VITE_API_URL
export const backendOn = typeof raw === 'string' && raw !== ''
// 'same-origin' is the explicit spelling (a bare '/' gets rewritten into a Windows path by Git Bash).
const BASE = !backendOn || raw === '/' || raw === 'same-origin' ? '' : raw.replace(/\/+$/, '')

const TOKEN_KEY = 'pf.token'
export const getToken = (): string | null => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t: string | null) => {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY) } catch { /* storage blocked */ }
}

export interface ApiResult<T> { ok: boolean; status: number; data: T | null; error: string | null }

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; raw?: Blob } = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {}
  const t = getToken()
  if (t) headers.authorization = `Bearer ${t}`
  let body: BodyInit | undefined
  if (init.raw) { body = init.raw; headers['content-type'] = init.raw.type || 'application/octet-stream' }
  else if (init.body !== undefined) { body = JSON.stringify(init.body); headers['content-type'] = 'application/json' }
  try {
    const res = await fetch(`${BASE}${path}`, { method: init.method ?? (body ? 'POST' : 'GET'), headers, body })
    const text = await res.text()
    let data: unknown = null
    try { data = text ? JSON.parse(text) : null } catch { /* not JSON */ }
    const error = !res.ok ? ((data as { error?: string } | null)?.error ?? `http_${res.status}`) : null
    return { ok: res.ok, status: res.status, data: res.ok ? (data as T) : null, error }
  } catch {
    return { ok: false, status: 0, data: null, error: 'network' }
  }
}

/** Stored media URLs are relative (`/api/media/...`) so the content survives a change of host. */
export const assetUrl = (u: string) => (u.startsWith('/api/') ? BASE + u : u)

const MESSAGES: Record<string, string> = {
  rate_limited: 'Too many attempts. Wait a while and try again.',
  invalid_code: 'That code is wrong or has expired. Request a new one.',
  too_many_attempts: 'Too many wrong codes. Request a new one.',
  invalid_email: 'Enter a valid email address.',
  invalid: 'Some details look wrong. Check them and try again.',
  email_not_configured: "Sign-in emails aren't set up on this site yet.",
  email_failed: "The email couldn't be sent. Try again in a moment.",
  network: "Can't reach the server. Check your connection and try again.",
}
export const friendlyError = (code: string | null) => (code && MESSAGES[code]) || 'Something went wrong. Try again.'
