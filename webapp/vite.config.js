import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

// Resolve @freesewing/<name> to the monorepo workspace source (packages/, designs/, plugins/)
const freesewingWorkspaces = {
  name: 'freesewing-workspaces',
  enforce: 'pre',
  async resolveId(id, importer, opts) {
    const m = id.match(/^@freesewing\/([^/]+)$/)
    if (!m) {
      // third-party imports from monorepo sources resolve against webapp/node_modules
      if (importer && !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0') && !importer.startsWith(here)) {
        return this.resolve(id, path.join(here, 'package.json'), { ...opts, skipSelf: true })
      }
      return null
    }
    for (const dir of ['packages', 'plugins', 'designs']) {
      const entry = path.join(root, dir, m[1], 'src', 'index.mjs')
      if (fs.existsSync(entry)) return entry
    }
    return null
  },
}

export default defineConfig({
  base: './',
  plugins: [freesewingWorkspaces],
  server: { host: true, fs: { allow: [root] }, allowedHosts: true },
  worker: { format: 'es', plugins: () => [freesewingWorkspaces] },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
})
