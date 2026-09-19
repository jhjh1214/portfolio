import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProgress } from '../store/progress'

export default function NotFound() {
  const unlock = useProgress((s) => s.unlock)
  useEffect(() => { unlock('lost') }, [unlock])
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <div className="font-display text-8xl font-bold text-grad glitch">404</div>
        <p className="mt-4 text-lg">Lost in the mempool.</p>
        <p className="mt-1 text-sm text-muted">This block was never mined. (Achievement unlocked, though.)</p>
        <Link to="/" className="btn btn-primary mt-8">Back to spawn</Link>
      </div>
    </div>
  )
}
