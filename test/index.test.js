import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// index.js is a top-level orchestration script (no exports, runs
// immediately on import and writes real files relative to process.cwd()),
// so it can't be unit-tested by importing it. Instead this spins up an
// isolated fixture directory (just a small definitions/ set, the HTML
// shells it reads, and the output dirs it writes into) and runs the real
// ./index.js against it as a subprocess with that directory as cwd, then
// inspects the artifacts it wrote.
//
// The real index.js (not a copy of it) is run on purpose: index.js's own
// relative imports of convert.js/history.js/release-data.js resolve
// against its *own* file location regardless of cwd, so the sibling
// modules don't need to be copied or node_modules symlinked in - and,
// since c8 attributes a subprocess's V8 coverage back to source by file
// path, running the real file (instead of a copy that's deleted once the
// test finishes) is also what lets `npm run test:coverage` count this
// test's coverage of index.js at all.

let rootDir;

const FIXTURE_ADOPT_TOML = `
[page]
title = "Fixture UI Adopt"
description = "Fixture technology for the index.js end-to-end test."
reason = "Covers a live (non-deprecated) entry with a related id."
support = "Supported"

[links]
Homepage = "https://example.com/fixture-ui-adopt"

[config]
label = "FxUI"
ring = "ADOPT"
quadrant = "UI"
active = true
moved = 0
trend = "positive"
related = ["fixture-tech-deprecated"]
`;

const FIXTURE_DEPRECATED_TOML = `
[page]
title = "Fixture Technology Deprecated"
description = "Fixture technology for the index.js end-to-end test."
reason = "Covers a DEPRECATED entry (deprecated.html + no old/config.json entry)."
support = "Superseded"

[links]
Homepage = "https://example.com/fixture-tech-deprecated"

[config]
label = "FxTechDep"
ring = "DEPRECATED"
quadrant = "Technology"
active = true
moved = 0
trend = "stable"
since = "2026-06"
`;

before(() => {
  const repoRoot = process.cwd();
  rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdtr-index-e2e-'));

  // convert.js's HTML rendering needs the real template
  fs.mkdirSync(path.join(rootDir, 'template'), { recursive: true });
  fs.cpSync(path.join(repoRoot, 'template/template.html'), path.join(rootDir, 'template/template.html'));

  // old/deprecated.html's hand-authored shell, and old/html/ pre-created
  // (convert.js writes into it but never creates it itself - same
  // precondition as in the real repo)
  fs.mkdirSync(path.join(rootDir, 'old/html'), { recursive: true });
  fs.cpSync(path.join(repoRoot, 'old/deprecated.html'), path.join(rootDir, 'old/deprecated.html'));

  // release-data.js writes straight into radar/data.json without creating
  // the directory first - same precondition as old/html/ above
  fs.mkdirSync(path.join(rootDir, 'radar'), { recursive: true });

  // minimal definitions/ fixture: one live entry (with a `related` id) and
  // one deprecated entry
  fs.mkdirSync(path.join(rootDir, 'definitions/ui'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'definitions/technology'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'definitions/ui/fixture-ui-adopt.toml'), FIXTURE_ADOPT_TOML);
  fs.writeFileSync(path.join(rootDir, 'definitions/technology/fixture-tech-deprecated.toml'), FIXTURE_DEPRECATED_TOML);

  // the isolated directory is not a git repo, so getReleaseTags() (used by
  // both history.js and release-data.js) gracefully finds no tags - this
  // run always looks like a fresh checkout with no release history yet
  execFileSync(process.execPath, [path.join(repoRoot, 'index.js')], { cwd: rootDir, encoding: 'utf8' });
});

after(() => {
  fs.rmSync(rootDir, { recursive: true, force: true });
});

describe('index.js: end-to-end run against a fixture definitions/ directory', () => {
  test('writes old/config.json with only the live (non-DEPRECATED) entry', () => {
    const configJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'old/config.json'), 'utf8'));
    assert.equal(configJson.entries.length, 1);
    assert.equal(configJson.entries[0].label, 'FxUI');
  });

  test('writes an old/html/<filename>.html detail page for every entry, including the deprecated one', () => {
    const live = fs.readFileSync(path.join(rootDir, 'old/html/fixture-ui-adopt.html'), 'utf8');
    assert.ok(live.includes('Fixture UI Adopt'));

    const deprecated = fs.readFileSync(path.join(rootDir, 'old/html/fixture-tech-deprecated.html'), 'utf8');
    assert.ok(deprecated.includes('Fixture Technology Deprecated'));
  });

  test('regenerates old/deprecated.html\'s table body with the deprecated entry (linked by its label)', () => {
    const html = fs.readFileSync(path.join(rootDir, 'old/deprecated.html'), 'utf8');
    assert.match(html, /<tbody id="deprecated-table-body">[\s\S]*FxTechDep[\s\S]*<\/tbody>/);
  });

  test('writes radar/data.json with both entries enriched, `related` resolved, and both classified as new changes', () => {
    const data = JSON.parse(fs.readFileSync(path.join(rootDir, 'radar/data.json'), 'utf8'));
    assert.match(data.date, /^\d{4}-\d{2}-draft$/); // no matching release tag in this isolated repo

    assert.equal(data.entries.length, 2);
    const live = data.entries.find((e) => e.id === 'fixture-ui-adopt');
    assert.deepEqual(live.related, [
      { id: 'fixture-tech-deprecated', title: 'Fixture Technology Deprecated', quadrant: 'Technology', ring: 'DEPRECATED' }
    ]);

    assert.equal(data.changes.items.length, 2);
    assert.ok(data.changes.items.every((i) => i.type === 'new'));
  });

  test('does not create old/releases or radar/releases - there is no git tag history to archive', () => {
    assert.equal(fs.existsSync(path.join(rootDir, 'old/releases')), false);
    assert.equal(fs.existsSync(path.join(rootDir, 'radar/releases')), false);
  });
});
