import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Null when no backend is configured; every feature that needs it must handle that. The anon key is public by design; row-level security is what protects data. */
export const supa = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null
export const backendOn = supa !== null
