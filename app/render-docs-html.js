/*!
 * Renders vue-docgen-cli's raw per-component Markdown output into simple,
 * navigable HTML - GitHub Pages serves .md as plain text, not rendered,
 * so a link to it from the app's QA section would be unusable otherwise.
 * Walks the given directory recursively (vue-docgen mirrors each
 * component's own src/... path), converts every *.md to *.html in place,
 * writes an index.html listing them all, then removes the original .md
 * files (safe - this only ever runs against a gitignored build artifact).
 * Copyright(c) 2026 Tobias Hofmann
 * Apache Licensed
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const PAGE_STYLE = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 48rem; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.6; color: #1a1a1a; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { text-align: left; padding: 0.4rem 0.75rem; border-bottom: 1px solid #e4e7eb; }
  th { background: #f6f8fa; }
  code { background: #f6f8fa; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.9em; }
  a { color: #0064d9; }
`;

/**
 * Wraps rendered markdown body HTML in a minimal standalone page.
 * @param {string} title
 * @param {string} bodyHtml
 * @returns {string}
 */
function page(title, bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

/**
 * Recursively finds every *.md file under a directory.
 * @param {string} dir
 * @returns {string[]} absolute paths
 */
function findMarkdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return findMarkdownFiles(fullPath);
    }
    return entry.name.endsWith('.md') ? [fullPath] : [];
  });
}

const outDir = process.argv[2];
if (!outDir) {
  console.error('Usage: node render-docs-html.js <vue-docgen output directory>');
  process.exit(1);
}

const markdownFiles = findMarkdownFiles(outDir);

const indexEntries = markdownFiles.map((mdPath) => {
  const componentName = path.basename(mdPath, '.md');
  const htmlPath = mdPath.replace(/\.md$/, '.html');
  const bodyHtml = marked.parse(fs.readFileSync(mdPath, 'utf8'));
  fs.writeFileSync(htmlPath, page(componentName, bodyHtml));
  return { componentName, relHtmlPath: path.relative(outDir, htmlPath) };
});

indexEntries.sort((a, b) => a.componentName.localeCompare(b.componentName));
const indexBody = `<h1>Vue components</h1>\n<ul>\n${indexEntries
  .map(({ componentName, relHtmlPath }) => `  <li><a href="${relHtmlPath}">${componentName}</a></li>`)
  .join('\n')}\n</ul>`;
fs.writeFileSync(path.join(outDir, 'index.html'), page('Vue components', indexBody));

markdownFiles.forEach((mdPath) => fs.unlinkSync(mdPath));

console.log(`rendered ${indexEntries.length} component page(s) to ${outDir}`);
