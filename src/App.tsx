import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Colophon from './pages/Colophon'
import { ThemeApplier } from './components/ThemeApplier'
import { Toaster } from './components/Toaster'
import { Terminal } from './components/Terminal'
import { Overlays } from './components/Overlays'
import { EasterEggs } from './components/EasterEggs'
import { CursorGlow } from './components/fx'
import { AmbientFx, BootSplash } from './components/Ambient'
import { ThemePicker } from './components/ThemePicker'
import { AuthDialog } from './components/AuthDialog'
import { CommandPalette } from './components/CommandPalette'
import { useFx } from './store/fx'
import { useAuth } from './store/auth'
import { useInbox, watchInbox } from './lib/messages'
import { Icon } from './lib/icons'
import { toast } from 'sonner'

const Admin = lazy(() => import('./admin/AdminApp'))

/** SVG filter behind the "liquid glass" refraction on floating surfaces (Chromium; others fall back to plain blur). */
function LiquidFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <filter id="liquid" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="2" seed="4" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="3" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="16" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}

function Shell() {
  const loc = useLocation()
  const fx = useFx((s) => s.fx)
  const owner = useAuth((s) => s.owner)
  const isAdmin = loc.pathname.startsWith('/admin')
  const preview = new URLSearchParams(location.search).has('preview')
  const live = !isAdmin && !preview

  useEffect(() => { void useAuth.getState().init() }, [])

  // Owner only: live inbox, with a toast for every new message wherever they are on the site.
  useEffect(() => {
    if (!owner) return
    useInbox.setState({
      onNew: (m) => toast(`New message from ${m.name}`, { description: m.body.slice(0, 80), icon: <Icon name="message" size={18} />, action: { label: 'Open', onClick: () => { location.hash = '#/admin' } } }),
    })
    return watchInbox()
  }, [owner])

  return (
    <div className={fx === 'flip' ? 'flip-page' : ''}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">Skip to content</a>
      <EasterEggs enabled={live} />
      {live && <AmbientFx />}
      {live && <CursorGlow />}
      {live && <BootSplash />}
      <Routes>
        <Route path="/" element={<Home preview={preview} />} />
        <Route path="/colophon" element={<Colophon />} />
        <Route path="/admin" element={<Suspense fallback={<div className="grid min-h-svh place-items-center text-muted">Loading backstage...</div>}><Admin /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {live && <Terminal />}
      {live && <CommandPalette />}
      {live && <ThemePicker />}
      {!preview && <AuthDialog />}
      <Overlays />
      <Toaster />
      <LiquidFilter />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ThemeApplier />
      <Shell />
    </HashRouter>
  )
}
