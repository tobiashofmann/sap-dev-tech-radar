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

// Tags a [page] text (description, reason, recommendation) may use on the
// generated legacy pages - attribute-less formatting only. Mirrors the
// app's allow-list (app/src/sanitize.js) except for <a>: a link needs an
// attribute, and nothing with attributes is let through here; references
// belong in [links] instead.
const RICH_TEXT_TAGS = ["br", "b", "i", "em", "strong", "ul", "ol", "li"];
const RICH_TEXT_TAG_PATTERN = new RegExp(`&lt;(/?)(${RICH_TEXT_TAGS.join("|")})\\s*(/?)&gt;`, "gi");

/**
 * Escapes a value for use as HTML text or inside a quoted HTML attribute.
 * definitions/**\/*.toml content is reviewed, but that review is a content
 * check, not a security review - and the generated pages are published on
 * the same origin as the Vue app (radar/old/, see publish-old.js), so
 * nothing from a TOML file may reach them as markup unchecked.
 * An already-written character reference (&amp;, &#39;, ...) is kept as it
 * is rather than escaped a second time.
 * @param {*} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders a [page] text that may contain simple formatting (in practice
 * <br>/<br/> line breaks): everything is escaped first, then exactly the
 * attribute-less tags in RICH_TEXT_TAGS are turned back into markup. Any
 * other tag, and any tag carrying attributes, stays visible as text
 * instead of being interpreted by the browser.
 * @param {*} value
 * @returns {string}
 */
function renderRichText(value) {
  return escapeHtml(value).replace(RICH_TEXT_TAG_PATTERN, (match, open, tag, close) => `<${open}${tag.toLowerCase()}${close}>`);
}

/**
 * Validates one parsed definitions/**\/*.toml file: the [page]/[config]
 * tables exist, ring/quadrant are one of the exact allowed values, a
 * DEPRECATED entry carries a well-formed `since`, and every [links]
 * value is an http(s) URL. Pure (no I/O, no module
 * state), so index.js can run it over every entry up front - before any
 * output file is written, for the legacy site and the Vue app's
 * radar/data.json alike - and createCONFIG() still calls it itself.
 * @param {*} tomlAsJson parsed TOML
 * @param {string} filename
 * @throws {Error} describing the first rule the entry breaks
 */
function validateEntry(tomlAsJson, filename) {
  for (const table of ["page", "config"]) {
    if (!tomlAsJson || typeof tomlAsJson[table] !== "object" || tomlAsJson[table] === null) {
      throw new Error(`"${filename}": missing [${table}] table`);
    }
  }

  // getQuadrant/getRing silently default to 0 for an unrecognized value,
  // so a typo like ring = "Adopt" would otherwise be mis-filed without
  // any error - validate against the exact allowed set first.
  if (!VALID_RINGS.includes(tomlAsJson.config.ring)) {
    throw new Error(`"${filename}": ring "${tomlAsJson.config.ring}" must be one of ${VALID_RINGS.join(", ")}`);
  }
  if (!VALID_QUADRANTS.includes(tomlAsJson.config.quadrant)) {
    throw new Error(`"${filename}": quadrant "${tomlAsJson.config.quadrant}" must be one of ${VALID_QUADRANTS.join(", ")}`);
  }

  if (tomlAsJson.config.ring === "DEPRECATED") {
    const since = tomlAsJson.config.since;
    if (!/^\d{4}-(06|12)$/.test(since)) {
      throw new Error(`"${filename}": since "${since}" must match YYYY-06 or YYYY-12 (e.g. "2026-06")`);
    }
  }

  // [links] values end up as href attributes, on the legacy pages and in
  // the Vue app alike - anything but a plain web link (e.g. javascript:)
  // must not get that far.
  for (const [name, url] of Object.entries(tomlAsJson.links || {})) {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      throw new Error(`"${filename}": link "${name}" must be an http(s) URL, got "${url}"`);
    }
  }
}

  /**
   * convert toml to JSON
   * @param {JSON} tomlAsJson
   * @param {string} filename
   */
function createCONFIG(tomlAsJson, filename) {

  validateEntry(tomlAsJson, filename);

  // add to deprecated list if ring is DEPRECATED
  if (tomlAsJson.config.ring === "DEPRECATED") {
    const since = tomlAsJson.config.since;
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
   * @param {Array.<{release: string, ring: string}>} [releaseHistory] this technology's ring per past release, oldest first
   */
function createHTML(tomlAsJson, filename, entryByFilename, releaseHistory) {

  let htmltemplate = loadHtmlTemplate();
  if (htmltemplate === -1) {
    // loadHtmlTemplate() already logged the underlying read error; without
    // the template no detail page can be written, which must fail the
    // build instead of silently producing a site without detail pages
    throw new Error(`"${filename}": could not load template/template.html, no detail page written`);
  }
  writeHtmlToFile(tomlAsJson, htmltemplate, filename, entryByFilename, releaseHistory);
  //console.log(htmltemplate);
}


  /**
   * Renders and writes a technology's detail page to old/html/<filename>.html
   * @param {*} tomlAsJson parsed TOML
   * @param {string|number} htmltemplate the loaded HTML template, or -1 if it could not be read (see loadHtmlTemplate())
   * @param {string} filename
   * @param {Object.<string, {title: string, quadrant: string, ring: string}>} [entryByFilename] lookup for resolving `related` ids
   * @param {Array.<{release: string, ring: string}>} [releaseHistory] this technology's ring per past release, oldest first
   */
  function writeHtmlToFile(tomlAsJson, htmltemplate, filename, entryByFilename, releaseHistory) {

    if (htmltemplate !== -1) {

        const html = conv2html(tomlAsJson, htmltemplate, filename, entryByFilename, releaseHistory);
        //console.log(html);

        const path = "./old/html/" + filename + ".html";
        fs.writeFileSync(path, html);
    }
  }


  /**
   * Replaces every %placeholder% in the HTML template with this
   * technology's data.
   * @param {*} tomlAsJson parsed TOML
   * @param {string} htmltemplate the loaded HTML template
   * @param {string} filename
   * @param {Object.<string, {title: string, quadrant: string, ring: string}>} [entryByFilename] lookup for resolving `related` ids
   * @param {Array.<{release: string, ring: string}>} [releaseHistory] this technology's ring per past release, oldest first
   * @returns {string} the rendered HTML
   */
  function conv2html(tomlAsJson, htmltemplate, filename, entryByFilename, releaseHistory) {
    //console.log(tomlAsJson);
    //console.log(htmltemplate);

    // Every value from the TOML file is escaped before it goes into the
    // page (see escapeHtml()); the three long texts may keep their simple
    // formatting tags (see renderRichText()).
    htmltemplate = replacePlaceholder(htmltemplate, "%title%", escapeHtml(tomlAsJson.page.title));
    htmltemplate = replacePlaceholder(htmltemplate, "%description%", renderRichText(tomlAsJson.page.description));
    htmltemplate = replacePlaceholder(htmltemplate, "%reason%", renderRichText(tomlAsJson.page.reason));
    htmltemplate = replacePlaceholder(htmltemplate, "%recommendation%", renderRichText(tomlAsJson.page.recommendation || tomlAsJson.page.reason));
    htmltemplate = replacePlaceholder(htmltemplate, "%support%", escapeHtml(tomlAsJson.page.support));
    htmltemplate = replacePlaceholder(htmltemplate, "%quadrant%", escapeHtml(tomlAsJson.config.quadrant));
    htmltemplate = replacePlaceholder(htmltemplate, "%ring%", escapeHtml(tomlAsJson.config.ring));
    htmltemplate = replacePlaceholder(htmltemplate, "%trend%", escapeHtml(tomlAsJson.config.trend));
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
        links += "<a href='" +escapeHtml(tomlAsJson.links[name])+ "' class='list-group-item list-group-item-action link-primary'>" +escapeHtml(name)+ "</a>";

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
      html += "<a href='./" +escapeHtml(encodeURIComponent(id))+ ".html' class='list-group-item list-group-item-action link-primary'>" +escapeHtml(related.title)+ " (" +escapeHtml(related.quadrant)+ ", " +escapeHtml(related.ring)+ ")</a>";
    });
    return html;
  }

  /**
   * Renders the ring-history timeline: one entry per past release this
   * technology was already published in, plus the current (unreleased) ring.
   * @param {*} tomlAsJson
   * @param {Array.<{release: string, ring: string}>} [releaseHistory] oldest first
   * @returns {string}
   */
  function renderReleaseHistory(tomlAsJson, releaseHistory) {
    let html = "";
    (releaseHistory || []).forEach(({ release, ring }) => {
      html += "<li class='list-group-item'>" +escapeHtml(release)+ ": <b>" +escapeHtml(ring)+ "</b></li>";
    });
    html += "<li class='list-group-item'>current: <b>" +escapeHtml(tomlAsJson.config.ring)+ "</b></li>";
    return html;
  }

  /**
   * Maps a ring to the Bootstrap color class used to highlight it on a
   * technology's detail page.
   * @param {string} ring
   * @returns {string|undefined} the Bootstrap class, or undefined for a ring with no mapped color (e.g. DEPRECATED)
   */
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
   * @param {string} value value to be inserted, already escaped/rendered for HTML by the caller
   * @returns htmlplaceholder with replaced text
   */
  function replacePlaceholder(htmltemplate, placeholder, value) {
    // a replacer function, not the value itself: a plain string would have
    // "$&", "$1", "$$" etc. in the content interpreted as replacement patterns
    return htmltemplate.replaceAll(placeholder, () => value);
  }

  /**
   * Load HTML template file
   * @returns {string|number} the template's content, or -1 if it could not be read
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
 * @returns {{date: string, entries: object[]}}
 */
function createConfigJson() {
  let configJson = {
      "date": new Date().getUTCFullYear() + "." + new Date().toLocaleString('en', {month: '2-digit'}),
      "entries": []
  }
  return configJson;
}


/**
 * Writes the in-memory config JSON (built up across all non-DEPRECATED
 * entries processed so far) to old/config.json.
 * @param {{date: string, entries: object[]}} configJson
 */
function writeConfigJson2File(configJson) {
  const path = "./old/config.json";

  fs.writeFileSync(path, JSON.stringify(configJson));
}


  /**
   * Maps a parsed TOML entry's [config] table to the legacy D3 radar's
   * int-indexed shape, e.g.:
   *   [config]
   *   label = "ADT"
   *   ring = "USE"
   *   quadrant = "Tools"
   *   active = true
   *   moved = 0
   *   link = "./detail.html"
   * @param {*} data parsed TOML
   * @param {string} filename
   * @returns {{quadrant: number, ring: number, label: string, active: boolean, moved: number, link: string}}
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
  const path = "./old/deprecated.html";
  let html = fs.readFileSync(path, 'utf8');

  let tableRows = "";
  deprecatedList.forEach(item => {
    tableRows += `<tr>
      <td><a href="${escapeHtml(item.link)}">${escapeHtml(item.title)}</a></td>
      <td>${escapeHtml(item.quadrant)}</td>
      <td class="text-end">${escapeHtml(item.since)}</td>
    </tr>\n`;
  });

  // replace the tbody content
  const tbodyRegex = /<tbody id="deprecated-table-body">[\s\S]*?<\/tbody>/;
  const newTbody = `<tbody id="deprecated-table-body">
    ${tableRows}
  </tbody>`;
  // replacer function for the same reason as in replacePlaceholder()
  html = html.replace(tbodyRegex, () => newTbody);

  fs.writeFileSync(path, html);
}

/**
 * Module exports.
 * @public
 */
export {createCONFIG, createHTML, createDeprecatedPage, json2config, validateEntry, escapeHtml, renderRichText}
