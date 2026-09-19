export interface MailEnv {
  BREVO_API_KEY?: string
  MAIL_FROM?: string
  MAIL_FROM_NAME?: string
  DEV_INBOX?: string
}
export interface Mail { to: string; subject: string; text: string; html: string }

/** Demo only: what "would have been sent", so a developer can read sign-in codes without an email provider. */
export const devInbox: (Mail & { at: number })[] = []

export const mailConfigured = (env: MailEnv) => !!(env.BREVO_API_KEY && env.MAIL_FROM) || env.DEV_INBOX === '1'

/** Sends through Brevo's HTTP API (free tier, works from Workers, needs a verified sender address rather than a domain). */
export async function sendMail(env: MailEnv, m: Mail): Promise<boolean> {
  if (env.DEV_INBOX === '1') {
    devInbox.push({ ...m, at: Date.now() })
    if (devInbox.length > 50) devInbox.shift()
    console.log(`[mail] to ${m.to}: ${m.subject}\n${m.text}`)
    return true
  }
  if (!env.BREVO_API_KEY || !env.MAIL_FROM) return false
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { email: env.MAIL_FROM, name: env.MAIL_FROM_NAME || 'Portfolio' }, to: [{ email: m.to }], subject: m.subject, textContent: m.text, htmlContent: m.html }),
    })
    return r.ok
  } catch {
    return false
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const codeMail = (to: string, code: string): Mail => ({
  to,
  subject: 'Your sign-in code',
  text: `Your sign-in code is ${code}\n\nIt works once and expires in 10 minutes. If you did not ask for it, ignore this email.`,
  html: `<h2>Your sign-in code</h2><p style="font-size:28px;letter-spacing:6px;font-family:monospace"><strong>${code}</strong></p><p>It works once and expires in 10 minutes. If you did not ask for it, ignore this email.</p>`,
})

export const messageMail = (to: string, m: { name: string; email: string; whatsapp: string | null; body: string }): Mail => ({
  to,
  subject: `New message from ${m.name}`.slice(0, 100),
  text: `${m.name} <${m.email}>${m.whatsapp ? `\nWhatsApp: ${m.whatsapp}` : ''}\n\n${m.body}`,
  html: `<p><b>${esc(m.name)}</b> &lt;${esc(m.email)}&gt;${m.whatsapp ? `<br>WhatsApp: ${esc(m.whatsapp)}` : ''}</p><p style="white-space:pre-wrap">${esc(m.body)}</p>`,
})
