// RFC 6238 time-based one-time passwords (SHA-1, 6 digits, 30 s): the format every authenticator app understands.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}
export function base32Decode(s: string): Uint8Array<ArrayBuffer> {
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of s.replace(/=+$/, '').toUpperCase()) {
    const i = ALPHABET.indexOf(ch)
    if (i < 0) throw new Error('bad base32')
    value = (value << 5) | i
    bits += 5
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8 }
  }
  return Uint8Array.from(out)
}

export const newSecret = () => base32Encode(crypto.getRandomValues(new Uint8Array(20)))
export const step = (nowMs: number) => Math.floor(nowMs / 30_000)

async function hotp(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const msg = new ArrayBuffer(8)
  const dv = new DataView(msg)
  dv.setUint32(0, Math.floor(counter / 0x100000000))
  dv.setUint32(4, counter >>> 0)
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg))
  const o = h[19] & 15
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 1_000_000).padStart(6, '0')
}
export const totpAt = (secret: string, nowMs: number) => hotp(secret, step(nowMs))

/**
 * Returns the matched time step, or null. Accepts one step either side for clock drift, and refuses any step
 * at or before `lastStep`, so a code can never be replayed.
 */
export async function verifyTotp(secret: string, code: string, nowMs: number, lastStep: number): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null
  const now = step(nowMs)
  for (const s of [now - 1, now, now + 1]) {
    if (s <= lastStep) continue
    if ((await hotp(secret, s)) === code) return s
  }
  return null
}

export const otpauthUri = (secret: string, account: string, issuer = 'Portfolio') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
