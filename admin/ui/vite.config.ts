import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev: `npm run dev` here + `python admin/server.py` (API on 8787).
// Prod: `npm run build`, then the Python server serves dist/ itself.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5174,
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
})
