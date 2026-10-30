import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { json2config, createCONFIG } from '../convert.js';
import {
  REF_UI_ADOPT,
  REF_TECHNOLOGY_USE,
  REF_TOOLS_HOLD,
  REF_FRAMEWORKS_STOP,
  REF_DEPRECATED
} from './fixtures.js';

// quadrant/ring -> int mapping json2config() uses for the legacy D3 radar
const QUADRANT_INDEX = { Tools: 0, Frameworks: 1, UI: 2, Technology: 3 };
const RING_INDEX = { ADOPT: 0, USE: 1, HOLD: 2, STOP: 3, DEPRECATED: 4 };

describe('convert.js: json2config() - one reference per quadrant/ring', () => {
  for (const ref of [REF_UI_ADOPT, REF_TECHNOLOGY_USE, REF_TOOLS_HOLD, REF_FRAMEWORKS_STOP]) {
    test(`${ref.data.config.quadrant}/${ref.data.config.ring} maps to the correct int indices`, () => {
      const config = json2config(ref.data, ref.filename);
      assert.equal(config.quadrant, QUADRANT_INDEX[ref.data.config.quadrant]);
      assert.equal(config.ring, RING_INDEX[ref.data.config.ring]);
      assert.equal(config.label, ref.data.config.label);
      assert.equal(config.active, ref.data.config.active);
      assert.equal(config.moved, ref.data.config.moved);
      assert.equal(config.link, `./html/${ref.filename}.html`);
    });
  }
});

describe('convert.js: createCONFIG() validation', () => {
  test('rejects an unrecognized ring (e.g. a casing typo) before writing anything', (t) => {
    const writeFile = t.mock.method(fs, 'writeFileSync', () => {});
    const bad = structuredClone(REF_UI_ADOPT.data);
    bad.config.ring = 'Adopt'; // wrong case - must not be silently defaulted
    assert.throws(() => createCONFIG(bad, 'bad-ring'), /ring "Adopt" must be one of/);
    assert.equal(writeFile.mock.callCount(), 0);
  });

  test('rejects an unrecognized quadrant before writing anything', (t) => {
    const writeFile = t.mock.method(fs, 'writeFileSync', () => {});
    const bad = structuredClone(REF_UI_ADOPT.data);
    bad.config.quadrant = 'ui'; // wrong case
    assert.throws(() => createCONFIG(bad, 'bad-quadrant'), /quadrant "ui" must be one of/);
    assert.equal(writeFile.mock.callCount(), 0);
  });

  test('rejects a DEPRECATED entry with a malformed "since"', (t) => {
    t.mock.method(fs, 'writeFileSync', () => {});
    const bad = structuredClone(REF_DEPRECATED.data);
    bad.config.since = '2026-06-01'; // must be YYYY-06 or YYYY-12
    assert.throws(() => createCONFIG(bad, 'bad-since'), /since "2026-06-01" must match/);
  });

  test('a valid DEPRECATED entry is accepted without writing old/config.json', (t) => {
    // DEPRECATED entries go to the in-memory deprecatedList, not
    // configJson.entries, so createCONFIG must not touch the filesystem
    // for one - verified by asserting writeFileSync is never called,
    // rather than by reading the real (gitignored, shared) old/config.json.
    const writeFile = t.mock.method(fs, 'writeFileSync', () => {});
    assert.doesNotThrow(() => createCONFIG(REF_DEPRECATED.data, REF_DEPRECATED.filename));
    assert.equal(writeFile.mock.callCount(), 0);
  });
});
