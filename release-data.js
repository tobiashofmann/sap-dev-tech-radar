/*!
 * enriched release data for the Vue front end
 * Copyright(c) 2026 Tobias Hofmann
 * Apache Licensed
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-toml';
import { getReleaseTags, getFileAtTag, listDefinitionFilesAtTag, normalizeParsedConfig } from './history.js';

const RING_ORDER = { ADOPT: 0, USE: 1, HOLD: 2, STOP: 3, DEPRECATED: 4 };
const RELEASES_DIR = './radar/releases';

/**
 * Resolves a technology's `related` ids to {id, title, quadrant, ring}.
 * @param {string[]} relatedIds
 * @param {string} filename owning technology, for the error message
 * @param {Object.<string, {title: string, quadrant: string, ring: string}>} entryByFilename
 * @returns {{id: string, title: string, quadrant: string, ring: string}[]}
 */
function resolveRelated(relatedIds, filename, entryByFilename) {
  return (relatedIds || []).map((id) => {
    const related = entryByFilename[id];
    if (!related) {
      throw new Error(`"${filename}": related id "${id}" does not match any definitions/**/*.toml filename`);
    }
    return { id, title: related.title, quadrant: related.quadrant, ring: related.ring };
  });
}

/**
 * The release this technology last changed ring in, or null if that
 * happened in the current, not-yet-released draft.
 * @param {string} currentRing
 * @param {{release: string, ring: string}[]} history oldest first
 * @returns {string|null}
 */
function lastChangedRelease(currentRing, history) {
  if (!history || history.length === 0) {
    return null;
  }
  const last = history[history.length - 1];
  return last.ring === currentRing ? last.release : null;
}

/**
 * Builds the full JSON representation of one technology for the Vue app
 * (detail page, list view, related-technologies lookups).
 * @param {*} data parsed TOML
 * @param {string} filename
 * @param {Object.<string, {title: string, quadrant: string, ring: string}>} entryByFilename
 * @param {{release: string, ring: string}[]} history oldest first
 * @returns {object}
 */
function buildEntry(data, filename, entryByFilename, history) {
  return {
    id: filename,
    title: data.page.title,
    label: data.config.label,
    description: data.page.description,
    reason: data.page.reason,
    recommendation: data.page.recommendation || data.page.reason,
    support: data.page.support,
    quadrant: data.config.quadrant,
    ring: data.config.ring,
    trend: data.config.trend,
    since: data.config.ring === 'DEPRECATED' ? data.config.since : undefined,
    links: Object.entries(data.links || {}).map(([name, url]) => ({ name, url })),
    related: resolveRelated(data.config.related, filename, entryByFilename),
    releaseHistory: history || [],
    lastChangedRelease: lastChangedRelease(data.config.ring, history)
  };
}

/**
 * Compares the current state against the most recently released one
 * (the newest tag each technology's history was derived from) and reports
 * what's new, what moved to its next ring, and what's newly deprecated.
 * Entries with no ring change since then are left out.
 *
 * @param {{filename: string, data: object}[]} entries current definitions/**\/*.toml files
 * @param {Object.<string, {release: string, ring: string}[]>} historyByFilename oldest first
 * @returns {{previousRelease: string|null, items: object[]}}
 */
function computeChanges(entries, historyByFilename) {
  const tags = getReleaseTags();
  const previousRelease = tags.length ? tags[tags.length - 1].version : null;
  const items = [];

  entries.forEach(({ filename, data }) => {
    const history = historyByFilename[filename] || [];
    const currentRing = data.config.ring;
    const previousRing = history.length ? history[history.length - 1].ring : null;

    if (previousRing === currentRing) {
      return; // unchanged since the last release
    }

    let type;
    if (previousRing === null) {
      type = 'new';
    } else if (currentRing === 'DEPRECATED') {
      type = 'deprecated';
    } else {
      type = 'moved';
    }

    items.push({
      id: filename,
      title: data.page.title,
      quadrant: data.config.quadrant,
      type,
      previousRing,
      currentRing,
      reason: data.page.reason
    });
  });

  items.sort((a, b) => RING_ORDER[a.currentRing] - RING_ORDER[b.currentRing]);

  return { previousRelease, items };
}

/**
 * Assembles and writes radar/data.json: everything the Vue app needs to
 * render the radar, list, filters, detail pages and the changes page for
 * the current (not-yet-released) state, in one file.
 *
 * @param {{filename: string, data: object}[]} entries
 * @param {Object.<string, {title: string, quadrant: string, ring: string}>} entryByFilename
 * @param {Object.<string, {release: string, ring: string}[]>} historyByFilename
 */
function writeReleaseData(entries, entryByFilename, historyByFilename) {
  const releaseEntries = entries.map(({ filename, data }) =>
    buildEntry(data, filename, entryByFilename, historyByFilename[filename])
  );

  const data = {
    date: new Date().getUTCFullYear() + '-' + new Date().toLocaleString('en', { month: '2-digit' }),
    entries: releaseEntries,
    changes: computeChanges(entries, historyByFilename)
  };

  fs.writeFileSync('./radar/data.json', JSON.stringify(data));
}

/**
 * Builds and archives radar/releases/<version>/data.json for every past
 * release tag - the same enriched shape writeReleaseData() produces for
 * the current draft (entries + changes-since-previous-release), so the
 * Vue app can render a past release with its existing components
 * unchanged, once wired up to fetch it. Reads each technology exactly as
 * it existed in definitions/**\/*.toml at that tag (via the same
 * git-show helpers history.js uses for its own config.json archive), so
 * nothing here is hand-authored.
 *
 * A release's file is written once and never rewritten on later runs -
 * "once released, no change" (matches history.js's config.json
 * archiving) - so this is safe/cheap to call on every `npm run conv`.
 */
function deriveAndArchiveReleaseData() {
  const tags = getReleaseTags();
  if (tags.length === 0) {
    return;
  }

  fs.mkdirSync(RELEASES_DIR, { recursive: true });

  // progressive, oldest-first ring history - holds every release strictly
  // before the tag currently being processed, advanced at the end of
  // each iteration so a release's own data.json only ever sees its past
  const historyByFilename = {};
  let previousVersion = null;

  tags.forEach(({ tag, version }) => {
    const releaseDir = `${RELEASES_DIR}/${version}`;
    const dataPath = `${releaseDir}/data.json`;
    const alreadyArchived = fs.existsSync(dataPath);

    const parsedByFilename = {};
    listDefinitionFilesAtTag(tag).forEach((relPath) => {
      const content = getFileAtTag(tag, relPath);
      if (content === null) {
        return;
      }
      const filename = path.basename(relPath, '.toml');
      try {
        // normalize ring/quadrant casing defensively (history.js's shared
        // helper) - a historical typo (e.g. a past commit had "Adopt"
        // instead of "ADOPT", or "frameworks" instead of "Frameworks",
        // since fixed on main) shouldn't break case-sensitive lookups
        // when rendering an archived release that predates the fix
        parsedByFilename[filename] = normalizeParsedConfig(load(content));
      } catch (err) {
        console.error(`Could not parse ${relPath} at tag ${tag}, skipping it for release ${version}:`, err.message);
      }
    });

    const entryByFilename = {};
    Object.entries(parsedByFilename).forEach(([filename, data]) => {
      entryByFilename[filename] = { title: data.page.title, quadrant: data.config.quadrant, ring: data.config.ring };
    });

    const changeItems = [];
    const releaseEntries = [];
    Object.entries(parsedByFilename).forEach(([filename, data]) => {
      const history = historyByFilename[filename] || [];
      const currentRing = data.config.ring;
      const previousRing = history.length ? history[history.length - 1].ring : null;

      if (previousRing !== currentRing) {
        changeItems.push({
          id: filename,
          title: data.page.title,
          quadrant: data.config.quadrant,
          type: previousRing === null ? 'new' : currentRing === 'DEPRECATED' ? 'deprecated' : 'moved',
          previousRing,
          currentRing,
          reason: data.page.reason
        });
      }

      try {
        releaseEntries.push(buildEntry(data, filename, entryByFilename, history));
      } catch (err) {
        console.error(`Could not build release-data entry for "${filename}" at release ${version}, skipping it for that release:`, err.message);
      }
    });
    changeItems.sort((a, b) => RING_ORDER[a.currentRing] - RING_ORDER[b.currentRing]);

    if (!alreadyArchived) {
      fs.mkdirSync(releaseDir, { recursive: true });
      fs.writeFileSync(dataPath, JSON.stringify({
        date: version,
        entries: releaseEntries,
        changes: { previousRelease: previousVersion, items: changeItems }
      }));
    }

    Object.entries(parsedByFilename).forEach(([filename, data]) => {
      if (!historyByFilename[filename]) {
        historyByFilename[filename] = [];
      }
      historyByFilename[filename].push({ release: version, ring: data.config.ring });
    });
    previousVersion = version;
  });

  // own copy of the version list, alongside this directory's data.json
  // files - old/releases/manifest.json (history.js's) now lives in a
  // separate tree, so radar/ needs its own for the release selector to
  // fetch without reaching outside radar/
  fs.writeFileSync(`${RELEASES_DIR}/manifest.json`, JSON.stringify(tags.map((t) => t.version)));
}

export {
  writeReleaseData,
  deriveAndArchiveReleaseData,
  buildEntry,
  resolveRelated,
  lastChangedRelease,
  computeChanges
};
