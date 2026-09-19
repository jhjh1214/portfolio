import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'
import { Check, Send, UserPlus } from 'lucide-react'
import { useC } from '../store/content'
import { useAuth } from '../store/auth'
import { useUI } from '../store/ui'
import { useProgress } from '../store/progress'
import { sendMessage } from '../lib/messages'
import { backendOn } from '../lib/supabase'
import { levelFromXp } from '../lib/level'
import { LinkIcon } from '../lib/icons'
import { play } from '../lib/sound'

const COUNTRIES: [CountryCode, string][] = [['MY', 'Malaysia (+60)'], ['SG', 'Singapore (+65)'], ['ID', 'Indonesia (+62)'], ['TH', 'Thailand (+66)'], ['CN', 'China (+86)'], ['JP', 'Japan (+81)'], ['AU', 'Australia (+61)'], ['GB', 'United Kingdom (+44)'], ['US', 'United States (+1)']]

const schema = z.object({
  name: z.string().trim().min(1, 'Tell me your name.').max(80, 'Keep the name under 80 characters.'),
  email: z.string().trim().email('Enter a valid email address so I can reply.'),
  country: z.string(),
  whatsapp: z.string().trim().optional(),
  body: z.string().trim().min(1, 'Write a message.').max(4000, 'Keep it under 4000 characters.'),
  company: z.string().max(0).optional(), // honeypot: real people leave this empty
}).superRefine((v, ctx) => {
  if (v.whatsapp) {
    const p = parsePhoneNumberFromString(v.whatsapp, v.country as CountryCode)
    if (!p?.isValid()) ctx.addIssue({ code: 'custom', path: ['whatsapp'], message: 'That number does not look valid for the selected country.' })
  }
})
type Form = z.infer<typeof schema>

function Err({ m }: { m?: string }) { return m ? <p role="alert" className="mt-1 text-sm font-medium text-accent">{m}</p> : null }

export default function Contact() {
  const c = useC()
  const session = useAuth((s) => s.session)
  const name = useAuth((s) => s.displayName)
  const signOut = useAuth((s) => s.signOut)
  const setAuth = useUI((s) => s.setAuth)
  const xp = useProgress((s) => s.xp)
  const [sent, setSent] = useState(false)
  const [fail, setFail] = useState<string | null>(null)
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { country: 'MY' } })

  useEffect(() => {
    if (session?.user.email) setValue('email', session.user.email)
    if (name) setValue('name', name)
  }, [session, name, setValue])

  const onSubmit = handleSubmit(async (v) => {
    setFail(null)
    const wa = v.whatsapp ? parsePhoneNumberFromString(v.whatsapp, v.country as CountryCode)?.number : undefined
    const err = await sendMessage({ name: v.name, email: v.email, whatsapp: wa, body: v.body })
    if (err) { setFail(err); play('error'); return }
    play('win'); setSent(true); reset({ country: v.country, name: v.name, email: v.email })
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="card p-6 sm:p-8">
        {!backendOn ? (
          <div>
            <h3 className="text-2xl font-bold">Messaging isn't connected yet</h3>
            <p className="prose-tight mt-2 text-muted">Until it is, the quickest way to reach me is through these.</p>
            <div className="mt-5 flex flex-wrap gap-3">{c.profile.links.map((l) => <a key={l.label} className="btn" href={l.url} target="_blank" rel="noreferrer"><LinkIcon name={l.icon} size={18} /> {l.label}</a>)}</div>
          </div>
        ) : sent ? (
          <div role="status" className="py-6">
            <span className="grid h-14 w-14 place-items-center rounded-full border-[1.5px] border-ink bg-primary text-on-primary"><Check size={28} /></span>
            <h3 className="mt-4 text-2xl font-bold">Message sent</h3>
            <p className="prose-tight mt-2 text-muted">Thanks. I'll reply by email{' '}or WhatsApp, whichever you gave me.</p>
            <button className="btn btn-soft mt-5" onClick={() => setSent(false)}>Send another</button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-label="Send me a message">
            <p className="prose-tight text-muted">{c.site.contactIntro}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="label">Your name</span><input className="field mt-1" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} /><Err m={errors.name?.message} /></label>
              <label className="block"><span className="label">Email</span><input className="field mt-1" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} {...register('email')} /><Err m={errors.email?.message} /></label>
            </div>
            <div>
              <span className="label">WhatsApp number (optional)</span>
              <div className="mt-1 grid grid-cols-[minmax(0,9.5rem)_1fr] gap-2 sm:grid-cols-[13rem_1fr]">
                <select className="field" aria-label="Country" {...register('country')}>{COUNTRIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                <input className="field" type="tel" autoComplete="tel-national" inputMode="tel" placeholder="12 345 6789" aria-label="WhatsApp number" aria-invalid={!!errors.whatsapp} {...register('whatsapp')} />
              </div>
              <Err m={errors.whatsapp?.message} />
            </div>
            <label className="block"><span className="label">Message</span><textarea className="field mt-1" aria-invalid={!!errors.body} {...register('body')} /><Err m={errors.body?.message} /></label>
            <input tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" {...register('company')} />
            {fail && <p role="alert" className="rounded-xl border-[1.5px] border-accent bg-raised p-3 text-sm font-medium">{fail}</p>}
            <div><button className="btn" disabled={isSubmitting}><Send size={18} aria-hidden /> {isSubmitting ? 'Sending' : 'Send message'}</button></div>
          </form>
        )}
      </div>

      <aside className="card flex flex-col p-6 sm:p-8">
        <h3 className="text-2xl font-bold">{session ? `Hi, ${name || 'friend'}` : 'Add me as a friend'}</h3>
        {session ? (
          <>
            <p className="mt-2 text-muted">You're signed in as {session.user.email}. Your XP, achievements, scores and theme are saved to your account (level {levelFromXp(xp)} right now).</p>
            <button className="btn btn-soft mt-auto w-fit" style={{ marginTop: '1.5rem' }} onClick={() => void signOut()}>Sign out</button>
          </>
        ) : (
          <>
            <p className="mt-2 text-muted">Sign in with just your email. I'll send a one-time code every time, so there is no password to remember. Your progress then follows you to any device.</p>
            <button className="btn mt-auto w-fit" style={{ marginTop: '1.5rem' }} disabled={!backendOn} onClick={() => setAuth(true)}><UserPlus size={18} aria-hidden /> {backendOn ? 'Sign in with email' : 'Not connected yet'}</button>
          </>
        )}
      </aside>
    </div>
  )
}
