/*!
 * publishes the legacy radar alongside the new app
 * Copyright(c) 2026 Tobias Hofmann
 * Apache Licensed
 */
'use strict';

import fs from 'node:fs';

// The legacy vanilla-JS radar lives in old/ (hand-maintained shell plus
// what index.js generates into it: config.json, html/*.html, releases/**,
// deprecated.html's table). Only radar/ is deployed to GitHub Pages, so
// to keep the legacy site reachable at <site>/old/index.html, old/ is
// copied to radar/old/ as part of `npm run conv`, right after index.js
// has (re)generated it.
//
// Everything inside old/ references its own files relatively (./config.json,
// js/..., ./html/<id>.html, ../bootstrap/...), so the copy works unchanged
// one directory level down, under whatever base path the site is served.
const SOURCE_DIR = './old';
const TARGET_DIR = './radar/old';

/**
 * Replaces radar/old/ with a fresh copy of old/. The previous copy is
 * removed first, so a detail page of a technology that no longer exists
 * doesn't linger in the published site.
 */
function publishOld() {
  if (!fs.existsSync(`${SOURCE_DIR}/index.html`)) {
    throw new Error(`${SOURCE_DIR}/index.html not found - run this from the repo root, after "node index.js"`);
  }
  fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  fs.cpSync(SOURCE_DIR, TARGET_DIR, { recursive: true });
  console.log(`copied ${SOURCE_DIR} -> ${TARGET_DIR}`);
}

publishOld();
