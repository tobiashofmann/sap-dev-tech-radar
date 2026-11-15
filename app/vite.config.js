import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Dev-only: serves the sibling repo's generated radar/*.json files at fixed
// dev URLs, so `npm run dev` behaves like the production build (where this
// app's own compiled output and those files sit next to each other,
// directly under radar/, as static files).
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
      // the production relative path (./releases/<version>/data.json from
      // radar/, this app's own compiled output location) exactly, so
      // App.vue can build the same URL in both.
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

// Strips <docs>...</docs> custom blocks before @vitejs/plugin-vue ever sees
// them - those blocks hold free-form markdown read by `npm run docs:vue`
// (vue-docgen-cli, which reads the .vue files straight off disk, so this
// never touches what it sees), but Vite's Vue plugin has no loader for an
// unrecognized custom block and tries to parse its content as JS, which
// fails the build. enforce: 'pre' so this runs before vue()'s own parsing.
function stripDocsBlocks() {
  return {
    name: 'strip-docs-blocks',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.vue') || !code.includes('<docs>')) {
        return null
      }
      return code.replace(/<docs>[\s\S]*?<\/docs>/g, '')
    }
  }
}

// GitHub Pages has no server-side SPA fallback: a hard load (or reload) of
// a client-side route like <base>details/<id> is a 404 as far as Pages is
// concerned. Pages serves 404.html (from the site root) for any unknown
// path while keeping the requested URL in the address bar, so publishing
// a copy of index.html as 404.html boots the app there too, and App.vue's
// own syncViewFromLocation() then picks the view from that URL. Only
// correct together with an absolute `base` (see below) - index.html's
// asset URLs must not depend on which path it happened to be served for.
function spaFallback404() {
  let outDir
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const indexHtml = path.join(outDir, 'index.html')
      if (fs.existsSync(indexHtml)) {
        fs.copyFileSync(indexHtml, path.join(outDir, '404.html'))
      }
    }
  }
}

// The absolute path this app is served under, with a leading and trailing
// slash. Defaults to "/" (dev server, and the repo root's `npm run start`,
// which serves radar/ at the domain root); the Pages deploy workflow
// (.github/workflows/techradar.yml) sets RADAR_BASE_PATH to
// "/<repository>/", since a GitHub Pages project site lives under that
// subpath. Must be absolute, not "./": client-side routes like
// <base>details/<id> are hard-loadable, and relative asset URLs would then
// resolve against the wrong directory.
function basePath() {
  const raw = process.env.RADAR_BASE_PATH
  if (!raw) {
    return '/'
  }
  return '/' + raw.split('/').filter(Boolean).map((segment) => segment + '/').join('')
}

// https://vite.dev/config/
export default defineConfig({
  base: basePath(),
  plugins: [
    stripDocsBlocks(),
    vue({
      template: {
        compilerOptions: {
          // UI5 Web Components (<ui5-...>) are native custom elements, not Vue components
          isCustomElement: (tag) => tag.startsWith('ui5-')
        }
      }
    }),
    serveReleaseData(),
    spaFallback404()
  ],
  build: {
    // radar/ is this app's own publishable output directory (the old
    // vanilla-JS radar's files live under ../old/ instead now) - built
    // straight into it, alongside the sibling JSON files `npm run conv`
    // (in the repo root) writes there (radar/data.json, radar/releases/**).
    // emptyOutDir is explicitly false (Vite's own default here too, since
    // outDir is outside this project's root) so a build never wipes those
    // JSON siblings - only npm run conv (re)writes them, never this build.
    outDir: '../radar',
    emptyOutDir: false
  }
})
