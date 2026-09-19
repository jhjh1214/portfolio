import { createApp, type Bindings } from './app'
import { d1 } from './db'

// Cloudflare Workers entry. Static files are served by the platform (see wrangler.toml); only /api/* reaches this code.
interface WorkerEnv extends Omit<Bindings, 'DB'> {
  DB: Parameters<typeof d1>[0]
}
const app = createApp()

export default {
  fetch(req: Request, env: WorkerEnv, ctx: { waitUntil(p: Promise<unknown>): void; passThroughOnException(): void; props: unknown }) {
    return app.fetch(req, { ...env, DB: d1(env.DB) }, ctx)
  },
}
