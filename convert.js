/*!
 * converter
 * Copyright(c) 2024 Tobias Hofmann
 * Apache Licensed
 */
'use strict';

import fs from 'node:fs'

// config file for tech radar
let configJson = createConfigJson();

// list for deprecated technologies
let deprecatedList = [];

const VALID_RINGS = ["ADOPT", "USE", "HOLD", "STOP", "DEPRECATED"];
const VALID_QUADRANTS = ["Tools", "Frameworks", "UI", "Technology"];

  /**
   * convert toml to JSON
   * @param {JSON} tomlAsJson
   * @param {string} filename
   */
function createCONFIG(tomlAsJson, filename) {

  // getQuadrant/getRing silently default to 0 for an unrecognized value,
  // so a typo like ring = "Adopt" would otherwise be mis-filed without
  // any error - validate against the exact allowed set first.
  if (!VALID_RINGS.includes(tomlAsJson.config.ring)) {
    throw new Error(`"${filename}": ring "${tomlAsJson.config.ring}" must be one of ${VALID_RINGS.join(", ")}`);
  }
  if (!VALID_QUADRANTS.includes(tomlAsJson.config.quadrant)) {
    throw new Error(`"${filename}": quadrant "${tomlAsJson.config.quadrant}" must be one of ${VALID_QUADRANTS.join(", ")}`);
  }

  // add to deprecated list if ring is DEPRECATED
  if (tomlAsJson.config.ring === "DEPRECATED") {
    const since = tomlAsJson.config.since;
    if (!/^\d{4}-(06|12)$/.test(since)) {
      throw new Error(`"${filename}": since "${since}" must match YYYY-06 or YYYY-12 (e.g. "2026-06")`);
    }
    deprecatedList.push({
      title: tomlAsJson.config.label,
      quadrant: tomlAsJson.config.quadrant,
      since: since,
      link: "./html/" + filename + ".html"
    });
  }
  else {
    configJson.entries.push(json2config(tomlAsJson, filename));
    //console.log(configJson);

    // write config json to file. Needed by tech radar web app
    writeConfigJson2File(configJson);
  }

}

 /**
   * convert toml to HTML
   * @param {JSON} tomlAsJson
   * @param {string} filename
   * @param {Object.<string, {title: string, quadrant: string, ring: string}>} [entryByFilename] lookup for resolving `related` ids
   * @param {{release: string, ring: string}[]} [releaseHistory] this technology's ring per past release, oldest first
   */
function createHTML(tomlAsJson, filename, entryByFilename, releaseHistory) {

  let htmltemplate = loadHtmlTemplate();
  writeHtmlToFile(tomlAsJson, htmltemplate, filename, entryByFilename, releaseHistory);
  //console.log(htmltemplate);
}


  /**
   * Write HTML data to file
   *
   * @param {string} htmltemplate
   */
  function writeHtmlToFile(tomlAsJson, htmltemplate, filename, entryByFilename, releaseHistory) {

    if (htmltemplate !== -1) {

        const html = conv2html(tomlAsJson, htmltemplate, filename, entryByFilename, releaseHistory);
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
  function conv2html(tomlAsJson, htmltemplate, filename, entryByFilename, releaseHistory) {
    //console.log(tomlAsJson);
    //console.log(htmltemplate);

    htmltemplate = replacePlaceholder(htmltemplate, "%title%", tomlAsJson.page.title);
    htmltemplate = replacePlaceholder(htmltemplate, "%description%", tomlAsJson.page.description);
    htmltemplate = replacePlaceholder(htmltemplate, "%reason%", tomlAsJson.page.reason);
    htmltemplate = replacePlaceholder(htmltemplate, "%recommendation%", tomlAsJson.page.recommendation || tomlAsJson.page.reason);
    htmltemplate = replacePlaceholder(htmltemplate, "%support%", tomlAsJson.page.support);
    htmltemplate = replacePlaceholder(htmltemplate, "%quadrant%", tomlAsJson.config.quadrant);
    htmltemplate = replacePlaceholder(htmltemplate, "%ring%", tomlAsJson.config.ring);
    htmltemplate = replacePlaceholder(htmltemplate, "%trend%", tomlAsJson.config.trend);
    htmltemplate = replacePlaceholder(htmltemplate, "%related%", renderRelated(tomlAsJson, filename, entryByFilename));
    htmltemplate = replacePlaceholder(htmltemplate, "%releasehistory%", renderReleaseHistory(tomlAsJson, releaseHistory));

    switch (tomlAsJson.config.trend) {
      case "positive":
        htmltemplate = replacePlaceholder(htmltemplate, "%trendimage%", "../bootstrap/graph-up-arrow.svg");
        break;
      case "negative":
        htmltemplate = replacePlaceholder(htmltemplate, "%trendimage%", "../bootstrap/graph-down-arrow.svg");
        break;
      case "stable":
        htmltemplate = replacePlaceholder(htmltemplate, "%trendimage%", "../bootstrap/arrow-right.svg");
        break;
      default:
        htmltemplate = replacePlaceholder(htmltemplate, "%trendimage%", "../bootstrap/stop-fill.svg");
        break;
    }

    let links = "";
    for (let name in tomlAsJson.links) {
        //links += "<li><a href='" +tomlAsJson.links[name]+ "'>" +name+ "</a></li>";
        links += "<a href='" +tomlAsJson.links[name]+ "' class='list-group-item list-group-item-action link-primary'>" +name+ "</a>";

    }
    htmltemplate = replacePlaceholder(htmltemplate, "%references%", links);

    // replace color based on ring
    htmltemplate = replacePlaceholder(htmltemplate, "%color%", getReplaceColor(tomlAsJson.config.ring));

    return htmltemplate;
  }

  /**
   * Renders the curated "related technologies" list, resolving each
   * configured id (a filename under definitions/) to its title/quadrant/ring.
   * @param {*} tomlAsJson
   * @param {string} filename
   * @param {Object.<string, {title: string, quadrant: string, ring: string}>} [entryByFilename]
   * @returns {string}
   */
  function renderRelated(tomlAsJson, filename, entryByFilename) {
    const relatedIds = tomlAsJson.config.related || [];
    let html = "";
    relatedIds.forEach((id) => {
      const related = entryByFilename && entryByFilename[id];
      if (!related) {
        throw new Error(`"${filename}": related id "${id}" does not match any definitions/**/*.toml filename`);
      }
      html += "<a href='./" +id+ ".html' class='list-group-item list-group-item-action link-primary'>" +related.title+ " (" +related.quadrant+ ", " +related.ring+ ")</a>";
    });
    return html;
  }

  /**
   * Renders the ring-history timeline: one entry per past release this
   * technology was already published in, plus the current (unreleased) ring.
   * @param {*} tomlAsJson
   * @param {{release: string, ring: string}[]} [releaseHistory] oldest first
   * @returns {string}
   */
  function renderReleaseHistory(tomlAsJson, releaseHistory) {
    let html = "";
    (releaseHistory || []).forEach(({ release, ring }) => {
      html += "<li class='list-group-item'>" +release+ ": <b>" +ring+ "</b></li>";
    });
    html += "<li class='list-group-item'>current: <b>" +tomlAsJson.config.ring+ "</b></li>";
    return html;
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
  /*
  let configJson = {
      "date": new Date().getUTCFullYear() + "." + new Date().toLocaleString('en', {month: '2-digit'}) + releaseVersion,
      "entries": []
  }
  */
  let configJson = {
      "date": new Date().getUTCFullYear() + "." + new Date().toLocaleString('en', {month: '2-digit'}),
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
    link = "./detail.html"
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
   * Retrieve the correct ring
   *
   * "ADOPT" - 0
   * "USE" - 1
   * "HOLD" - 2
   * "STOP" - 3
   * "DEPRECATED" - 4 (for completeness, though not used in radar)
   * @param {string} value Ring as string
   * @returns ring as int
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
        case "DEPRECATED":
            return 4;
        default:
            return 0;
    }
  }


/**
 * Create the deprecated technologies page
 */
function createDeprecatedPage() {
  const path = "./radar/deprecated.html";
  let html = fs.readFileSync(path, 'utf8');

  let tableRows = "";
  deprecatedList.forEach(item => {
    tableRows += `<tr>
      <td><a href="${item.link}">${item.title}</a></td>
      <td>${item.quadrant}</td>
      <td class="text-end">${item.since}</td>
    </tr>\n`;
  });

  // replace the tbody content
  const tbodyRegex = /<tbody id="deprecated-table-body">[\s\S]*?<\/tbody>/;
  const newTbody = `<tbody id="deprecated-table-body">
    ${tableRows}
  </tbody>`;
  html = html.replace(tbodyRegex, newTbody);

  fs.writeFileSync(path, html);
}

/**
 * Module exports.
 * @public
 */
export {createCONFIG, createHTML, createDeprecatedPage, json2config}
