import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import { ThemeApplier } from './components/ThemeApplier'
import { Toaster } from './components/Toaster'
import { HUD } from './components/HUD'
import { Terminal } from './components/Terminal'
import { Overlays } from './components/Overlays'
import { EasterEggs } from './components/EasterEggs'
import { useFx } from './store/fx'

const Admin = lazy(() => import('./admin/AdminApp'))

function Shell() {
  const loc = useLocation()
  const fx = useFx((s) => s.fx)
  const isAdmin = loc.pathname.startsWith('/admin')
  const preview = new URLSearchParams(location.search).has('preview')
  return (
    <div className={`scan min-h-screen ${fx === 'flip' ? 'flip-page' : ''}`}>
      <EasterEggs enabled={!isAdmin && !preview} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Suspense fallback={<div className="grid min-h-screen place-items-center text-muted">Loading backstage…</div>}><Admin /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAdmin && !preview && <HUD />}
      {!isAdmin && !preview && <Terminal />}
      <Overlays />
      <Toaster />
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
