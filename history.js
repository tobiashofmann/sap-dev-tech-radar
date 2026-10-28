/*!
 * release history derivation
 * Copyright(c) 2026 Tobias Hofmann
 * Apache Licensed
 */
'use strict';

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-toml';
import { json2config } from './convert.js';

const RELEASES_DIR = './radar/releases';
const RELEASE_TAG_PATTERN = /^\d{4}[.-]\d{1,2}$/;
const RING_ORDER = { ADOPT: 0, USE: 1, HOLD: 2, STOP: 3, DEPRECATED: 4 };

// Note: radar/config.json and radar/html/*.html are gitignored in this repo
// (see .gitignore), so they were never committed at any past release tag -
// `git show <tag>:radar/config.json` would always come back empty. Instead,
// every past release's config.json is reconstructed from the definitions/
// TOML files as they existed at that tag (same mapping convert.js uses for
// the current build), which also works retroactively for releases tagged
// before this history mechanism existed.

/**
 * Normalizes a git tag (e.g. "2025.6" or "2026-06") to the canonical
 * "YYYY-MM" release version string (zero-padded, dash).
 * @param {string} tag
 * @returns {string}
 */
function normalizeTagToVersion(tag) {
  const [year, month] = tag.split(/[.-]/);
  return `${year}-${month.padStart(2, '0')}`;
}

/**
 * Lists all git tags that look like a published release, oldest first.
 * @returns {{tag: string, version: string}[]}
 */
function getReleaseTags() {
  let raw;
  try {
    raw = execFileSync('git', ['tag', '--list'], { encoding: 'utf8' });
  } catch (err) {
    console.error('Could not read git tags, skipping release history derivation:', err.message);
    return [];
  }

  return raw
    .split('\n')
    .map((tag) => tag.trim())
    .filter((tag) => RELEASE_TAG_PATTERN.test(tag))
    .map((tag) => ({ tag, version: normalizeTagToVersion(tag) }))
    .sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * Returns a file's content at a given git ref, or null if it didn't exist there.
 * @param {string} tag
 * @param {string} relPath path relative to the repo root, e.g. "definitions/ui/mdk.toml"
 * @returns {string|null}
 */
function getFileAtTag(tag, relPath) {
  try {
    return execFileSync('git', ['show', `${tag}:${relPath}`], { encoding: 'utf8' });
  } catch (err) {
    return null;
  }
}

/**
 * Lists every definitions/**\/*.toml path that existed at a given tag.
 * @param {string} tag
 * @returns {string[]}
 */
function listDefinitionFilesAtTag(tag) {
  try {
    const raw = execFileSync('git', ['ls-tree', '-r', '--name-only', tag, '--', 'definitions'], { encoding: 'utf8' });
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.endsWith('.toml'));
  } catch (err) {
    console.error(`Could not list definitions/ at tag ${tag}:`, err.message);
    return [];
  }
}

/**
 * Derives each technology's ring-per-release history from git tags, and
 * reconstructs + archives a config.json snapshot per past release into
 * radar/releases/. Nothing here is authored by hand - it's all read back
 * out of the definitions/ TOML files as they existed at each release tag.
 *
 * @param {{filename: string}[]} entries current definitions/**\/*.toml files
 * @returns {Object.<string, {release: string, ring: string}[]>} ring history per filename, oldest first
 */
function deriveAndArchiveHistory(entries) {
  const tags = getReleaseTags();
  const currentFilenames = new Set(entries.map((e) => e.filename));
  const historyByFilename = {};
  entries.forEach(({ filename }) => { historyByFilename[filename] = []; });

  if (tags.length === 0) {
    return historyByFilename;
  }

  fs.mkdirSync(RELEASES_DIR, { recursive: true });

  tags.forEach(({ tag, version }) => {
    const releaseDir = `${RELEASES_DIR}/${version}`;
    const snapshotPath = `${releaseDir}/config.json`;
    const alreadyArchived = fs.existsSync(snapshotPath);
    const releaseEntries = [];

    listDefinitionFilesAtTag(tag).forEach((relPath) => {
      const content = getFileAtTag(tag, relPath);
      if (content === null) {
        return;
      }

      let parsed;
      try {
        parsed = load(content);
      } catch (err) {
        console.error(`Could not parse ${relPath} at tag ${tag}, skipping it for that release:`, err.message);
        return;
      }

      const filename = path.basename(relPath, '.toml');
      const ring = parsed.config.ring;

      if (currentFilenames.has(filename)) {
        historyByFilename[filename].push({ release: version, ring });
      }

      if (!alreadyArchived && ring !== 'DEPRECATED') {
        releaseEntries.push(json2config(parsed, filename));
      }
    });

    if (!alreadyArchived) {
      fs.mkdirSync(releaseDir, { recursive: true });
      fs.writeFileSync(snapshotPath, JSON.stringify({ date: version, entries: releaseEntries }));
    }
  });

  fs.writeFileSync(
    `${RELEASES_DIR}/manifest.json`,
    JSON.stringify(tags.map((t) => t.version))
  );

  return historyByFilename;
}

/**
 * Throws if the current ring is earlier than the most recent released ring,
 * i.e. enforces Adopt -> Use -> Hold -> Stop -> Deprecated, forward only.
 * @param {string} filename
 * @param {string} currentRing
 * @param {{release: string, ring: string}[]} history oldest first
 */
function validateForwardOnly(filename, currentRing, history) {
  if (!history || history.length === 0) {
    return;
  }
  const last = history[history.length - 1];
  if (RING_ORDER[currentRing] < RING_ORDER[last.ring]) {
    throw new Error(
      `"${filename}": ring "${currentRing}" is a backward move from "${last.ring}" ` +
      `(released ${last.release}). Rings only move forward: Adopt -> Use -> Hold -> Stop -> Deprecated.`
    );
  }
}

export { deriveAndArchiveHistory, validateForwardOnly };
