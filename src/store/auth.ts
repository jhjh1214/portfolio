import { create } from 'zustand'
import { api, backendOn, friendlyError, getToken, setToken } from '../lib/api'
import { useProgress, pick, type Persisted } from './progress'
import { useContent } from './content'

/** Same shape the UI already reads: `session.user.email`. */
export interface Session { user: { id: string; email: string } }

interface MeResponse {
  user: { id: string; email: string; displayName: string; theme: Persisted['theme']; mode: Persisted['mode']; progress: Partial<Persisted> }
  ownerEmail: boolean
  owner: boolean
  totpEnrolled: boolean
}

interface AuthState {
  ready: boolean
  session: Session | null
  displayName: string
  /** Email is on the owner allow-list (says nothing about the second factor). */
  ownerEmail: boolean
  /** Allow-listed email AND second factor passed on this session: the only state that can write. */
  owner: boolean
  totpEnrolled: boolean
  friends: number | null
  init: () => Promise<void>
  sendCode: (email: string, name?: string) => Promise<string | null>
  verifyCode: (email: string, code: string) => Promise<string | null>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const signedOut = { session: null, displayName: '', ownerEmail: false, owner: false, totpEnrolled: false }
let pushTimer: ReturnType<typeof setTimeout> | undefined
let unsub: (() => void) | undefined

export const useAuth = create<AuthState>((set) => {
  async function hydrate() {
    if (!backendOn || !getToken()) { unsub?.(); unsub = undefined; set(signedOut); return }
    const r = await api<MeResponse>('/api/me')
    if (!r.ok || !r.data) {
      if (r.status === 401) { setToken(null); unsub?.(); unsub = undefined; set(signedOut) } // token expired or revoked
      return
    }
    const { user, ownerEmail, owner, totpEnrolled } = r.data
    set({ session: { user: { id: user.id, email: user.email } }, displayName: user.displayName, ownerEmail, owner, totpEnrolled })

    // Merge the cloud copy into this device, then keep pushing changes (debounced).
    useProgress.getState().mergeRemote({ ...user.progress, theme: user.theme, mode: user.mode })
    unsub?.()
    unsub = useProgress.subscribe((s) => {
      clearTimeout(pushTimer)
      pushTimer = setTimeout(() => {
        const p = pick(s)
        void api('/api/me', { method: 'PUT', body: { theme: p.theme, mode: p.mode, progress: { eggs: p.eggs, xp: p.xp, scores: p.scores, played: p.played, seen: p.seen, bugs: p.bugs } } })
      }, 1500)
    })
  }

  return {
    ready: !backendOn,
    ...signedOut,
    friends: null,
    init: async () => {
      if (!backendOn) return
      void api<{ data: unknown }>('/api/content').then((r) => { if (r.data?.data) useContent.getState().setRemote(r.data.data) })
      void api<{ count: number }>('/api/friends/count').then((r) => { if (r.data) set({ friends: r.data.count }) })
      await hydrate()
      set({ ready: true })
      // Signing out in another tab signs out here too.
      addEventListener('storage', (e) => { if (e.key === 'pf.token') void hydrate() })
    },
    sendCode: async (email, name) => {
      if (!backendOn) return "Sign-in isn't connected yet."
      const r = await api('/api/auth/request', { body: { email, name } })
      return r.ok ? null : friendlyError(r.error)
    },
    verifyCode: async (email, code) => {
      if (!backendOn) return "Sign-in isn't connected yet."
      const r = await api<{ token: string }>('/api/auth/verify', { body: { email, code } })
      if (!r.ok || !r.data) return friendlyError(r.error)
      setToken(r.data.token)
      await hydrate()
      return null
    },
    refresh: hydrate,
    signOut: async () => {
      await api('/api/auth/logout', { method: 'POST' })
      setToken(null)
      unsub?.(); unsub = undefined
      set(signedOut)
    },
  }
})
