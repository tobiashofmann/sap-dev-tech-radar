import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Dev-only: serves the sibling repo's generated radar/*.json files at fixed
// dev URLs, so `npm run dev` behaves like the production build (where
// radar/app/ and those files sit next to each other as static files).
function serveReleaseData() {
  const files = {
    '/data.json': '../radar/data.json',
    '/releases-manifest.json': '../radar/releases/manifest.json'
  }

  function serveFile(res, filePath) {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404
        res.end(`${filePath} not found - run "npm run conv" in the repo root first.`)
        return
      }
      res.setHeader('Content-Type', 'application/json')
      res.end(data)
    })
  }

  return {
    name: 'serve-release-data',
    configureServer(server) {
      Object.entries(files).forEach(([url, relPath]) => {
        server.middlewares.use(url, (req, res) => serveFile(res, path.resolve(__dirname, relPath)))
      })
      // per-release archives (radar/releases/<version>/data.json), mirroring
      // the production relative path (../releases/<version>/data.json from
      // radar/app/) exactly, so App.vue can build the same URL in both.
      server.middlewares.use('/releases', (req, res, next) => {
        const match = req.url.match(/^\/([^/]+)\/data\.json(?:\?.*)?$/)
        if (!match) {
          next()
          return
        }
        serveFile(res, path.resolve(__dirname, '../radar/releases', match[1], 'data.json'))
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // UI5 Web Components (<ui5-...>) are native custom elements, not Vue components
          isCustomElement: (tag) => tag.startsWith('ui5-')
        }
      }
    }),
    serveReleaseData()
  ],
  build: {
    // production build lands inside the site this app will eventually be
    // wired into, so it ships as static files like everything else under radar/
    outDir: '../radar/app',
    emptyOutDir: true
  }
})
