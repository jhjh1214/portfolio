// Prints the anon and service keys for the local stack (HS256 JWTs signed with the compose secret).
import { createHmac } from 'node:crypto'

export const SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long'
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
export function sign(payload) {
  const head = b64({ alg: 'HS256', typ: 'JWT' })
  const body = b64(payload)
  const sig = createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url')
  return `${head}.${body}.${sig}`
}
const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 5
export const ANON_KEY = sign({ role: 'anon', iss: 'supabase-local', exp })
export const SERVICE_KEY = sign({ role: 'service_role', iss: 'supabase-local', exp })
export const URL = 'http://localhost:54321'

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('keys.mjs')) {
  console.log(`VITE_SUPABASE_URL=${URL}\nVITE_SUPABASE_ANON_KEY=${ANON_KEY}`)
}
