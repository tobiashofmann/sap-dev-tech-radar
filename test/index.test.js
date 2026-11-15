import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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

// every fixture directory created by createFixtureRoot(), removed in after()
const fixtureRoots = [];

/**
 * Creates an isolated fixture directory index.js can run in: the HTML
 * shells it reads, plus the given definitions/ files. Neither radar/ nor
 * old/html/ is pre-created - index.js has to create its own (gitignored)
 * output directories, exactly as on a fresh checkout.
 * @param {Object.<string, string>} definitions TOML content by path relative to definitions/, e.g. "ui/foo.toml"
 * @returns {string} the fixture directory
 */
function createFixtureRoot(definitions) {
  const repoRoot = process.cwd();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdtr-index-e2e-'));
  fixtureRoots.push(dir);

  // convert.js's HTML rendering needs the real template
  fs.mkdirSync(path.join(dir, 'template'), { recursive: true });
  fs.cpSync(path.join(repoRoot, 'template/template.html'), path.join(dir, 'template/template.html'));

  // old/deprecated.html's hand-authored shell
  fs.mkdirSync(path.join(dir, 'old'), { recursive: true });
  fs.cpSync(path.join(repoRoot, 'old/deprecated.html'), path.join(dir, 'old/deprecated.html'));

  Object.entries(definitions).forEach(([relPath, content]) => {
    const target = path.join(dir, 'definitions', relPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  });

  return dir;
}

/**
 * Runs the real index.js with the given fixture directory as cwd.
 * @param {string} dir
 * @returns {{status: number, stderr: string}}
 */
function runIndex(dir) {
  // the isolated directory is not a git repo, so getReleaseTags() (used by
  // both history.js and release-data.js) gracefully finds no tags - this
  // run always looks like a fresh checkout with no release history yet
  const result = spawnSync(process.execPath, [path.join(process.cwd(), 'index.js')], { cwd: dir, encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr };
}

before(() => {
  // minimal definitions/ fixture: one live entry (with a `related` id) and
  // one deprecated entry
  rootDir = createFixtureRoot({
    'ui/fixture-ui-adopt.toml': FIXTURE_ADOPT_TOML,
    'technology/fixture-tech-deprecated.toml': FIXTURE_DEPRECATED_TOML
  });
  const { status, stderr } = runIndex(rootDir);
  assert.equal(status, 0, stderr);
});

after(() => {
  fixtureRoots.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
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

// A broken definition must fail the whole run (non-zero exit code, so CI
// and the Pages deploy stop) *before* anything is written for the current
// state - not get logged while the build stays green and the bad (or a
// missing) radar/data.json is deployed anyway.
describe('index.js: invalid definitions fail the run before anything is written', () => {
  // (Object.assign rather than object spread: .eslintrc.json parses as ES2015)
  const VALID = {
    'ui/fixture-ui-adopt.toml': FIXTURE_ADOPT_TOML,
    'technology/fixture-tech-deprecated.toml': FIXTURE_DEPRECATED_TOML
  };

  const cases = [
    {
      name: 'an unrecognized ring (casing typo)',
      definitions: Object.assign({}, VALID, { 'ui/fixture-ui-adopt.toml': FIXTURE_ADOPT_TOML.replace('ring = "ADOPT"', 'ring = "Adopt"') }),
      message: /"fixture-ui-adopt": ring "Adopt" must be one of/
    },
    {
      name: 'a `related` id that matches no definition file',
      definitions: Object.assign({}, VALID, { 'ui/fixture-ui-adopt.toml': FIXTURE_ADOPT_TOML.replace('"fixture-tech-deprecated"', '"does-not-exist"') }),
      message: /"fixture-ui-adopt": related id "does-not-exist" does not match/
    },
    {
      name: 'a DEPRECATED entry with a malformed `since`',
      definitions: Object.assign({}, VALID, { 'technology/fixture-tech-deprecated.toml': FIXTURE_DEPRECATED_TOML.replace('"2026-06"', '"2026-07"') }),
      message: /"fixture-tech-deprecated": since "2026-07" must match/
    },
    {
      name: 'a file that is not valid TOML',
      definitions: Object.assign({}, VALID, { 'tools/broken.toml': '[page\ntitle = ' }),
      message: /broken\.toml": could not be read\/parsed as TOML/
    },
    {
      name: 'a file without a [config] table',
      definitions: Object.assign({}, VALID, { 'tools/no-config.toml': '[page]\ntitle = "No config"\n' }),
      message: /"no-config": missing \[config\] table/
    }
  ];

  for (const { name, definitions, message } of cases) {
    test(`${name}: non-zero exit, error reported, no output written`, () => {
      const dir = createFixtureRoot(definitions);
      const { status, stderr } = runIndex(dir);

      assert.equal(status, 1);
      assert.match(stderr, message);
      assert.equal(fs.existsSync(path.join(dir, 'radar/data.json')), false);
      assert.equal(fs.existsSync(path.join(dir, 'old/config.json')), false);
      assert.equal(fs.existsSync(path.join(dir, 'old/html')), false);
    });
  }

  test('every problem is reported in one run, not just the first', () => {
    const dir = createFixtureRoot({
      'ui/fixture-ui-adopt.toml': FIXTURE_ADOPT_TOML.replace('"fixture-tech-deprecated"', '"does-not-exist"'),
      'technology/fixture-tech-deprecated.toml': FIXTURE_DEPRECATED_TOML.replace('quadrant = "Technology"', 'quadrant = "technology"')
    });
    const { status, stderr } = runIndex(dir);

    assert.equal(status, 1);
    assert.match(stderr, /related id "does-not-exist"/);
    assert.match(stderr, /quadrant "technology" must be one of/);
    assert.match(stderr, /2 error\(s\) in definitions\//);
  });
});
