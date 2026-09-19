import { useEffect, useState } from 'react'
import { OTPInput, type SlotProps } from 'input-otp'
import { Check, Mail } from 'lucide-react'
import { Modal } from './kit'
import { useUI } from '../store/ui'
import { useAuth } from '../store/auth'
import { play } from '../lib/sound'
import { cx } from '../lib/utils'

function Slot({ char, isActive }: SlotProps) {
  return (
    <div className={cx('grid h-14 w-11 place-items-center rounded-xl border-[1.5px] bg-surface font-display text-2xl font-bold transition-colors sm:w-12', isActive ? 'border-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_25%,transparent)]' : 'border-line')}>
      {char}
    </div>
  )
}

/** Passwordless sign-in: email, then a six-digit one-time code. Every sign-in sends a fresh code. */
export function AuthDialog() {
  const open = useUI((s) => s.auth)
  const setOpen = useUI((s) => s.setAuth)
  const { sendCode, verifyCode, session, displayName } = useAuth()
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => { if (!open) { setStep(session ? 'done' : 'email'); setCode(''); setErr(null) } }, [open, session])
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const send = async () => {
    setBusy(true); setErr(null)
    const e = await sendCode(email.trim(), name.trim() || undefined)
    setBusy(false)
    if (e) { setErr(e); play('error'); return }
    play('open'); setStep('code'); setCooldown(30)
  }
  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return
    setBusy(true); setErr(null)
    const e = await verifyCode(email.trim(), value)
    setBusy(false)
    if (e) { setErr(e); setCode(''); play('error'); return }
    play('win'); setStep('done')
  }

  return (
    <Modal open={open} onOpenChange={setOpen} title={step === 'done' ? "You're signed in" : step === 'code' ? 'Check your email' : 'Sign in or add friend'} description={step === 'email' ? "Enter your email and I'll send a one-time code. New here? This creates your account." : step === 'code' ? `I sent a 6-digit code to ${email}. It works once.` : undefined}>
      {step === 'email' && (
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void send() }}>
          <label className="block"><span className="label">Display name (optional)</span><input className="field mt-1" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="nickname" /></label>
          <label className="block"><span className="label">Email</span><input className="field mt-1" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" /></label>
          {err && <p role="alert" className="text-sm font-medium text-accent">{err}</p>}
          <button className="btn w-full" disabled={busy || !email}><Mail size={18} aria-hidden /> {busy ? 'Sending' : 'Send me a code'}</button>
          <p className="text-sm text-muted">No password. Your progress, achievements and theme are saved to your account.</p>
        </form>
      )}
      {step === 'code' && (
        <div className="grid gap-4">
          <div className="flex justify-center">
            <OTPInput
              maxLength={6} value={code} onChange={setCode} onComplete={verify} autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*"
              containerClassName="group flex items-center gap-2" aria-label="Six digit code"
              render={({ slots }) => <>{slots.map((s, i) => <Slot key={i} {...s} />)}</>}
            />
          </div>
          {err && <p role="alert" className="text-center text-sm font-medium text-accent">{err}</p>}
          <button className="btn w-full" disabled={busy || code.length !== 6} onClick={() => void verify(code)}>{busy ? 'Checking' : 'Verify code'}</button>
          <div className="flex items-center justify-between text-sm">
            <button className="font-semibold underline underline-offset-4 disabled:no-underline disabled:opacity-50" disabled={cooldown > 0 || busy} onClick={() => void send()}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Send a new code'}</button>
            <button className="font-semibold underline underline-offset-4" onClick={() => { setStep('email'); setErr(null); setCode('') }}>Use a different email</button>
          </div>
        </div>
      )}
      {step === 'done' && (
        <div className="grid gap-4">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full border-[1.5px] border-ink bg-primary text-on-primary"><Check size={24} /></span><div><div className="font-display text-lg font-bold">{displayName || 'Friend'}</div><div className="text-sm text-muted">{session?.user.email}</div></div></div>
          <p className="text-muted">Your progress is now synced. You can pick up on any device by signing in with the same email.</p>
          <button className="btn w-full" onClick={() => setOpen(false)}>Back to the profile</button>
        </div>
      )}
    </Modal>
  )
}
