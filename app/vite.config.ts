/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/**
 * After the build, list the files the service worker should cache on install (the app shell,
 * database, icons). Recipe photos are left out: they are cached as they are viewed.
 */
function precacheManifest(): Plugin {
  let outDir = 'dist'
  return {
    name: 'autorecipt-precache',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const files: string[] = []
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const path = join(dir, name)
          if (statSync(path).isDirectory()) walk(path)
          else files.push(relative(outDir, path).replace(/\\/g, '/'))
        }
      }
      walk(outDir)
      const keep = files.filter((f) => !f.startsWith('img/') && f !== 'sw.js' && f !== 'precache.json' && f !== 'db-version.json')
      writeFileSync(join(outDir, 'precache.json'), JSON.stringify({ version: Date.now(), files: ['./', ...keep] }, null, 1))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), precacheManifest()],
  // Relative paths so the built app works from any folder or static host.
  base: './',
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
