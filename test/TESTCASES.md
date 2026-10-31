# Test Overview

This document describes what is tested in this repository today, with which frameworks,
and lists, per area, a table of which function/component is covered by which test — and
what's still missing.

## What is tested?

Testing today covers the **TOML → JSON/HTML conversion pipeline**
(`convert.js`, `history.js`, `release-data.js`, plus `index.js`'s orchestration of them):
the pure functions, largely free of filesystem side effects, that translate TOML data into
the legacy D3 config, the generated detail pages, and the Vue app JSON (`radar/data.json`);
and, for `index.js` itself, an end-to-end run against a fixture `definitions/` directory in
an isolated temp repo, verifying the actual files it writes.

**Not tested**: the Vue app under `app/` (neither unit, component, nor E2E tests), and the
MCP server under `mcp/`.

## What is it tested with?

- **[`node:test`](https://nodejs.org/api/test.html)** + **`node:assert/strict`** — Node's
  built-in test runner, run via `npm run test` (`node --test`). Tests live under
  `test/*.test.js`, with shared fixtures in `test/fixtures.js`.
- **`c8`** — code coverage for the tests above (`npm run test:coverage`).
- **`eslint`** (+ `eslint-plugin-html`, `eslint-plugin-toml`) — linting, not a test framework
  in the strict sense, but part of quality assurance (`npm run lint`).
- For **`app/`** (Vue 3) and **`mcp/`** (TypeScript MCP server), **no test framework is set
  up**. `app/package.json` includes `playwright` as a devDependency, but without a
  `playwright.config.*`, without test files, and without an npm script for it — the
  dependency is currently unused.

---

## Conversion (`convert.js` / `history.js` / `release-data.js` / `index.js`)

| Use case | File | Function | Covered by | Status |
|---|---|---|---|---|
| Convert TOML | convert.js | `json2config()` | `convert.test.js` — "json2config() - one reference per quadrant/ring" (all 4 quadrant/ring combinations) | ✅ present |
| Convert TOML | convert.js | `createCONFIG()` — validation | `convert.test.js` — invalid ring, invalid quadrant, invalid `since`, valid DEPRECATED case | ✅ present |
| Convert TOML | convert.js | `createCONFIG()` — happy path (valid non-DEPRECATED entry, `old/config.json` is written) | — | ❌ missing |
| Convert TOML | convert.js | `createHTML()` / `conv2html()` (incl. internal helpers `renderRelated`, `renderReleaseHistory`, `getReplaceColor`, `replacePlaceholder`, `loadHtmlTemplate`, `writeHtmlToFile`) | — | ❌ missing |
| Convert TOML | convert.js | `createDeprecatedPage()` | — | ❌ missing |
| Convert TOML | index.js | End-to-end run (`node index.js` against fixture `definitions/`, checking the generated artifacts `old/config.json`, `old/html/*.html`, `old/deprecated.html`, `radar/data.json`) | `index.test.js` — "index.js: end-to-end run against a fixture definitions/ directory" | ✅ present |
| Build history info | history.js | `normalizeCase()` | `history.test.js` — "normalizeCase()" | ✅ present |
| Build history info | history.js | `normalizeParsedConfig()` | `history.test.js` — "normalizeParsedConfig()" | ✅ present |
| Build history info | history.js | `validateForwardOnly()` | `history.test.js` — "validateForwardOnly()" | ✅ present |
| Build history info | history.js | `getFileAtTag()` | `history.test.js` — "getFileAtTag() (reads this repo's real git history, read-only)" | ✅ present |
| Build history info | history.js | `listDefinitionFilesAtTag()` | `history.test.js` — "listDefinitionFilesAtTag() (reads this repo's real git history, read-only)" | ✅ present |
| Build history info | history.js | `deriveAndArchiveHistory()` (main orchestration, writes `old/releases/**`) | `history.test.js` — "deriveAndArchiveHistory() (...; fs mocked so nothing is actually written)" | ✅ present |
| Find and set release dates | history.js | `getReleaseTags()` | `history.test.js` — "getReleaseTags() (reads this repo's real git tags, read-only)" | ✅ present |
| Find and set release dates | release-data.js | `lastChangedRelease()` | `release-data.test.js` — "lastChangedRelease()" | ✅ present |
| Find and set release dates | release-data.js | `computeChanges()` | `release-data.test.js` — "computeChanges()" (new/moved/deprecated classification, sorting) | ✅ present |
| Build app release data | release-data.js | `buildEntry()` | `release-data.test.js` — "buildEntry() - one reference per quadrant/ring, plus deprecated" + tests for `recommendation` fallback, `since`, `related` | ✅ present |
| Build app release data | release-data.js | `resolveRelated()` | `release-data.test.js` — "resolveRelated()" | ✅ present |
| Build app release data | release-data.js | `writeReleaseData()` (writes `radar/data.json`) | `release-data.test.js` — "writeReleaseData()" | ✅ present |
| Build app release data | release-data.js | `deriveAndArchiveReleaseData()` (writes `radar/releases/**`) | `release-data.test.js` — "deriveAndArchiveReleaseData() (...; fs mocked so nothing is actually written)" | ✅ present |

---

## Vue app (`app/`)

| Use case | Area/File | Kind of test | Status |
|---|---|---|---|
| Open app | `app/src/ringColors.js` | Unit | ❌ missing |
| Open app | `app/src/trendIcons.js` | Unit | ❌ missing |
| Open app | `app/src/radarLayout.js` | Unit | ❌ missing |
| Open app | `App.vue` | Component | ❌ missing |
| Open app | `RadarPage.vue` | Component | ❌ missing |
| Open app | `RingPill.vue` | Component | ❌ missing |
| Open app | Golden path: radar overview renders all entries/quadrants/rings | E2E | ❌ missing |
| Filter technologies | Golden path: filtering by quadrant/ring | E2E | ❌ missing |
| Find a technology / view technology details | `app/src/sanitize.js` | Unit | ❌ missing |
| Find a technology / view technology details | `DetailPage.vue` | Component | ❌ missing |
| Find a technology / view technology details | Golden path: clicking an entry → detail page | E2E | ❌ missing |
| View changes and past releases | `ChangesPage.vue` | Component | ❌ missing |
| View changes and past releases | Golden path: release selector loads an archived release (`radar/releases/<version>/data.json`) | E2E | ❌ missing |
| View deprecated technologies | `DeprecatedPage.vue` | Component | ❌ missing |
| Get info about the app | `AboutPage.vue` | Component | ❌ missing |
| Get info about the app | `PrivacyPage.vue` | Component | ❌ missing |
| Get info about the app | Golden path: visiting the About page / Privacy page | E2E | ❌ missing |
| (test infrastructure, no specific use case) | Test tooling: unit/component test framework (e.g. `vitest` + `@vue/test-utils`) | Setup | ❌ missing (not installed) |
| (test infrastructure, no specific use case) | Test tooling: Playwright configuration (`playwright.config.*`, npm script) | Setup | ❌ missing (dependency present, but not set up) |

---

## Linting

| Area | Covered by script | Status |
|---|---|---|
| `convert.js`, `index.js`, `history.js`, `release-data.js`, `test/*.js` | `npm run lint:js` | ✅ present |
| `definitions/**/*.toml` | `npm run lint:toml` | ✅ present |
| `old/**/*.html` (legacy site) | `npm run lint:html` | ✅ present |
| `app/src/**/*.js` + `*.vue`, `app/index.html` | — | ❌ missing (no ESLint configuration for Vue/`app/`) |
| `mcp/src/**/*.ts` | — | ❌ missing (no ESLint configuration for TypeScript) |

---

## Other / cross-cutting gaps

| Topic | Status/Description |
|---|---|
| MCP server tests (`mcp/src/format.ts`, `data.ts`, `tools/getTechnology.ts`, `tools/listTechnologies.ts`, `tools/getChanges.ts`, `index.ts`) | ❌ missing — no test framework set up in `mcp/package.json` |
| CI runs tests/lint | ❌ missing — `.github/workflows/techradar.yml` only runs `npm run conv` and the `app` build; `npm run lint` and `npm run test` only run locally via the `prestart` script, not in CI |
| `index.js` integration test | ✅ present (see the Conversion table) |
| Coverage reporting for `app/` and `mcp/` | ❌ missing — `c8` only runs against the top-level conversion tests |
