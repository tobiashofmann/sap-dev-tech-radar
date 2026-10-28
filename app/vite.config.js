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
  return {
    name: 'serve-release-data',
    configureServer(server) {
      Object.entries(files).forEach(([url, relPath]) => {
        server.middlewares.use(url, (req, res) => {
          const filePath = path.resolve(__dirname, relPath)
          fs.readFile(filePath, (err, data) => {
            if (err) {
              res.statusCode = 404
              res.end(`${relPath} not found - run "npm run conv" in the repo root first.`)
              return
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          })
        })
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
