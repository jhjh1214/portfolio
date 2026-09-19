import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Cloudflare serves dist/_headers with every static file. Same policy the local demo server applies.
const securityHeaders = () => ({
  name: 'security-headers',
  closeBundle() {
    const { policy } = JSON.parse(readFileSync(resolve(__dirname, 'server/csp.json'), 'utf8'))
    writeFileSync(resolve(__dirname, 'dist/_headers'), `/*
  Content-Security-Policy: ${policy}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`)
  },
})

// Relative base + HashRouter: works on GitHub Pages (user or project site) and any static host.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), securityHeaders()],
  // `npm run server` in another terminal, then `cross-env VITE_API_URL=same-origin vite` gives hot reload with the real API.
  server: { proxy: { '/api': 'http://localhost:8787' } },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (/node_modules[\/](three|@react-three)/.test(id) ? 'three' : undefined),
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'server/test/**/*.test.ts'] },
})
