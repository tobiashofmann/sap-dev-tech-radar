import DOMPurify from 'dompurify'

// definitions/**/*.toml's [page] texts (description, reason,
// recommendation) may contain HTML - in practice <br>/<br/> line breaks,
// which the legacy site needs because it inserts these texts into its
// HTML template as-is. The app therefore has to render them as HTML too
// (v-html), or the tags show up as literal text.
//
// [page] content is reviewed/voted-on content
// (see PROCESS.md), not arbitrary runtime user input - but the review is a
// content quality check, not a security review, and SAP employees are
// specifically excluded from voting to keep the radar vendor-independent,
// so the reviewer pool isn't guaranteed to catch a malicious payload.
// CLAUDE.md documents only "HTML allowed, e.g. <br/>" as the intended use;
// a scan of today's definitions/**/*.toml confirms only <br> is ever used
// in practice. Sanitize with a narrow allow-list before v-html instead of
// trusting it outright.
const ALLOWED_TAGS = ['br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li']
const ALLOWED_ATTR = ['href', 'target', 'rel']

/**
 * Sanitizes one of a technology's `[page]` texts (description, reason,
 * recommendation) before it's rendered with v-html, allowing only the
 * narrow tag/attribute set CLAUDE.md documents as intended (see the
 * module comment above for why this matters despite the content being
 * reviewed/voted-on, not raw user input).
 * @param {string} html
 * @returns {string} sanitized HTML
 */
export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html ?? '', { ALLOWED_TAGS, ALLOWED_ATTR })
}

/**
 * sanitizeHtml() under its original name, for `[page].description`.
 * @param {string} html
 * @returns {string} sanitized HTML
 */
export function sanitizeDescription(html) {
  return sanitizeHtml(html)
}
