/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { seo } from './scripts/seo.ts'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

/** Short commit of this build: Vercel provides it; locally ask git; empty if neither works. */
function commit(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

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
      // Not precached: photos (cached as viewed), source maps, the per-page SEO copies of
      // index.html (the app renders every route from index.html), crawler files.
      const skip = new Set(['sw.js', 'precache.json', 'db-version.json', 'index.html', 'robots.txt', 'sitemap.xml'])
      const keep = files.filter((f) => !f.startsWith('img/') && !f.endsWith('.map') && !f.endsWith('.html') && !skip.has(f))
      writeFileSync(join(outDir, 'precache.json'), JSON.stringify({ version: Date.now(), files: ['/', ...keep.map((f) => `/${f}`)] }, null, 1))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), seo(), precacheManifest()],
  // Real paths (/recipe/pho-bo), so assets are referenced from the site root.
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commit()),
  },
  build: {
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
