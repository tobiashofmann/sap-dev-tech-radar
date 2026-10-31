/*!
 * SBOM generation for this repo's two independently shippable units:
 * - DEV: the root project (convert.js/history.js/release-data.js/index.js
 *   plus its test suite) - nothing it produces ships as running code, it
 *   only writes JSON/HTML derived from definitions/**\/*.toml at build
 *   time, so every one of its dependencies (all already listed under
 *   devDependencies in package.json) is a dev dependency for SBOM
 *   purposes too.
 * - PRD: app/, the Vue app that's actually built and deployed to GitHub
 *   Pages (see CLAUDE.md's CI description) - only its production
 *   dependencies matter here, so app/'s own devDependencies (vite,
 *   playwright, @vitejs/plugin-vue) must be excluded.
 *
 * Uses npm's own built-in `npm sbom` (CycloneDX), available since npm 9 -
 * no extra dependency needed. The PRD side can't just pass `--omit dev`
 * to it, though: npm has a bug where a package required by both a prod
 * and a dev dependency (here, "vue" - a direct prod dependency of app/,
 * but also a peerDependency of the dev-only "@vitejs/plugin-vue") gets
 * dropped entirely instead of kept, because npm's arborist marks the one
 * shared, deduped node as dev-only if *any* of its dependent edges is dev,
 * even when another edge into it is a direct production dependency. So
 * instead this generates the full (non-omitted) SBOM and then filters it
 * down to the closure reachable from app/package.json's own
 * `dependencies` keys, walking the SBOM's own dependency graph - correct
 * regardless of where else a given package also happens to be required.
 * Copyright(c) 2026 Tobias Hofmann
 * Apache Licensed
 */
'use strict';

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = './sbom';

/**
 * Runs `npm sbom` in a given project directory and returns its parsed
 * CycloneDX output.
 * @param {string} cwd project directory to run `npm sbom` in
 * @returns {object} parsed CycloneDX BOM
 */
function runNpmSbom(cwd) {
  const raw = execFileSync('npm', ['sbom', '--sbom-format', 'cyclonedx'], { cwd, encoding: 'utf8' });
  return JSON.parse(raw);
}

/**
 * A CycloneDX bom-ref is "<name>@<version>" (scoped names keep their own
 * leading "@", so splitting on the *last* "@" is required).
 * @param {string} ref
 * @returns {string} the package name part of the ref
 */
function packageNameFromRef(ref) {
  return ref.slice(0, ref.lastIndexOf('@'));
}

/**
 * Filters a full CycloneDX bom down to the closure of components reachable
 * (via the bom's own "dependencies" graph) from a project's production
 * `dependencies` only - leaving out anything only reachable through a
 * devDependency edge, regardless of npm's own (buggy, see module doc)
 * --omit dev handling.
 * @param {object} bom full CycloneDX bom, as returned by runNpmSbom()
 * @param {string} packageJsonPath the project's package.json, for its `dependencies` keys
 * @returns {object} the same bom, with `components`/`dependencies` filtered in place
 */
function filterToProductionClosure(bom, packageJsonPath) {
  const prodNames = new Set(Object.keys(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).dependencies || {}));
  const dependsOnByRef = new Map(bom.dependencies.map(({ ref, dependsOn }) => [ref, dependsOn || []]));
  const rootRef = bom.metadata.component['bom-ref'];

  const closure = new Set();
  const queue = (dependsOnByRef.get(rootRef) || []).filter((ref) => prodNames.has(packageNameFromRef(ref)));
  while (queue.length > 0) {
    const ref = queue.pop();
    if (closure.has(ref)) {
      continue;
    }
    closure.add(ref);
    queue.push(...(dependsOnByRef.get(ref) || []));
  }

  bom.components = bom.components.filter((c) => closure.has(c['bom-ref']));
  bom.dependencies = bom.dependencies
    .filter(({ ref }) => ref === rootRef || closure.has(ref))
    .map(({ ref, dependsOn }) => ({
      ref,
      dependsOn: (dependsOn || []).filter((child) => closure.has(child))
    }));

  return bom;
}

/**
 * Writes a bom (already resolved to the shape it should be published in)
 * to sbom/<outFile>.
 * @param {object} bom
 * @param {string} outFile output filename under OUT_DIR
 */
function write(bom, outFile) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, outFile);
  fs.writeFileSync(outPath, JSON.stringify(bom, null, 2));
  console.log(`wrote ${outPath}`);
}

// DEV: root project, every dependency included (nothing is omitted -
// package.json only lists devDependencies here in the first place)
write(runNpmSbom('.'), 'dev.cdx.json');

// PRD: app/, production dependencies only (see module doc for why this
// filters the full bom itself rather than passing `npm sbom --omit dev`)
write(filterToProductionClosure(runNpmSbom('./app'), './app/package.json'), 'prd.cdx.json');
