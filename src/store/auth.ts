import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supa, backendOn } from '../lib/supabase'
import { useProgress, pick, type Persisted } from './progress'
import { useContent } from './content'

export type Aal = 'aal1' | 'aal2' | null
interface AuthState {
  ready: boolean
  session: Session | null
  displayName: string
  /** Email is on the owner allow-list (says nothing about 2FA). */
  ownerEmail: boolean
  /** Allow-listed email AND second factor passed: the only state that can write. */
  owner: boolean
  aal: Aal
  friends: number | null
  init: () => Promise<void>
  sendCode: (email: string, name?: string) => Promise<string | null>
  verifyCode: (email: string, code: string) => Promise<string | null>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

let pushTimer: ReturnType<typeof setTimeout> | undefined
let unsub: (() => void) | undefined

async function loadContent() {
  if (!supa) return
  const { data } = await supa.from('site_content').select('data').eq('id', 'main').maybeSingle()
  if (data?.data) useContent.getState().setRemote(data.data)
}

export const useAuth = create<AuthState>((set, get) => {
  async function hydrate(session: Session | null) {
    if (!supa || !session) {
      unsub?.(); unsub = undefined
      set({ session: null, ownerEmail: false, owner: false, aal: null, displayName: '' })
      return
    }
    const [{ data: aalData }, o1, o2, prof] = await Promise.all([
      supa.auth.mfa.getAuthenticatorAssuranceLevel(),
      supa.rpc('is_owner_email'),
      supa.rpc('is_owner'),
      supa.from('profiles').select('display_name, theme, mode, progress').eq('id', session.user.id).maybeSingle(),
    ])
    set({ session, aal: (aalData?.currentLevel as Aal) ?? null, ownerEmail: o1.data === true, owner: o2.data === true, displayName: prof.data?.display_name || (session.user.user_metadata?.display_name as string) || '' })

    // Merge cloud progress into this device, then keep pushing changes.
    const remote = (prof.data?.progress ?? {}) as Partial<Persisted>
    useProgress.getState().mergeRemote({ ...remote, theme: (prof.data?.theme as Persisted['theme']) ?? null, mode: (prof.data?.mode as Persisted['mode']) ?? null })
    unsub?.()
    unsub = useProgress.subscribe((s) => {
      clearTimeout(pushTimer)
      pushTimer = setTimeout(() => {
        const p = pick(s)
        // Query builders are lazy: nothing is sent until .then() runs, so `void builder` would silently do nothing.
        void supa!.from('profiles').update({ progress: { eggs: p.eggs, xp: p.xp, scores: p.scores, played: p.played, seen: p.seen, bugs: p.bugs }, theme: p.theme, mode: p.mode, updated_at: new Date().toISOString() }).eq('id', session.user.id)
          .then(({ error }) => { if (error) console.warn('Progress sync failed:', error.message) })
      }, 1500)
    })
  }

  return {
    ready: !backendOn,
    session: null,
    displayName: '',
    ownerEmail: false,
    owner: false,
    aal: null,
    friends: null,
    init: async () => {
      if (!supa) return
      void loadContent()
      void supa.rpc('friend_count').then(({ data }) => typeof data === 'number' && set({ friends: data }))
      const { data } = await supa.auth.getSession()
      await hydrate(data.session)
      set({ ready: true })
      supa.auth.onAuthStateChange((event, session) => {
        // Defer: awaiting supabase calls inside this callback can deadlock the client.
        setTimeout(() => void hydrate(session), 0)
        if (event === 'SIGNED_OUT') set({ session: null })
      })
    },
    sendCode: async (email, name) => {
      if (!supa) return 'Sign-in is not connected yet.'
      const { error } = await supa.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: name ? { display_name: name.slice(0, 40) } : undefined } })
      return error ? friendly(error.message) : null
    },
    verifyCode: async (email, code) => {
      if (!supa) return 'Sign-in is not connected yet.'
      const { error } = await supa.auth.verifyOtp({ email, token: code, type: 'email' })
      if (error) return friendly(error.message)
      await hydrate((await supa.auth.getSession()).data.session)
      return null
    },
    refresh: async () => { if (supa) await hydrate((await supa.auth.getSession()).data.session) },
    signOut: async () => {
      await supa?.auth.signOut()
      set({ session: null, ownerEmail: false, owner: false, aal: null, displayName: '' })
      get()
    },
  }
})

function friendly(msg: string) {
  if (/rate limit|too many|security purposes/i.test(msg)) return 'Too many attempts. Wait a minute and try again.'
  if (/expired|invalid/i.test(msg)) return 'That code is wrong or has expired. Request a new one.'
  if (/email.*invalid|invalid.*email/i.test(msg)) return 'Enter a valid email address.'
  return msg
}
