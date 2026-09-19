import { describe, expect, it } from 'vitest'
import { TOTP, Secret } from 'otpauth'
import { base32Decode, base32Encode, newSecret, totpAt, verifyTotp } from '../src/totp'

// RFC 6238 Appendix B, SHA-1, shared secret "12345678901234567890". The RFC lists 8-digit codes; the last 6 are ours.
const RFC_SECRET = base32Encode(new TextEncoder().encode('12345678901234567890'))

describe('TOTP (RFC 6238)', () => {
  it('matches the published test vectors', async () => {
    expect(await totpAt(RFC_SECRET, 59_000)).toBe('287082')
    expect(await totpAt(RFC_SECRET, 1_111_111_109_000)).toBe('081804')
    expect(await totpAt(RFC_SECRET, 1_234_567_890_000)).toBe('005924')
    expect(await totpAt(RFC_SECRET, 2_000_000_000_000)).toBe('279037')
  })

  it('agrees with an independent implementation for random secrets and times', async () => {
    for (let i = 0; i < 25; i++) {
      const secret = newSecret()
      const t = 1_700_000_000_000 + Math.floor(Math.random() * 1e10)
      const other = new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 }).generate({ timestamp: t })
      expect(await totpAt(secret, t)).toBe(other)
    }
  })

  it('base32 round-trips', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(20))
    expect([...base32Decode(base32Encode(bytes))]).toEqual([...bytes])
  })

  it('accepts one step of clock drift and no more', async () => {
    const now = 1_700_000_000_000
    const at = (offset: number) => totpAt(RFC_SECRET, now + offset * 30_000)
    expect(await verifyTotp(RFC_SECRET, await at(-1), now, 0)).not.toBeNull()
    expect(await verifyTotp(RFC_SECRET, await at(1), now, 0)).not.toBeNull()
    expect(await verifyTotp(RFC_SECRET, await at(-2), now, 0)).toBeNull()
    expect(await verifyTotp(RFC_SECRET, await at(3), now, 0)).toBeNull()
  })

  it('never accepts a step at or before the last one used (replay)', async () => {
    const now = 1_700_000_000_000
    const code = await totpAt(RFC_SECRET, now)
    const matched = await verifyTotp(RFC_SECRET, code, now, 0)
    expect(matched).not.toBeNull()
    expect(await verifyTotp(RFC_SECRET, code, now, matched!)).toBeNull()
  })

  it('rejects malformed codes', async () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 345']) expect(await verifyTotp(RFC_SECRET, bad, 0, 0)).toBeNull()
  })
})
