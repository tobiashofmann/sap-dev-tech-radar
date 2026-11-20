# SDTR front end (scaffold)

Vue 3 + Vite, with native UI5 Web Components (Fiori Horizon theme, built in
by default) and D3 for the radar chart. See `design/DESIGN.md` and the plan
this was built from for the rationale behind this stack choice.

This is currently a scaffold/proof of concept (`src/App.vue`) showing the
three pieces work together in one Vite bundle - it does not yet implement
the real A1-G screens or fetch the generated radar data from `../radar/`.

Requires Node.js 24 LTS (Node 24 or newer, see `engines` in `package.json`; `.nvmrc` selects it for nvm/fnm).

```sh
npm install
npm run dev     # local dev server
npm run build   # production build -> ../radar/app (static files)
```
