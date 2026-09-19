import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProgress } from '../store/progress'

export default function NotFound() {
  const unlock = useProgress((s) => s.unlock)
  useEffect(() => { unlock('lost') }, [unlock])
  return (
    <div className="grid min-h-svh place-items-center px-4 text-center">
      <div>
        <div className="font-display text-[8rem] font-extrabold leading-none text-accent glitch sm:text-[12rem]">404</div>
        <h1 className="mt-2 text-3xl font-bold">Lost in the mempool</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">This block was never mined. There is nothing at this address, but you did just find a hidden achievement.</p>
        <Link to="/" className="btn mt-8">Back to the profile</Link>
      </div>
    </div>
  )
}
