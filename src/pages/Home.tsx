import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { useC } from '../store/content'
import type { SectionId } from '../types'
import { Nav, Dock } from '../components/Nav'
import { Hero } from '../sections/Hero'
import { SectionShell } from '../components/SectionShell'
import { Showcase } from '../sections/Showcase'
import { Projects } from '../sections/Projects'
import { Journey } from '../sections/Journey'
import { Achievements } from '../sections/Achievements'
import { OpenSource } from '../sections/OpenSource'
import { Skills } from '../sections/Skills'
import { AlbumSection } from '../sections/Album'
import { Arcade } from '../sections/Arcade'
import { Footer } from '../sections/Footer'
import { useMediaQuery } from '../components/kit'

// The form pulls in validation and phone-number libraries, so it loads on demand.
const Contact = lazy(() => import('../sections/Contact'))

const BODY: Record<SectionId, () => ReactNode> = {
  showcase: () => <Showcase />,
  projects: () => <Projects />,
  journey: () => <Journey />,
  achievements: () => <Achievements />,
  opensource: () => <OpenSource />,
  skills: () => <Skills />,
  album: () => <AlbumSection />,
  arcade: () => <Arcade />,
  contact: () => <Suspense fallback={<div className="card h-96" aria-busy />}><Contact /></Suspense>,
}

export default function Home({ preview = false }: { preview?: boolean }) {
  const c = useC()
  const visible = c.sections.filter((s) => s.visible && BODY[s.id])
  const paged = useMediaQuery('(max-width: 1023px)')

  // On phones and tablets each section is a page: swiping snaps to the next tab.
  useEffect(() => {
    if (!paged || preview) return
    document.documentElement.classList.add('snap')
    return () => document.documentElement.classList.remove('snap')
  }, [paged, preview])

  return (
    <>
      {!preview && <Nav />}
      <main id="main">
        <Hero />
        {visible.map((s, i) => (
          <SectionShell key={s.id} cfg={s} index={i}>{BODY[s.id]()}</SectionShell>
        ))}
      </main>
      <Footer />
      {!preview && <Dock />}
    </>
  )
}
