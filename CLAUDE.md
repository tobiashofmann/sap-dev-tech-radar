# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The SAP development tech radar (SDTR): a static site that visualizes SAP technology recommendations across 4 quadrants (Tools, Frameworks, UI, Technology) and 4 rings (ADOPT, USE, HOLD, STOP), plus a DEPRECATED state. It is content-driven — the vast majority of changes to this repo are adding/editing TOML entries, not touching code.

## Commands

```sh
npm i              # install dependencies
npm run conv        # convert definitions/**/*.toml -> old/config.json + old/html/*.html + old/deprecated.html + old/releases/** + radar/data.json + radar/releases/**
npm run start        # browser-sync serve ./radar with live reload, for previewing the new app locally (needs `cd app && npm run build` first)
npm run lint          # lint:js + lint:html + lint:toml
npm run lint:js       # eslint convert.js index.js history.js release-data.js
npm run lint:toml     # eslint definitions/**/*.toml
npm run lint:html     # eslint old/**/*.html
```

There is no test suite. Validation is: run `npm run conv` and confirm it completes without errors (a malformed TOML file throws and is logged, but does not stop the rest of the batch), then `npm run start` (or `cd old && npx browser-sync . -w` for the legacy site) to visually check the radar and the entry's detail page.

To check a single definition file without converting everything, just run `npm run conv` — it globs all of `definitions/**/*.toml` each time; there's no per-file conversion entry point.

## Architecture: TOML -> JSON/HTML pipeline

This is the core thing to understand before touching anything in `index.js` or `convert.js`:

1. **Source of truth**: `definitions/<quadrant>/<tech>.toml` — one file per technology, quadrant is a subdirectory (`frameworks`, `tools`, `ui`, `technology`). Format is documented in `template/info.toml` and `CONTRIBUTING.md`.
2. **`index.js`** globs all definition TOML files and parses each with `js-toml` in a first pass (needed so `related`-id lookups and release history can see the whole set), then derives per-technology release history via `history.js`, then for each entry calls `createCONFIG` and `createHTML` from `convert.js`. It finishes by calling `createDeprecatedPage`.
3. **`history.js`** derives each technology's ring-per-release history straight from git tags (no hand-maintained changelog field): it reads `definitions/**/*.toml` *as it existed at each release tag* (`git show <tag>:<path>`, `git ls-tree` to enumerate files at that tag), and from that both (a) builds a forward-only ring history per technology, validated by `validateForwardOnly` (throws if a ring regresses), and (b) reconstructs and archives a `config.json`-equivalent snapshot per past release under `old/releases/<version>/config.json` (plus `old/releases/manifest.json`, the ordered list of known release versions) — this is the legacy D3 site's own release archive. This is reconstructed from `definitions/` rather than copied from a historical `old/config.json`, because `old/config.json` is gitignored and was never actually committed at any tag.
4. **`convert.js`** does the actual transformation (all for the legacy vanilla-JS site, under `old/`):
   - `createCONFIG` — if `config.ring === "DEPRECATED"`, the entry is pushed to an in-memory `deprecatedList` instead of the radar (after validating `since` matches `YYYY-06`/`YYYY-12`); otherwise it's mapped (quadrant/ring names -> the integer indices the D3 radar visualization expects, see `getQuadrant`/`getRing`/`json2config`) and appended to `old/config.json`. **This file is rewritten in full on every single TOML file processed** (`writeConfigJson2File` is called inside the per-file loop), so `old/config.json` is a fully generated build artifact, not something to hand-edit.
   - `createHTML` — renders `template/template.html` for each entry by replacing `%placeholder%` tokens (title, description, reason, recommendation, support, quadrant, ring, trend, trend arrow icon, reference links, ring-based bootstrap color class, resolved `related` entries, derived release history) and writes it to `old/html/<filename>.html`. `recommendation` falls back to `reason` when the TOML doesn't set it.
   - `createDeprecatedPage` — regex-replaces the `<tbody id="deprecated-table-body">` block in `old/deprecated.html` in place with rows built from `deprecatedList`. Like `config.json`, the `<tbody>` content of `old/deprecated.html` is generated — only edit the surrounding page shell by hand.
5. **`release-data.js`** (called from `index.js` right after `history.js`) writes `radar/data.json`: one enriched JSON for the *current* (not-yet-released) state - every entry's full `[page]`/`[config]` data (including resolved `related` and that entry's `releaseHistory`) plus a `changes` block (new / moved-to-next-ring / deprecated, diffed against the most recently tagged release via `history.js`'s derived history). This is the file the new `app/` Vue front end fetches; it's a separate artifact from `old/config.json` (which stays in its existing minimal int-indexed shape for the legacy D3 vanilla site) so neither consumer had to change shape for the other. It also archives a `data.json`-equivalent per past release under `radar/releases/<version>/data.json` (plus its own `radar/releases/manifest.json`) — same enriched shape, built the same git-show-at-each-tag way `history.js` builds `old/config.json`'s history, so the new app can render an archived release with its existing components. A release's file, once written, is never rewritten on later runs (immutable once published), same as `old/config.json`'s per-release archive.
6. **`old/`** is the legacy, publishable vanilla-JS site: `old/index.html` loads `old/js/d3.v4.min.js` + `old/js/radar.js` (the D3 "build-your-own-radar" visualization) and fetches `old/config.json` for entries. `old/html/*.html` are the generated per-technology detail pages linked from the radar. `old/releases/<version>/config.json` are the reconstructed past-release snapshots described above. `old/css/radar.css` and `old/bootstrap/` hold styling/icons.
7. **`app/`** is a separate Vue 3 + Vite + UI5 Web Components + D3 project (its own `package.json`) building the redesigned UI from `design/DESIGN.md`. `npm run build` there outputs straight to `radar/` (its `index.html` + `assets/`, no nested subfolder) — the new app's own publishable site, sitting alongside the sibling JSON files `npm run conv` writes there (`radar/data.json`, `radar/releases/**`). It implements the Radar page (A1-A3/F/G), Detail page (B), a Privacy Policy page and a working release selector (fetches `radar/releases/<version>/data.json` to render an archived release) by fetching those files; the Changes page (D) isn't built yet. In dev (`npm run dev` inside `app/`), a small Vite middleware (`vite.config.js`) serves the sibling repo's `radar/*.json` files at fixed dev URLs so dev behaves like the production layout.
8. **CI** (`.github/workflows/techradar.yml`) runs `npm run conv`, then installs and builds `app/` (`npm ci && npm run build` with `working-directory: ./app`), then deploys `./radar` to GitHub Pages, triggered on published releases (not on every push to main). This is the only thing that actually builds+publishes the live site; CI does not commit anything back to the repo. Note `app/`'s build only outputs the new app; the legacy `old/` site is not deployed by this workflow today (CI's `./radar` upload doesn't include it) — flagging this as a gap, not something resolved here.

Implication: after editing or adding any `definitions/**/*.toml` file, always run `npm run conv` before previewing or committing. `old/config.json`, `old/html/*.html`, `old/releases/**`, `radar/data.json`, and `radar/releases/**` are build output that must stay in sync with `definitions/` — but note they are **gitignored** (`.gitignore`: `html/`, `old/config.json`, `old/releases/`, `radar/`), i.e. NOT committed to the repo, despite being present on disk after a local build. Only `old/deprecated.html` (its shell is hand-edited, its `<tbody>` generated) and `old/index.html`/`old/js/*` etc. are tracked. Each contributor/CI regenerates the rest locally via `npm run conv` (and, for `radar/`'s app bundle, `cd app && npm run build`).

## Content model (TOML definitions)

Each file under `definitions/<quadrant>/` has three tables (see `template/info.toml` and a real example like `definitions/frameworks/abapcloud.toml`):

- `[page]` — `title`, `description` (HTML allowed, e.g. `<br/>`), `reason`, `recommendation` (optional short "what to do" sentence, distinct from `reason`; falls back to `reason` when omitted), `support`.
- `[links]` — one or more `name = "url"` pairs; keys become link labels in the detail page. At least one link is required per `CONTRIBUTING.md`. An optional `"Ring proposal & vote"` key is a documented convention for linking the PR/issue that proposed the current ring.
- `[config]` — `label`, `ring` (`ADOPT`/`USE`/`HOLD`/`STOP`/`DEPRECATED`), `quadrant` (`Tools`/`Frameworks`/`UI`/`Technology`, must match the subdirectory), `active`, `moved`, `trend` (`positive`/`stable`/`negative`, ignored for DEPRECATED, required), `related` (optional array of other entries' filenames, for the detail page's "related technologies" list), `since` (only when `ring = "DEPRECATED"`, format `YYYY-06`/`YYYY-12`, e.g. `"2026-06"` — validated by `convert.js`).

File naming: lowercase, no spaces, must be unique and identify the technology (this filename becomes both the generated HTML filename and effectively the entry's id).

## Process context (not code, but shapes what a "correct" PR looks like)

- The radar is versioned (`YYYY-MM`, zero-padded month, e.g. `2026-06`) and published a few times a year via the process in `PROCESS.md`: proposals are collected, quality-checked, then voted on (SAP employees cannot vote — this is what keeps the radar vendor-independent) before merging to `main`. Each release is tagged in git with that same version string — `history.js` reads those tags directly to derive release history, so tagging a release is the only step needed for `npm run conv` to pick it up (older tags used `YEAR.COUNTER` dot notation, e.g. `2025.6`; both forms are recognized).
- `CONTRIBUTING.md` is the authority for what a valid content PR contains: use the template for new entries, edit the existing file in place for changes (never fork a duplicate TOML for the same technology), and describe *why* the change was made in the PR description.
