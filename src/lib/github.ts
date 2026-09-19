export interface GhUser { public_repos: number; followers: number; avatar_url: string }
export interface GhRepo { name: string; full_name: string; stargazers_count: number; pushed_at: string; language: string | null }

async function cached<T>(key: string, url: string, ttlMs = 30 * 60 * 1000): Promise<T | null> {
  try {
    const hit = sessionStorage.getItem(key)
    if (hit) {
      const { t, d } = JSON.parse(hit)
      if (Date.now() - t < ttlMs) return d as T
    }
  } catch { /* storage unavailable */ }
  try {
    const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
    if (!r.ok) return null
    const d = (await r.json()) as T
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })) } catch { /* ignore */ }
    return d
  } catch {
    return null
  }
}
export const fetchUser = (u: string) => cached<GhUser>(`gh:user:${u}`, `https://api.github.com/users/${u}`)
export const fetchRepos = (u: string) => cached<GhRepo[]>(`gh:repos:${u}`, `https://api.github.com/users/${u}/repos?per_page=100`)
