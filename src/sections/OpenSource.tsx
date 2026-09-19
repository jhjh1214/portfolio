import { ArrowUpRight, GitPullRequest } from 'lucide-react'
import { useC } from '../store/content'

const STATUS_DOT: Record<string, string> = { merged: '#8b5cf6', approved: '#2fbf71', contributed: '#3b82d6' }

export function OpenSource() {
  const c = useC()
  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {c.openSource.map((o) => (
        <li key={o.id}>
          <a href={o.url} target="_blank" rel="noreferrer" className="card lift group flex h-full flex-col p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl border-[1.5px] border-ink bg-raised"><GitPullRequest size={22} aria-hidden /></span>
              <span className="chip"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_DOT[o.status.toLowerCase()] ?? '#8a96a3' }} aria-hidden />{o.status}</span>
            </div>
            <h3 className="mt-5 text-2xl font-bold">{o.name}</h3>
            <p className="text-sm font-semibold text-muted">{o.repo}</p>
            <p className="mt-3 flex-1 text-muted">{o.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 font-semibold">View on GitHub <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden /></span>
          </a>
        </li>
      ))}
    </ul>
  )
}
