import {load} from 'js-toml';
import { glob } from 'glob'
import path from 'path';
import fs from 'node:fs'
import {createCONFIG, createHTML} from './convert.js';

const tomlFilePath = "./definitions/**/*.toml";

// read toml files
glob.sync( tomlFilePath ).forEach( function( file ) {
    //console.log(file);

    // get filename
    const filename = getFilename(file);
    console.log(filename);

    try {
        const data = fs.readFileSync(file, 'utf8');
        //console.log(data);

        //
        // input of toml converted to JSON
        //
        const tomlAsJson = load(data);
        //console.log(tomlAsJson);

        //
        // create config file from toml file
        //
        createCONFIG(tomlAsJson, filename);

        //
        // create HTML file from toml file
        //
        createHTML(tomlAsJson, filename);

      } catch (err) {
        console.error(err);
      }

  });

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
