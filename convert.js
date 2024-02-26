/*!
 * converter
 * Copyright(c) 2024 Tobias Hofmann
 * Apache Licensed
 */
'use strict';

import fs from 'node:fs'

// config file for tech radar
let configJson = createConfigJson();

  /**
   * convert toml to JSON
   * @param {JSON} tomlAsJson
   * @param {string} filename
   */
function createCONFIG(tomlAsJson, filename) {

  configJson.entries.push(json2config(tomlAsJson, filename));
  //console.log(configJson);

  // write config json to file. Needed by tech radar web app
  writeConfigJson2File(configJson);

}

 /**
   * convert toml to HTML
   * @param {JSON} tomlAsJson
   * @param {string} filename
   */
function createHTML(tomlAsJson, filename) {

  let htmltemplate = loadHtmlTemplate();
  writeHtmlToFile(tomlAsJson, htmltemplate, filename);
  //console.log(htmltemplate);
}


  /**
   * Write HTML data to file
   *
   * @param {string} htmltemplate
   */
  function writeHtmlToFile(tomlAsJson, htmltemplate, filename) {

    if (htmltemplate !== -1) {

        const html = conv2html(tomlAsJson, htmltemplate);
        //console.log(html);

        const path = "./radar/html/" + filename + ".html";
        fs.writeFileSync(path, html);
    }
  }


  /**
   * Convert toml JSON to HTML
   * @param {*} tomlAsJson
   * @param {*} htmltemplate
   * @returns
   */
  function conv2html(tomlAsJson, htmltemplate) {
    //console.log(tomlAsJson);
    //console.log(htmltemplate);

    htmltemplate = replacePlaceholder(htmltemplate, "%title%", tomlAsJson.page.title);
    htmltemplate = replacePlaceholder(htmltemplate, "%description%", tomlAsJson.page.description);
    htmltemplate = replacePlaceholder(htmltemplate, "%reason%", tomlAsJson.page.reason);
    htmltemplate = replacePlaceholder(htmltemplate, "%quadrant%", tomlAsJson.config.quadrant);
    htmltemplate = replacePlaceholder(htmltemplate, "%ring%", tomlAsJson.config.ring);

    var links = "";
    for (var name in tomlAsJson.links) {
        //links += "<li><a href='" +tomlAsJson.links[name]+ "'>" +name+ "</a></li>";
        links += "<a href='" +tomlAsJson.links[name]+ "' class='list-group-item list-group-item-action link-primary'>" +name+ "</a>";

    }
    htmltemplate = replacePlaceholder(htmltemplate, "%references%", links);

    // replace color based on ring
    htmltemplate = replacePlaceholder(htmltemplate, "%color%", getReplaceColor(tomlAsJson.config.ring));

    return htmltemplate;
  }

  function getReplaceColor(ring) {
      const bootstrapColor = {
        ADOPT: "text-bg-success",
        USE: "text-bg-primary",
        HOLD: "text-bg-warning",
        STOP: "text-bg-danger"
      };
      return bootstrapColor[ring];
  }

  /**
   * Replaces placeholder in htmltemplate with value
   *
   * @param {string} htmltemplate html template with placeholder
   * @param {string} placeholder e.g. %title%
   * @param {string} value value to be inserted
   * @returns htmlplaceholder with replaced text
   */
  function replacePlaceholder(htmltemplate, placeholder, value) {
    return htmltemplate.replaceAll(placeholder, value);
  }

  /**
   * Load HTML template file
   * @returns
   */
  function loadHtmlTemplate() {
    try {
        const path = "./template/template.html";
        const htmlTemplate = fs.readFileSync(path, 'utf8');
        //console.log(htmlTemplate);
        return htmlTemplate;
    } catch (err) {
        console.error(err);
        return -1;
    }
  }


/**
 * Create base config JSON
 * Automatically sets the date value to current Year and Month
 * @returns JSON
 */
function createConfigJson() {
  const releaseDraftVersion = "-draft";
  const releaseVersion = releaseDraftVersion;
  let configJson = {
      "date": new Date().getUTCFullYear() + "." + new Date().toLocaleString('en', {month: '2-digit'}) + releaseVersion,
      "entries": []
  }
  return configJson;
}


function writeConfigJson2File(configJson) {
  const path = "./radar/config.json";

  fs.writeFileSync(path, JSON.stringify(configJson));
}


  /**
    [config]
    label = "ADT"
    ring = "USE"
    quadrant = "Tools"
    active = true
    moved = 0
    link = "adt"
  */
    function json2config(data, filename) {
      const url = "./html/" + filename + ".html";
      let config = {
          "quadrant": getQuadrant(data.config.quadrant),
          "ring": getRing(data.config.ring),
          "label": data.config.label,
          "active": data.config.active,
          "moved": data.config.moved,
          "link": url
      }
      //console.log(config);
      return config;
    }


  /**
   * Retrieve the correct quadrant
   *
   * "Tools" - 0
   * "Frameworks" - 1
   * "UI" - 2
   * "Technology" - 3
   * @param {string} value Quadrant as string
   * @returns quadrant as int
   */
  function getQuadrant(value) {
    switch (value) {
        case "Tools":
            return 0;
        case "Frameworks":
            return 1;
        case "UI":
            return 2;
        case "Technology":
            return 3;
        default:
            return 0;
    }
  }

  /**
   * Retrieve the correct quadrant
   *
   * "ADOPT" - 0
   * "USE" - 1
   * "HOLD" - 2
   * "STOP" - 3
   * @param {string} value Quadrant as string
   * @returns quadrant as int
   */
  function getRing(value) {
    switch (value) {
        case "ADOPT":
            return 0;
        case "USE":
            return 1;
        case "HOLD":
            return 2;
        case "STOP":
            return 3;
        default:
            return 0;
    }
  }


/**
 * Module exports.
 * @public
 */
export {createCONFIG, createHTML}