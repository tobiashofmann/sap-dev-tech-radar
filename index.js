import {load} from 'js-toml';
import { glob } from 'glob'
import path from 'path';
import fs from 'node:fs'
import {createCONFIG, createHTML, createDeprecatedPage} from './convert.js';
import {deriveAndArchiveHistory, validateForwardOnly} from './history.js';
import {writeReleaseData, deriveAndArchiveReleaseData} from './release-data.js';

const tomlFilePath = "./definitions/**/*.toml";

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
        console.error(err);
      }

  });

// lookup used to resolve `related` ids to title/quadrant/ring
const entryByFilename = {};
entries.forEach(({filename, data}) => {
  entryByFilename[filename] = {
    title: data.page.title,
    quadrant: data.config.quadrant,
    ring: data.config.ring
  };
});

// derive each technology's ring-per-release history from git tags, and
// archive a config.json snapshot per past release under radar/releases/
const historyByFilename = deriveAndArchiveHistory(entries.map(({filename, relPath}) => ({filename, relPath})));

// archive the richer data.json-equivalent per past release too, in the
// same shape as the current draft's radar/data.json, so the Vue app can
// render a past release with its existing components once wired up
try {
  deriveAndArchiveReleaseData();
} catch (err) {
  console.error(err);
}

//
// one enriched JSON for the current (not-yet-released) state - the input
// the Vue front end reads to render the radar, list, filters, detail
// pages and the changes page
//
try {
  writeReleaseData(entries, entryByFilename, historyByFilename);
} catch (err) {
  console.error(err);
}

entries.forEach( function( {filename, data} ) {
    console.log(filename);

    try {
        //
        // forward-only ring check against derived history
        //
        validateForwardOnly(filename, data.config.ring, historyByFilename[filename]);

        //
        // create config file from toml file
        //
        createCONFIG(data, filename);

        //
        // create HTML file from toml file
        //
        createHTML(data, filename, entryByFilename, historyByFilename[filename]);

      } catch (err) {
        console.error(err);
      }

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
