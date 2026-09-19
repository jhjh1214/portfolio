const enc = new TextEncoder()

const toHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
export const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

export async function sha256Hex(s: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(s)))
}

/** Compare two digests without leaking where they differ. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

export function randomToken(bytes = 32): string {
  return b64u(crypto.getRandomValues(new Uint8Array(bytes)))
}

/** Uniform six-digit code (rejection sampling avoids modulo bias). */
export function randomCode(): string {
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000
  const buf = new Uint32Array(1)
  do crypto.getRandomValues(buf); while (buf[0] >= limit)
  return String(buf[0] % 1_000_000).padStart(6, '0')
}

async function aesKey(secret: string) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`${secret}|totp-at-rest`))
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}
export async function encrypt(secret: string, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(secret), enc.encode(plain)))
  return `${b64u(iv)}.${b64u(ct)}`
}
export async function decrypt(secret: string, blob: string): Promise<string> {
  const [iv, ct] = blob.split('.')
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(iv) }, await aesKey(secret), unb64u(ct))
  return new TextDecoder().decode(plain)
}

export function bytesToB64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
export const b64ToBytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
