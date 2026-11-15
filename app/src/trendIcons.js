/**
 * Per-trend arrow glyph, same convention as the legacy site's trend arrows
 * (graph-up/arrow-right/graph-down).
 * @type {Object.<string, string>}
 */
export const TREND_ARROWS = {
  positive: '↑',
  stable: '→',
  negative: '↓'
}

/**
 * Valid `[config].trend` values, in display order.
 * @type {string[]}
 */
export const TRENDS = ['positive', 'stable', 'negative']
