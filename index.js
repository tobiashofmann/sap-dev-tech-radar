import {load} from 'js-toml';
import { glob } from 'glob'
import path from 'path';
import fs from 'node:fs'
import {createCONFIG, createHTML, createDeprecatedPage, validateEntry} from './convert.js';
import {deriveAndArchiveHistory, validateForwardOnly} from './history.js';
import {writeReleaseData, deriveAndArchiveReleaseData} from './release-data.js';

const tomlFilePath = "./definitions/**/*.toml";

// Every problem found in the current definitions/**/*.toml set. All of
// them are collected (so one run reports everything that needs fixing,
// not just the first file), and if there is at least one, the run ends
// with a non-zero exit code *before* any output for the current state is
// written - a broken definition must fail `npm run conv` (and with it
// CI/the Pages deploy), not get logged and then shipped anyway.
const errors = [];

/**
 * Records a validation/parse problem and logs it right away.
 * @param {Error} err
 */
function reportError(err) {
  errors.push(err);
  console.error(err.message);
}

//
// first pass: read + parse every definition file, so related-id lookups
// and release-history derivation can see the whole set before anything
// is written
//
const entries = [];
glob.sync( tomlFilePath ).forEach( function( file ) {

    const filename = getFilename(file);

    try {
        const raw = fs.readFileSync(file, 'utf8');
        const data = load(raw);
        entries.push({filename, relPath: file, data});
      } catch (err) {
        reportError(new Error(`"${file}": could not be read/parsed as TOML: ${err.message}`));
      }

  });

//
// validation, part 1: each entry on its own (tables present, ring,
// quadrant, since). Entries failing this are left out of everything
// below - their [page]/[config] can't be relied on - the run fails
// anyway once all checks are through.
//
const validEntries = entries.filter(({filename, data}) => {
  try {
    validateEntry(data, filename);
    return true;
  } catch (err) {
    reportError(err);
    return false;
  }
});

// lookup used to resolve `related` ids to title/quadrant/ring
const entryByFilename = {};
validEntries.forEach(({filename, data}) => {
  entryByFilename[filename] = {
    title: data.page.title,
    quadrant: data.config.quadrant,
    ring: data.config.ring
  };
});

//
// validation, part 2: every `related` id must be another definition
// file's name. Checked against every parsed file (not just the valid
// ones), so an entry that's invalid for its own reasons isn't reported a
// second time by everything that references it.
//
const parsedFilenames = new Set(entries.map(({filename}) => filename));
validEntries.forEach(({filename, data}) => {
  (data.config.related || []).forEach((id) => {
    if (!parsedFilenames.has(id)) {
      reportError(new Error(`"${filename}": related id "${id}" does not match any definitions/**/*.toml filename`));
    }
  });
});

// derive each technology's ring-per-release history from git tags, and
// archive a config.json snapshot per past release under old/releases/
const historyByFilename = deriveAndArchiveHistory(validEntries.map(({filename, relPath}) => ({filename, relPath})));

//
// validation, part 3: forward-only ring check against derived history
//
validEntries.forEach(({filename, data}) => {
  try {
    validateForwardOnly(filename, data.config.ring, historyByFilename[filename]);
  } catch (err) {
    reportError(err);
  }
});

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s) in definitions/ - nothing was written for the current state. Fix them and run "npm run conv" again.`);
  process.exit(1);
}

//
// From here on every entry is known to be valid. Nothing below catches
// errors: a failure while writing output (missing template, unwritable
// directory, ...) propagates and ends the run with a non-zero exit code.
//

// archive the richer data.json-equivalent per past release too, under
// radar/releases/, in the same shape as the current draft's
// radar/data.json, so the Vue app can render a past release with its
// existing components
deriveAndArchiveReleaseData();

//
// one enriched JSON for the current (not-yet-released) state - the input
// the Vue front end reads to render the radar, list, filters, detail
// pages and the changes page
//
// radar/ is gitignored and only exists once something was built into it;
// on a fresh checkout without release tags nothing above creates it
fs.mkdirSync('./radar', { recursive: true });
writeReleaseData(validEntries, entryByFilename, historyByFilename);

// same for the legacy detail pages' directory (only its .gitkeep is tracked)
fs.mkdirSync('./old/html', { recursive: true });

validEntries.forEach( function( {filename, data} ) {
    console.log(filename);

    //
    // create config file from toml file
    //
    createCONFIG(data, filename);

    //
    // create HTML file from toml file
    //
    createHTML(data, filename, entryByFilename, historyByFilename[filename]);

  });

  //
  // create deprecated page
  //
  createDeprecatedPage();

  /**
   * Retrieves the filename (name without suffix .toml)
   * @param {string} filepath
   * @returns filename as string
   */
  function getFilename(filepath) {
        const extension = ".toml";
        const filename = path.basename(filepath, extension);
        return filename;
  }
