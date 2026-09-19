import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const CREDITS: { group: string; items: [string, string, string][] }[] = [
  { group: 'Sound', items: [['Interface Sounds', 'Kenney (kenney.nl), CC0 1.0. Played with Howler.js.', 'https://kenney.nl/assets/interface-sounds']] },
  { group: 'Type', items: [
    ['Bricolage Grotesque', 'Mathieu Triay, SIL Open Font License. Display.', 'https://fonts.google.com/specimen/Bricolage+Grotesque'],
    ['Instrument Sans', 'Instrument, SIL Open Font License. Text.', 'https://fonts.google.com/specimen/Instrument+Sans'],
    ['JetBrains Mono', 'JetBrains, SIL Open Font License. Console.', 'https://www.jetbrains.com/lp/mono/'],
  ] },
  { group: 'Icons', items: [
    ['Lucide', 'ISC licence. Interface and achievement icons.', 'https://lucide.dev'],
    ['Simple Icons', 'CC0. Technology marks.', 'https://simpleicons.org'],
  ] },
  { group: 'Interface libraries', items: [
    ['Radix UI', 'Accessible dialog, tabs, tooltip and switch primitives.', 'https://www.radix-ui.com'],
    ['Vaul', 'Bottom sheets on phones.', 'https://vaul.emilkowal.ski'],
    ['cmdk', 'The command menu.', 'https://cmdk.paco.me'],
    ['input-otp', 'The one-time code field.', 'https://input-otp.rodz.dev'],
    ['Sonner', 'Toasts.', 'https://sonner.emilkowal.ski'],
    ['Motion', 'Animation.', 'https://motion.dev'],
    ['three.js and react-three-fiber', 'The 3D circuit board.', 'https://docs.pmnd.rs/react-three-fiber'],
  ] },
  { group: 'Data and auth', items: [['Supabase', 'Postgres, passwordless email sign-in and row-level security.', 'https://supabase.com']] },
]

export default function Colophon() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link to="/" className="btn btn-soft btn-sm"><ArrowLeft size={16} aria-hidden /> Back</Link>
      <h1 className="mt-8 text-5xl font-extrabold">Credits</h1>
      <p className="prose-tight mt-3 text-muted">This site stands on other people's open work. Thank you to everyone below.</p>
      {CREDITS.map((g) => (
        <section key={g.group} className="mt-10">
          <h2 className="text-2xl font-bold">{g.group}</h2>
          <ul className="mt-3 divide-y-[1.5px] divide-line">
            {g.items.map(([name, note, url]) => (
              <li key={name} className="flex flex-wrap items-baseline justify-between gap-x-6 py-3">
                <a href={url} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">{name}</a>
                <span className="text-muted">{note}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
