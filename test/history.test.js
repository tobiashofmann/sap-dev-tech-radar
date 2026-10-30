import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCase, normalizeParsedConfig, validateForwardOnly, getReleaseTags } from '../history.js';

const CANONICAL_RINGS = ['ADOPT', 'USE', 'HOLD', 'STOP', 'DEPRECATED'];
const CANONICAL_QUADRANTS = ['UI', 'Technology', 'Tools', 'Frameworks'];

describe('history.js: normalizeCase()', () => {
  test('matches a canonical value case-insensitively', () => {
    assert.equal(normalizeCase('Adopt', CANONICAL_RINGS), 'ADOPT');
    assert.equal(normalizeCase('adopt', CANONICAL_RINGS), 'ADOPT');
    assert.equal(normalizeCase('ADOPT', CANONICAL_RINGS), 'ADOPT');
  });

  test('never turns "UI" (an acronym) into "Ui" - matches on full case-insensitive equality, not title-casing', () => {
    assert.equal(normalizeCase('ui', CANONICAL_QUADRANTS), 'UI');
    assert.equal(normalizeCase('Ui', CANONICAL_QUADRANTS), 'UI');
  });

  test('a mixed-case quadrant resolves to its canonical one-capital spelling', () => {
    assert.equal(normalizeCase('frameworks', CANONICAL_QUADRANTS), 'Frameworks');
    assert.equal(normalizeCase('FRAMEWORKS', CANONICAL_QUADRANTS), 'Frameworks');
  });

  test('leaves an unrecognized value untouched (not silently coerced)', () => {
    assert.equal(normalizeCase('Bogus', CANONICAL_RINGS), 'Bogus');
  });

  test('passes through falsy values unchanged', () => {
    assert.equal(normalizeCase(undefined, CANONICAL_RINGS), undefined);
    assert.equal(normalizeCase('', CANONICAL_RINGS), '');
  });
});

describe('history.js: normalizeParsedConfig()', () => {
  test('normalizes both ring and quadrant casing on [config] in place', () => {
    const parsed = { config: { ring: 'Adopt', quadrant: 'ui' } };
    const result = normalizeParsedConfig(parsed);
    assert.equal(result, parsed); // same object, mutated in place
    assert.equal(parsed.config.ring, 'ADOPT');
    assert.equal(parsed.config.quadrant, 'UI');
  });

  test('is a no-op for already-canonical values', () => {
    const parsed = { config: { ring: 'STOP', quadrant: 'Technology' } };
    normalizeParsedConfig(parsed);
    assert.equal(parsed.config.ring, 'STOP');
    assert.equal(parsed.config.quadrant, 'Technology');
  });
});

describe('history.js: validateForwardOnly()', () => {
  test('does not throw when there is no prior history', () => {
    assert.doesNotThrow(() => validateForwardOnly('x', 'ADOPT', []));
    assert.doesNotThrow(() => validateForwardOnly('x', 'ADOPT', undefined));
  });

  test('does not throw for a forward move or an unchanged ring', () => {
    const history = [{ release: '2025-12', ring: 'ADOPT' }];
    assert.doesNotThrow(() => validateForwardOnly('x', 'USE', history)); // forward
    assert.doesNotThrow(() => validateForwardOnly('x', 'ADOPT', history)); // unchanged
  });

  test('throws for a backward move (e.g. STOP back to USE)', () => {
    const history = [{ release: '2025-12', ring: 'STOP' }];
    assert.throws(() => validateForwardOnly('x', 'USE', history), /backward move from "STOP"/);
  });
});

describe('history.js: getReleaseTags() (reads this repo\'s real git tags, read-only)', () => {
  test('returns the known release tags, oldest first, each normalized to YYYY-MM', () => {
    const tags = getReleaseTags();
    assert.ok(tags.length > 0, 'expected at least one release tag in this repo');
    for (const { version } of tags) {
      assert.match(version, /^\d{4}-\d{2}$/);
    }
    const versions = tags.map((t) => t.version);
    assert.deepEqual(versions, [...versions].sort());
  });
});
