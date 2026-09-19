import type { ReactNode } from 'react'
import { useC } from '../store/content'
import type { SectionId } from '../types'
import { Nav } from '../components/Nav'
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

const BODY: Record<SectionId, () => ReactNode> = {
  showcase: () => <Showcase />,
  projects: () => <Projects />,
  journey: () => <Journey />,
  achievements: () => <Achievements />,
  opensource: () => <OpenSource />,
  skills: () => <Skills />,
  album: () => <AlbumSection />,
  arcade: () => <Arcade />,
}

export default function Home() {
  const c = useC()
  const visible = c.sections.filter((s) => s.visible && BODY[s.id])
  return (
    <>
      <Nav />
      <main className="overflow-x-clip">
        <Hero />
        {visible.map((s, i) => (
          <SectionShell key={s.id} cfg={s} index={i}>{BODY[s.id]()}</SectionShell>
        ))}
      </main>
      <Footer />
    </>
  )
}
