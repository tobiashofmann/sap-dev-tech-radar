import DOMPurify from 'dompurify'

// definitions/**/*.toml's [page].description is reviewed/voted-on content
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

export function sanitizeDescription(html) {
  return DOMPurify.sanitize(html ?? '', { ALLOWED_TAGS, ALLOWED_ATTR })
}
