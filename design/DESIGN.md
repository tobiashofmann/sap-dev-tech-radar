# SAP Development Tech Radar (SDTR) – Design Guide

This file explains how the UI design in `design/tech-radar-mock.html` works, so it can be implemented faithfully. The mock is a static design canvas (not production code): open it in a browser and scroll horizontally/vertically to see all screens side by side.

Real site (current version): <https://tobiashofmann.github.io/sap-dev-tech-radar/> – hosted on GitHub Pages.

## 1. How to read the mock

- Every screen is a framed card (1280 px wide) with a caption above it (`A1`, `A2`, …).
- Red numbered badges are **annotations**, not UI. They mark things worth discussing. Do not implement them.
- The footnote at the bottom lists what is placeholder data. Treat everything listed there as fake (counts, blip positions, "Joule APIs", version number, repo URL, intro/legal texts, related items). Only MDK (ring USE, quadrant UI, trend stable) and the Deprecated list come from the real site.
- Theme: **SAP Fiori "Horizon"** (CSS variables `--sap*`, light + `[data-theme="dark"]`), font **"72"** (+ SAP icon fonts). Prefer the real SAP theming / UI5 Web Components over copying the mock's hand-written CSS if the project uses them.

## 2. Domain rules (must hold everywhere)

1. **Quadrants (4):** UI, Technology, Tools, Frameworks.
2. **Rings and their lifecycle order, one direction only:**
   `Adopt → Use → Hold → Stop → Deprecated`
   A technology never moves backwards. New technologies start in Adopt.
3. **Deprecated is not shown on the radar.** It is not a ring on the radar, has no blips, and no filter chip. Deprecated technologies are only listed on the separate Deprecated page. The "Rings at a glance" card mentions it as a fifth, grey row with a link.
4. **Release naming:** `YYYY-06` or `YYYY-12` (e.g. `2025-12`, `2026-06`, `2026-12`). Never `H1`/`H2`.
5. **Ring colors (use the same everywhere – blips, chips, pills, counters):**

   | Ring | Color | Hex (mock) |
   | --- | --- | --- |
   | Adopt | blue | `#0064d9` |
   | Use | green | `#256f3a` |
   | Hold | yellow | `#f0ab00` (pill text/border darker `#a34400`) |
   | Stop | red | `#d20a0a` |
   | Deprecated | grey | `#556b82` on `#eef0f2`, border `#8396a8` |

   Blue means Adopt and nothing else. Do not use blue for selection or focus markers on blips (the selected blip gets a dark `#131e29` outline instead).
6. **Ring meaning (texts in "Rings at a glance"):**
   - Adopt – *Assess now*: new, stabilizing – may succeed a HOLD/STOP tech
   - Use – *Recommended for new projects*: supported, stable, with roadmap
   - Hold – *Only if no alternative*: don't start new products with it
   - Stop – *Migrate away*: obsolete, EOL defined
   - Deprecated – *Removed from radar*: not shown on the radar, see Deprecated page
7. **Radar geometry:** concentric rings, center → outside = Adopt, Use, Hold, Stop. Quadrants are the four sectors (UI top-left, Technology top-right, Tools bottom-left, Frameworks bottom-right). A blip's distance from the center must match its ring (Adopt innermost). The mock's blip positions are illustrative; real positions come from data.

## 3. Shared page frame

Header bar (all pages):

- Left: title "SAP Development Tech Radar", release (`· Release 2026-06`).
- Tabs: **Radar | List | Changes** (active tab underlined, blue).
- Right: search field ("Search technology…"), release selector, round **ⓘ info button**.
- Detail and Deprecated pages show a breadcrumb instead of the tabs (`Radar › UI › MDK`, `Radar › Deprecated`).

Info dialog (screen E, opened by ⓘ on any page): SDTR version + radar release + GitHub repo link; "About" text (the intro text that sits under the radar on the current site); Legal & privacy (hosted on GitHub Pages, privacy notice, imprint, GitHub privacy statement); Close button. All texts are placeholders; legal wording must be confirmed.

Pills: ring badge = rounded rectangle with ring name in capitals, ring-colored text/border and a light tinted background. Chips: neutral rounded buttons; `on` state = light blue background, blue border/text (filter selected).

## 4. Screens

### A1 – Radar page (default, nothing selected)

Top to bottom:

1. **Four counter tiles** – number of technologies per ring (Adopt, Use, Hold, Stop). Clicking a tile is not designed; in filtered screens the active ring tile gets a blue outline.
2. **Filter row** – `Quadrant:` All/UI/Technology/Tools/Frameworks, `Ring:` All/Adopt/Use/Hold/Stop (ring chips show a colored dot; **no** Deprecated chip). Far right: link **＋ Suggest a change** (covers new technologies, ring changes, text/link corrections).
3. **Two-column area**
   - Left: **radar** (SVG). Top-right corner has a **fullscreen button** (⛶) that sticks out of the card corner. With nothing selected, no blip has a selection ring or label.
   - Right, stacked cards:
     - **Rings at a glance** – a 3-column grid so everything aligns like a table: badges left-aligned in column 1, bold meaning in column 2, description in column 3. Five rows (the fifth is Deprecated, grey, with link "see Deprecated page").
     - **About this radar** – intro text, hint "Select a blip or a filter to see details here.", and a summary line `✦ 1 new · → 3 moved to next ring · ⊘ 1 deprecated` with link **View all changes →** (leads to screen D).
4. **List view** (sortable table): Technology (link), Quadrant, Ring (pill), Trend, Updated.

### A2 – Filter Quadrant = UI

- Quadrant chip UI is `on`. Other quadrants of the radar are faded; UI blips are labeled with their names.
- Counter tiles show counts for the filtered set.
- The right-hand second card changes from "About this radar" to **Selected technology** (here MDK): title, description, Ring, Quadrant, Trend, Reason, link "Open detail page →".
- The selected blip has a dark outline + label; the matching list row is highlighted; the list shows only UI technologies.

### A3 – Filter Ring = Adopt

- Ring chip Adopt is `on`, the Adopt tile is outlined. Only Adopt blips keep color (blue, labeled); all others are grey.
- Second card describes the ring ("Assess now", count, distribution per quadrant). The list shows only Adopt technologies.
- Blips of the same ring must lie in that ring's zone.

### B – Detail page (MDK)

Header card (name, description, ring pill, quadrant chip, trend chip; previous ring, last change, support) → "What to do" card (recommendation + reason + link to ring proposal/vote) → **Ring history** (timeline of ring pills per release, strictly forward) → **References** (documentation, API reference, tutorials, samples, learning journey) → right column: **Position on radar** (quadrant excerpt with the technology highlighted + link "Show on full radar →") and **Related technologies**.

- Related technologies is a **curated list** with only three columns: Technology (link), Quadrant, Ring. No relation labels such as "alternative" (not verifiable). Entries may come from other quadrants and may be Deprecated (grey pill).

### C – Deprecated page

Mirrors the real page: heading "Deprecated Technologies", intro sentence ("This page lists all technologies that have been marked as deprecated in the SAP Development Tech Radar."), one table: Title (link to detail page), Quadrant, Deprecated since (`2026-06`). Nine entries today: WDJ, J2EE, BSP (UI); WebIDE, Kapsel (Tools); XSC, Portal, Neo, Cluster Table (Technology). No filters, no ring column.

### D – Changes page (A1 › View all changes)

Heading "Changes since <previous release>", intro sentence stating that rings only progress forward. Three tiles: **→ Next ring**, **⊘ Deprecated**, **✦ New**. Filters: Change (All/New/Next ring/Deprecated), Quadrant, and "Compare with" release selector. Table: Technology, Quadrant, Change, Ring previous → now (pills), Reason. There is no "moved in/out" – only forward moves, new, and deprecated (STOP → DEPRECATED).

### E – Info dialog

See section 3.

### F – Radar fullscreen (A1 › ⛶)

Fullscreen shows the **header bar and the filter row** (same as A1, plus an "Exit fullscreen" button at the right end of the filter row) and the radar as large as the viewport allows. Counter tiles, Rings-at-a-glance, About and list are hidden. **Every blip shows its technology name** next to it (labels may flip left/above to avoid collisions; names can be shortened). Esc exits fullscreen.

### G – Radar hover (A1 › mouse over a blip)

Hovered blip is enlarged with a white outline and a soft halo in its ring color; a **tooltip** appears next to it with technology name, ring pill and quadrant. Click opens the selection (see A2). The tooltip intentionally contains nothing else.

## 5. Behavior summary

- Filters combine (quadrant AND ring); "All" resets that dimension. Filtering updates: counters, radar (non-matching blips faded/grey, matching labeled), second card, list.
- Selecting a blip or list row sets the **selected technology** (outline + detail card + highlighted row). With nothing selected, show the "About this radar" card and no outline.
- Hover → screen G. Fullscreen button → screen F. Info button → E. "View all changes" → D. "see Deprecated page" / "Deprecated page" → C. Technology links → B. "＋ Suggest a change" opens the contribution flow (not designed yet; on a detail page it should pre-fill the technology: "Suggest a change to this technology").
- Responsive behavior is not designed; the mock is desktop only (1280 px frames).

## 6. Implementation notes

- Data per technology (minimum): `title`, `description`, `quadrant`, `ring` (adopt|use|hold|stop|deprecated), `trend`, `reason`, `releaseHistory[]` (release → ring, forward only), `links[]`, `related[]` (list of technology ids), blip position (angle, radius within ring).
- Validate on load/build: ring order is forward-only in `releaseHistory`; release strings match `^\d{4}-(06|12)$`; deprecated technologies are excluded from radar rendering and counters.
- Keep ring colors in one place (CSS variables) – the same values drive blips, chips, pills, tiles, legend.
- Placeholder content (see footnote of the mock) must be replaced by real data/texts; do not ship it.
- Open points: what "Suggest a change" opens (form vs. GitHub issue/PR), exact intro text, legal texts, real SDTR version scheme.
