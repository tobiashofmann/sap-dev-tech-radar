import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildEntry, resolveRelated, lastChangedRelease, computeChanges } from '../release-data.js';
import {
  REF_UI_ADOPT,
  REF_TECHNOLOGY_USE,
  REF_TOOLS_HOLD,
  REF_FRAMEWORKS_STOP,
  REF_DEPRECATED,
  FIXTURES,
  entryByFilename
} from './fixtures.js';

describe('release-data.js: buildEntry() - one reference per quadrant/ring, plus deprecated', () => {
  for (const ref of FIXTURES) {
    test(`${ref.data.config.quadrant}/${ref.data.config.ring} builds the expected enriched shape`, () => {
      const entry = buildEntry(ref.data, ref.filename, entryByFilename, []);
      assert.equal(entry.id, ref.filename);
      assert.equal(entry.title, ref.data.page.title);
      assert.equal(entry.label, ref.data.config.label);
      assert.equal(entry.description, ref.data.page.description);
      assert.equal(entry.reason, ref.data.page.reason);
      assert.equal(entry.support, ref.data.page.support);
      assert.equal(entry.quadrant, ref.data.config.quadrant);
      assert.equal(entry.ring, ref.data.config.ring);
      assert.equal(entry.trend, ref.data.config.trend);
      assert.deepEqual(entry.links, [{ name: 'Homepage', url: ref.data.links.Homepage }]);
      assert.equal(entry.lastChangedRelease, null); // empty history passed in
    });
  }

  test('recommendation falls back to reason when not set in TOML', () => {
    const entry = buildEntry(REF_UI_ADOPT.data, REF_UI_ADOPT.filename, entryByFilename, []);
    assert.equal(entry.recommendation, REF_UI_ADOPT.data.page.reason);
  });

  test('an explicit recommendation is kept as-is, not overwritten by reason', () => {
    const entry = buildEntry(REF_TECHNOLOGY_USE.data, REF_TECHNOLOGY_USE.filename, entryByFilename, []);
    assert.equal(entry.recommendation, REF_TECHNOLOGY_USE.data.page.recommendation);
    assert.notEqual(entry.recommendation, entry.reason);
  });

  test('"since" is only present for a DEPRECATED entry', () => {
    const live = buildEntry(REF_UI_ADOPT.data, REF_UI_ADOPT.filename, entryByFilename, []);
    assert.equal(live.since, undefined);

    const deprecated = buildEntry(REF_DEPRECATED.data, REF_DEPRECATED.filename, entryByFilename, []);
    assert.equal(deprecated.since, '2026-06');
  });

  test('`related` ids resolve to {id, title, quadrant, ring} of the referenced entry', () => {
    const entry = buildEntry(REF_TECHNOLOGY_USE.data, REF_TECHNOLOGY_USE.filename, entryByFilename, []);
    assert.deepEqual(entry.related, [
      { id: 'ref-ui-adopt', title: REF_UI_ADOPT.data.page.title, quadrant: 'UI', ring: 'ADOPT' }
    ]);
  });

  test('entries without `related` get an empty array, not undefined', () => {
    const entry = buildEntry(REF_TOOLS_HOLD.data, REF_TOOLS_HOLD.filename, entryByFilename, []);
    assert.deepEqual(entry.related, []);
  });
});

describe('release-data.js: resolveRelated()', () => {
  test('throws for a related id that matches no known entry', () => {
    assert.throws(
      () => resolveRelated(['does-not-exist'], REF_FRAMEWORKS_STOP.filename, entryByFilename),
      /related id "does-not-exist" does not match/
    );
  });

  test('returns [] for no related ids', () => {
    assert.deepEqual(resolveRelated(undefined, 'x', entryByFilename), []);
    assert.deepEqual(resolveRelated([], 'x', entryByFilename), []);
  });
});

describe('release-data.js: lastChangedRelease()', () => {
  test('null when there is no release history yet', () => {
    assert.equal(lastChangedRelease('ADOPT', []), null);
  });

  test('the most recent release when its ring still matches the current one', () => {
    const history = [{ release: '2025-06', ring: 'USE' }, { release: '2025-12', ring: 'USE' }];
    assert.equal(lastChangedRelease('USE', history), '2025-12');
  });

  test('null when the ring changed since the most recent release (change happened in the current draft)', () => {
    const history = [{ release: '2025-06', ring: 'USE' }, { release: '2025-12', ring: 'USE' }];
    assert.equal(lastChangedRelease('HOLD', history), null);
  });
});

describe('release-data.js: computeChanges()', () => {
  test('classifies new / moved / deprecated correctly across the reference set', () => {
    const entries = [
      { filename: REF_UI_ADOPT.filename, data: REF_UI_ADOPT.data }, // no prior history -> new
      { filename: REF_TECHNOLOGY_USE.filename, data: REF_TECHNOLOGY_USE.data }, // ADOPT -> USE -> moved
      { filename: REF_TOOLS_HOLD.filename, data: REF_TOOLS_HOLD.data }, // unchanged -> no change item
      { filename: REF_DEPRECATED.filename, data: REF_DEPRECATED.data } // STOP -> DEPRECATED -> deprecated
    ];
    const historyByFilename = {
      [REF_TECHNOLOGY_USE.filename]: [{ release: '2025-12', ring: 'ADOPT' }],
      [REF_TOOLS_HOLD.filename]: [{ release: '2025-12', ring: 'HOLD' }],
      [REF_DEPRECATED.filename]: [{ release: '2025-12', ring: 'STOP' }]
    };

    const { items } = computeChanges(entries, historyByFilename);
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));

    assert.equal(byId[REF_UI_ADOPT.filename].type, 'new');
    assert.equal(byId[REF_UI_ADOPT.filename].previousRing, null);

    assert.equal(byId[REF_TECHNOLOGY_USE.filename].type, 'moved');
    assert.equal(byId[REF_TECHNOLOGY_USE.filename].previousRing, 'ADOPT');
    assert.equal(byId[REF_TECHNOLOGY_USE.filename].currentRing, 'USE');

    assert.equal(byId[REF_DEPRECATED.filename].type, 'deprecated');

    // unchanged ring -> left out entirely
    assert.equal(byId[REF_TOOLS_HOLD.filename], undefined);
  });

  test('items are sorted by ring order (ADOPT..STOP, then DEPRECATED)', () => {
    const entries = [
      { filename: REF_DEPRECATED.filename, data: REF_DEPRECATED.data },
      { filename: REF_UI_ADOPT.filename, data: REF_UI_ADOPT.data }
    ];
    const historyByFilename = { [REF_DEPRECATED.filename]: [{ release: '2025-12', ring: 'STOP' }] };
    const { items } = computeChanges(entries, historyByFilename);
    assert.deepEqual(items.map((i) => i.id), [REF_UI_ADOPT.filename, REF_DEPRECATED.filename]);
  });
});
