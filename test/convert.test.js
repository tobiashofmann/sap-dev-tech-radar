import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { json2config, createCONFIG, validateEntry, escapeHtml, renderRichText } from '../convert.js';
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

describe('convert.js: validateEntry() - the pure per-entry check index.js runs before writing anything', () => {
  for (const ref of [REF_UI_ADOPT, REF_TECHNOLOGY_USE, REF_TOOLS_HOLD, REF_FRAMEWORKS_STOP, REF_DEPRECATED]) {
    test(`accepts the valid ${ref.data.config.quadrant}/${ref.data.config.ring} reference entry`, () => {
      assert.doesNotThrow(() => validateEntry(ref.data, ref.filename));
    });
  }

  test('rejects an unrecognized ring', () => {
    const bad = structuredClone(REF_UI_ADOPT.data);
    bad.config.ring = 'Adopt';
    assert.throws(() => validateEntry(bad, 'bad-ring'), /"bad-ring": ring "Adopt" must be one of/);
  });

  test('rejects an unrecognized quadrant', () => {
    const bad = structuredClone(REF_UI_ADOPT.data);
    bad.config.quadrant = 'ui';
    assert.throws(() => validateEntry(bad, 'bad-quadrant'), /"bad-quadrant": quadrant "ui" must be one of/);
  });

  test('rejects a DEPRECATED entry without a well-formed "since"', () => {
    const bad = structuredClone(REF_DEPRECATED.data);
    delete bad.config.since;
    assert.throws(() => validateEntry(bad, 'no-since'), /"no-since": since "undefined" must match/);
  });

  test('rejects an entry missing its [page] or [config] table', () => {
    const noPage = structuredClone(REF_UI_ADOPT.data);
    delete noPage.page;
    assert.throws(() => validateEntry(noPage, 'no-page'), /"no-page": missing \[page\] table/);

    const noConfig = structuredClone(REF_UI_ADOPT.data);
    delete noConfig.config;
    assert.throws(() => validateEntry(noConfig, 'no-config'), /"no-config": missing \[config\] table/);
  });
});

describe('convert.js: validateEntry() - [links] must be plain web links', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '//example.com/x', '/relative', '']) {
    test(`rejects ${JSON.stringify(url)}`, () => {
      const bad = structuredClone(REF_UI_ADOPT.data);
      bad.links = { Homepage: url };
      assert.throws(() => validateEntry(bad, 'bad-link'), /"bad-link": link "Homepage" must be an http\(s\) URL/);
    });
  }

  test('rejects a non-string link value', () => {
    const bad = structuredClone(REF_UI_ADOPT.data);
    bad.links = { Homepage: 42 };
    assert.throws(() => validateEntry(bad, 'bad-link'), /must be an http\(s\) URL/);
  });

  test('accepts http and https links, and an entry without a [links] table', () => {
    const ok = structuredClone(REF_UI_ADOPT.data);
    ok.links = { A: 'https://example.com/a?x=1&y=2', B: 'http://example.com/b' };
    assert.doesNotThrow(() => validateEntry(ok, 'ok-links'));
    delete ok.links;
    assert.doesNotThrow(() => validateEntry(ok, 'no-links'));
  });
});

describe('convert.js: escapeHtml() / renderRichText() - nothing from a TOML file reaches the legacy pages as unchecked markup', () => {
  test('escapeHtml escapes markup and both quote characters', () => {
    assert.equal(escapeHtml(`<img src=x onerror="a('b')">`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;');
  });

  test('escapeHtml escapes a bare ampersand but keeps an existing character reference', () => {
    assert.equal(escapeHtml('R&D &amp; more &#39;x&#39; &mdash;'), 'R&amp;D &amp; more &#39;x&#39; &mdash;');
  });

  test('escapeHtml renders null/undefined as an empty string, not "undefined"', () => {
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(null), '');
  });

  test('renderRichText keeps the allowed attribute-less formatting tags', () => {
    assert.equal(renderRichText('a<br>b<br/>c<BR />d <b>bold</b> <ul><li>x</li></ul>'), 'a<br>b<br/>c<br/>d <b>bold</b> <ul><li>x</li></ul>');
  });

  test('renderRichText leaves every other tag, and any tag with attributes, as visible text', () => {
    const out = renderRichText('<script>alert(1)</script><br onclick="x()"><a href="javascript:x">y</a><img src=x onerror=y>');
    assert.equal(out.includes('<'), false);
    assert.match(out, /&lt;script&gt;/);
    assert.match(out, /&lt;br onclick=/);
  });
});
