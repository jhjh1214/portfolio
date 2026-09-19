import { motion } from 'motion/react'
import { GitPullRequest } from 'lucide-react'
import { useC } from '../store/content'
import { Tilt } from '../components/ui'

const COLOR: Record<string, string> = { MERGED: '#22c55e', APPROVED: '#06b6d4', CONTRIBUTED: '#8b5cf6' }

export function OpenSource() {
  const c = useC()
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {c.openSource.map((o, i) => {
        const col = COLOR[o.status.toUpperCase()] ?? '#94a3b8'
        return (
          <Tilt key={o.id}>
            <motion.a href={o.url} target="_blank" rel="noreferrer" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="panel panel-hover group block h-full p-5">
              <div className="flex items-center justify-between">
                <GitPullRequest size={22} style={{ color: col }} />
                <span className="chip" style={{ color: col }}>{o.status}</span>
              </div>
              <h3 className="font-display mt-5 text-2xl font-bold group-hover:text-grad">{o.name}</h3>
              <div className="text-[11px] text-accent/80">{o.repo}</div>
              <p className="mt-3 text-sm text-muted">{o.description}</p>
            </motion.a>
          </Tilt>
        )
      })}
    </div>
  )
}
