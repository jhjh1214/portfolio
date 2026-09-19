import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base + HashRouter: works on GitHub Pages (user or project site) and any static host.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (/node_modules[\/](three|@react-three)/.test(id) ? 'three' : undefined),
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
