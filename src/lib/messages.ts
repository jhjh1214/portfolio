import { create } from 'zustand'
import { api, backendOn } from './api'
import { useAuth } from '../store/auth'

export interface Message {
  id: string
  name: string
  email: string
  whatsapp: string | null
  body: string
  created_at: number
  read_at: number | null
}

export async function sendMessage(m: { name: string; email: string; whatsapp?: string; body: string }): Promise<string | null> {
  if (!backendOn) return 'Messaging is not connected yet.'
  const r = await api('/api/messages', { body: { name: m.name, email: m.email, whatsapp: m.whatsapp ?? '', body: m.body } })
  if (r.ok) return null
  if (r.error === 'rate_limited') return "You've sent a few messages already. Please wait an hour before sending another."
  if (r.error === 'network') return "Can't reach the server. Check your connection and try again."
  return 'Your message could not be sent. Check the details and try again.'
}

interface InboxState {
  items: Message[]
  loading: boolean
  onNew: ((m: Message) => void) | null
  load: () => Promise<void>
  markRead: (id: string, read?: boolean) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useInbox = create<InboxState>((set, get) => ({
  items: [],
  loading: false,
  onNew: null,
  load: async () => {
    if (!backendOn) return
    set({ loading: true })
    const r = await api<{ messages: Message[] }>('/api/owner/messages')
    if (!r.data) { set({ loading: false }); return }
    const prev = new Set(get().items.map((i) => i.id))
    const items = r.data.messages
    if (prev.size) items.filter((i) => !prev.has(i.id)).forEach((i) => get().onNew?.(i))
    set({ items, loading: false })
  },
  markRead: async (id, read = true) => {
    set({ items: get().items.map((i) => (i.id === id ? { ...i, read_at: read ? Date.now() : null } : i)) })
    await api(`/api/owner/messages/${id}`, { method: 'PATCH', body: { read } })
  },
  remove: async (id) => {
    set({ items: get().items.filter((i) => i.id !== id) })
    await api(`/api/owner/messages/${id}`, { method: 'DELETE' })
  },
}))

export const unreadCount = () => useInbox((s) => s.items.filter((i) => !i.read_at).length)

/** Owner only: keeps the inbox fresh (every 20 s, and instantly when the tab regains focus). Returns a cleanup. */
export function watchInbox(): () => void {
  if (!backendOn) return () => {}
  const load = () => void useInbox.getState().load()
  load()
  const poll = setInterval(load, 20_000)
  const onVis = () => { if (!document.hidden) load() }
  document.addEventListener('visibilitychange', onVis)
  const stop = useAuth.subscribe((s) => { if (!s.owner) clearInterval(poll) })
  return () => { clearInterval(poll); document.removeEventListener('visibilitychange', onVis); stop() }
}
