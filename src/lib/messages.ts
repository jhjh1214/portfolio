import { create } from 'zustand'
import { supa } from './supabase'
import { useAuth } from '../store/auth'

export interface Message {
  id: string
  name: string
  email: string
  whatsapp: string | null
  body: string
  created_at: string
  read_at: string | null
}

export async function sendMessage(m: { name: string; email: string; whatsapp?: string; body: string }): Promise<string | null> {
  if (!supa) return 'Messaging is not connected yet.'
  const { error } = await supa.from('messages').insert({ name: m.name, email: m.email, whatsapp: m.whatsapp || null, body: m.body })
  if (!error) return null
  if (/rate_limited/.test(error.message)) return "You've sent a few messages already. Please wait an hour before sending another."
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
    if (!supa) return
    set({ loading: true })
    const { data } = await supa.from('messages').select('*').order('created_at', { ascending: false }).limit(200)
    const prev = new Set(get().items.map((i) => i.id))
    const items = (data ?? []) as Message[]
    if (prev.size) items.filter((i) => !prev.has(i.id)).forEach((i) => get().onNew?.(i))
    set({ items, loading: false })
  },
  markRead: async (id, read = true) => {
    if (!supa) return
    const read_at = read ? new Date().toISOString() : null
    set({ items: get().items.map((i) => (i.id === id ? { ...i, read_at } : i)) })
    await supa.from('messages').update({ read_at }).eq('id', id)
  },
  remove: async (id) => {
    if (!supa) return
    set({ items: get().items.filter((i) => i.id !== id) })
    await supa.from('messages').delete().eq('id', id)
  },
}))

export const unreadCount = () => useInbox((s) => s.items.filter((i) => !i.read_at).length)

/** Owner only: live updates over Realtime, with polling as a safety net. Returns a cleanup. */
export function watchInbox(): () => void {
  if (!supa) return () => {}
  const load = () => void useInbox.getState().load()
  load()
  const poll = setInterval(load, 30_000)
  const ch = supa
    .channel('inbox')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, load)
    .subscribe()
  const stop = useAuth.subscribe((s) => { if (!s.owner) { clearInterval(poll); void supa!.removeChannel(ch) } })
  return () => { clearInterval(poll); void supa!.removeChannel(ch); stop() }
}
