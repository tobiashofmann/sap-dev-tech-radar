/*!
 * toml2markdown
 * Copyright(c) 2026 Tobias Hofmann
 * Apache Licensed
 */
'use strict';

import fs from 'node:fs';
import { load } from 'js-toml';
import { glob } from 'glob';

const tomlFilePath = "./definitions/**/*.toml";
const outputPath = "./radar/radar.md";

// fixed display order for known quadrants, see convert.js getQuadrant()
const quadrantOrder = ["Tools", "Frameworks", "UI", "Technology"];

// entries grouped by quadrant, e.g. { Tools: [ {columns, values}, ... ] }
let entriesByQuadrant = {};

// read toml files
glob.sync(tomlFilePath).forEach(function (file) {

  try {
    const data = fs.readFileSync(file, 'utf8');

    // input of toml converted to JSON
    const tomlAsJson = load(data);

    addEntry(tomlAsJson);

  } catch (err) {
    console.error(err);
  }

});

writeMarkdownFile();

/**
 * Adds the toml entry to the list of its quadrant
 * @param {JSON} tomlAsJson
 */
function addEntry(tomlAsJson) {
  const quadrant = tomlAsJson.config.quadrant;

  if (!entriesByQuadrant[quadrant]) {
    entriesByQuadrant[quadrant] = [];
  }
  entriesByQuadrant[quadrant].push(buildRow(tomlAsJson));
}

/**
 * Builds a table row from the toml JSON.
 * Columns are the [config] values (except "quadrant", "active" and "moved")
 * plus the "support" value from [page].
 * @param {JSON} tomlAsJson
 * @returns {{columns: string[], values: Object}}
 */
function buildRow(tomlAsJson) {
  const config = tomlAsJson.config;

  const excluded = ["quadrant", "active", "moved"];
  const columns = Object.keys(config).filter((key) => !excluded.includes(key));
  columns.push("support");

  let values = {};
  columns.forEach((column) => {
    values[column] = column === "support" ? tomlAsJson.page.support : config[column];
  });

  return { columns, values };
}

/**
 * Writes one markdown file with one heading and table per quadrant
 */
function writeMarkdownFile() {
  const quadrants = [
    ...quadrantOrder.filter((quadrant) => entriesByQuadrant[quadrant]),
    ...Object.keys(entriesByQuadrant).filter((quadrant) => !quadrantOrder.includes(quadrant))
  ];

  let markdown = "";
  quadrants.forEach((quadrant) => {
    const rows = entriesByQuadrant[quadrant].sort((a, b) => a.values.label.localeCompare(b.values.label));

    markdown += `# ${quadrant}\n\n`;
    markdown += buildTable(rows);
    markdown += "\n";
  });

  fs.writeFileSync(outputPath, markdown);
}

/**
 * Builds a markdown table from rows that all share the same columns
 * @param {Array} rows
 * @returns {string} markdown table
 */
function buildTable(rows) {
  const columns = rows[0].columns;

  const headerRow = columns.map(capitalize).join(" | ");
  const separatorRow = columns.map(() => "---").join(" | ");

  let table = `| ${headerRow} |\n`;
  table += `| ${separatorRow} |\n`;
  rows.forEach((row) => {
    const dataRow = columns.map((column) => row.values[column]).join(" | ");
    table += `| ${dataRow} |\n`;
  });

  return table;
}

/**
 * Capitalizes the first letter of a string
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
