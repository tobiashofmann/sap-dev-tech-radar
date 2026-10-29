<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as d3 from 'd3'
import { QUADRANTS, RINGS, blipPosition, ringBoundaryRadii } from '../radarLayout.js'
import { RING_COLORS } from '../ringColors.js'
import RingPill from './RingPill.vue'
import { sanitizeDescription } from '../sanitize.js'
import { TREND_ARROWS, TRENDS } from '../trendIcons.js'

const props = defineProps({
  entries: { type: Array, required: true },
  changes: { type: Object, required: true },
  searchQuery: { type: String, default: '' }
})
const emit = defineEmits(['open-detail'])

const quadrantFilter = ref('All')
const ringFilter = ref('All')
const trendFilter = ref('All')
const selectedId = ref(null)
// Screen F (fullscreen radar): button added here, the actual fullscreen
// layout/behavior is a separate follow-up step.
const isFullscreen = ref(false)

const activeEntries = computed(() => props.entries.filter((e) => e.ring !== 'DEPRECATED'))

const quadrantFiltered = computed(() =>
  quadrantFilter.value === 'All'
    ? activeEntries.value
    : activeEntries.value.filter((e) => e.quadrant === quadrantFilter.value)
)

const trendQuadrantFiltered = computed(() =>
  trendFilter.value === 'All'
    ? quadrantFiltered.value
    : quadrantFiltered.value.filter((e) => e.trend === trendFilter.value)
)

const ringFiltered = computed(() =>
  ringFilter.value === 'All'
    ? trendQuadrantFiltered.value
    : trendQuadrantFiltered.value.filter((e) => e.ring === ringFilter.value)
)

const visibleEntries = computed(() => {
  const q = props.searchQuery.trim().toLowerCase()
  return q ? ringFiltered.value.filter((e) => e.title.toLowerCase().includes(q)) : ringFiltered.value
})

const tileCounts = computed(() => {
  const counts = { ADOPT: 0, USE: 0, HOLD: 0, STOP: 0 }
  trendQuadrantFiltered.value.forEach((e) => { counts[e.ring]++ })
  return counts
})

const totalCount = computed(() => trendQuadrantFiltered.value.length)

const selectedEntry = computed(() =>
  selectedId.value ? props.entries.find((e) => e.id === selectedId.value) : null
)

const changeCounts = computed(() => {
  const counts = { new: 0, moved: 0, deprecated: 0 }
  props.changes.items.forEach((c) => { counts[c.type]++ })
  return counts
})

// --- sortable list ---
const sortKey = ref('number')
const sortAsc = ref(true)
function sortBy(key) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}
const sortedEntries = computed(() => {
  const list = [...visibleEntries.value]
  list.sort((a, b) => {
    const av = sortKey.value === 'number' ? blipNumbers.value[a.id] : a[sortKey.value] ?? ''
    const bv = sortKey.value === 'number' ? blipNumbers.value[b.id] : b[sortKey.value] ?? ''
    return av < bv ? -1 : av > bv ? 1 : 0
  })
  return sortAsc.value ? list : list.reverse()
})

function selectEntry(id) {
  selectedId.value = id
}

function toggleRingFilter(ring) {
  ringFilter.value = ringFilter.value === ring ? 'All' : ring
}

function toggleTrendFilter(trend) {
  trendFilter.value = trendFilter.value === trend ? 'All' : trend
}

// --- Screen F: numbered blips + per-quadrant legend lists (fullscreen) --
// Replaces the earlier "name next to every blip" attempt, which was too
// cluttered in dense areas. Each quadrant gets its own 1..N numbering
// (alphabetical by label, so it's predictable) and its own list, rendered
// outside the radar; the blip itself just shows that number.
// Numbers are unique across the whole radar, not per quadrant - assign
// them first (alphabetical by label, over every visible entry), then
// group into the per-quadrant legend lists for display. A quadrant's list
// therefore isn't 1..N itself; it just shows whichever global numbers
// landed in that quadrant, in ascending order.
const blipNumbers = computed(() => {
  const sorted = visibleEntries.value.slice().sort((a, b) => a.label.localeCompare(b.label))
  const map = {}
  sorted.forEach((e, i) => { map[e.id] = i + 1 })
  return map
})

const quadrantLegends = computed(() => {
  const legends = {}
  QUADRANTS.forEach((q) => {
    legends[q.name] = visibleEntries.value
      .filter((e) => e.quadrant === q.name)
      .map((e) => ({ number: blipNumbers.value[e.id], id: e.id, label: e.label }))
      .sort((a, b) => a.number - b.number)
  })
  return legends
})

// --- radar chart ---
const chart = ref(null)
const CHART_SIZE = 640
const OUTER_RADIUS = 300

function renderChart() {
  const svg = d3.select(chart.value)
  svg.selectAll('*').remove()

  const center = CHART_SIZE / 2
  svg.attr('viewBox', `0 0 ${CHART_SIZE} ${CHART_SIZE}`)

  const g = svg.append('g').attr('transform', `translate(${center},${center})`)

  const boundaries = ringBoundaryRadii(OUTER_RADIUS)
  boundaries.forEach((r) => {
    g.append('circle')
      .attr('r', r)
      .attr('fill', 'none')
      .attr('stroke', '#d9d9d9')
  })

  // quadrant divider lines
  QUADRANTS.forEach((q) => {
    const angle = q.radial_min * Math.PI
    g.append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', OUTER_RADIUS * Math.cos(angle))
      .attr('y2', OUTER_RADIUS * Math.sin(angle))
      .attr('stroke', '#e5e5e5')
  })

  // ring labels, colored per design/DESIGN.md rule 5, along the UI/Technology
  // boundary (straight up from center) at each ring's midpoint radius
  const innerBoundaries = [0, ...boundaries.slice(0, -1)]
  RINGS.forEach((ring, i) => {
    const rMid = (innerBoundaries[i] + boundaries[i]) / 2
    g.append('text')
      .attr('x', 0)
      .attr('y', -rMid)
      .attr('dy', '-4')
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '700')
      .style('letter-spacing', '0.03em')
      .style('fill', RING_COLORS[ring])
      .text(ring)
  })

  // quadrant labels in the small corner gaps between the circle and its own
  // bounding square (the circle fills the chart almost entirely - there's
  // no margin "outside" it to put labels in), per design/DESIGN.md rule 7
  // (UI top-left, Technology top-right, Frameworks bottom-right, Tools
  // bottom-left). Positioned exactly at (+-OUTER_RADIUS, +-OUTER_RADIUS) -
  // the circle's own bounding-square corner - with the anchor/baseline set
  // so the text grows inward from that corner, never past the tangent
  // lines at the circle's outermost points.
  QUADRANTS.forEach((q) => {
    const mid = ((q.radial_min + q.radial_max) / 2) * Math.PI
    const signX = Math.sign(Math.cos(mid))
    const signY = Math.sign(Math.sin(mid))
    const x = signX * OUTER_RADIUS
    const y = signY * OUTER_RADIUS
    g.append('text')
      .attr('x', x)
      .attr('y', y)
      .attr('text-anchor', signX < 0 ? 'start' : 'end')
      .attr('dominant-baseline', signY < 0 ? 'hanging' : 'auto')
      .style('font-size', '13px')
      .style('font-weight', '700')
      .style('fill', 'var(--sap-text-muted, #5b738b)')
      .text(q.name)
  })

  g.selectAll('circle.blip')
    .data(visibleEntries.value, (d) => d.id)
    .join('circle')
    .attr('class', 'blip')
    .attr('cx', (d) => blipPosition(d.id, d.quadrant, d.ring, OUTER_RADIUS)?.x ?? 0)
    .attr('cy', (d) => blipPosition(d.id, d.quadrant, d.ring, OUTER_RADIUS)?.y ?? 0)
    .attr('r', (d) => (d.id === selectedId.value ? 11 : 8))
    .attr('fill', (d) => RING_COLORS[d.ring])
    .attr('stroke', (d) => (d.id === selectedId.value ? '#131e29' : 'none'))
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('click', (_, d) => selectEntry(d.id))
    .append('title')
    .text((d) => `${d.title} (${d.ring}, ${d.quadrant})`)

  // Per-quadrant blip number (see quadrantLegends/blipNumbers above),
  // always shown now - also used as the table's first column.
  g.selectAll('text.blip-number')
    .data(visibleEntries.value, (d) => d.id)
    .join('text')
    .attr('class', 'blip-number')
    .attr('x', (d) => blipPosition(d.id, d.quadrant, d.ring, OUTER_RADIUS)?.x ?? 0)
    .attr('y', (d) => blipPosition(d.id, d.quadrant, d.ring, OUTER_RADIUS)?.y ?? 0)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .style('font-size', '9px')
    .style('font-weight', '700')
    .style('fill', '#fff')
    .style('pointer-events', 'none')
    .text((d) => blipNumbers.value[d.id])
  // --- end Screen F blip numbers -----------------------------------------
}

onMounted(renderChart)
watch([visibleEntries, selectedId, isFullscreen], renderChart)

// Fixed rule: the radar card's bottom edge lines up with the side cards
// column's bottom edge, and side-cards fills the rest of the row (up to
// the tiles/table width) instead of a fixed column.
//
// This can't be a live two-way binding: side-cards' height depends on its
// own width (text re-wraps), and its width depends on the radar's width
// (which depends on side-cards' height, for the square match) - watching
// side-cards and reacting on every resize chases that loop to a collapsed
// extreme (verified: side-cards -> 0, radar -> huge). Instead this
// measures once - side-cards' height at its CSS default width (see
// .radar-card's flex-basis below, a reasonable starting guess) - sets the
// radar's square size from that single reading, and stops. Not pixel-
// perfect if that first guess was off, but stable. Re-measures (same
// one-shot way) on real window resizes, debounced.
const sideCards = ref(null)
const radarSize = ref(null)
let resizeTimer = null

function measureRadarSize() {
  if (sideCards.value) {
    radarSize.value = sideCards.value.getBoundingClientRect().height
  }
}

function onWindowResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(measureRadarSize, 200)
}

onMounted(() => {
  requestAnimationFrame(measureRadarSize)
  window.addEventListener('resize', onWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  clearTimeout(resizeTimer)
})

// Screen F: fullscreen radar. Tiles/filters/side-cards/list hide, the
// radar card breaks out of #app's max-width and centers at 70% of the
// actual viewport width (not the constrained content width), height
// following via the existing aspect-ratio: 1/1 - no JS sizing needed
// there. radarSize (the bottom-alignment measurement) is irrelevant while
// fullscreen, so skip it; re-measure once on exit in case the window was
// resized meanwhile.
const radarCardWrapperStyle = computed(() =>
  isFullscreen.value
    ? { width: '70vw' }
    : radarSize.value ? { width: radarSize.value + 'px' } : {}
)
const radarCardInnerStyle = computed(() =>
  isFullscreen.value || !radarSize.value
    ? {}
    : { width: radarSize.value + 'px', height: radarSize.value + 'px' }
)

function onKeydown(e) {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
  }
}

watch(isFullscreen, (value) => {
  if (!value) {
    requestAnimationFrame(measureRadarSize)
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

// Selecting a technology swaps "About this radar" for "Selected technology",
// which can be much taller (a long description). Rule: the primary card
// (About/Selected) may grow up to 60% of the fixed side-cards height
// (radarSize) before it has to scroll internally; Rings-at-a-glance gets
// whatever's left (as little as ~40%), scrolling internally too if even
// that doesn't fit its own content. Measured in sequence (natural size,
// then capped, then the other card's budget from what's actually left) -
// one-directional, not a live two-way binding, so it can't loop.
const primaryCard = ref(null)
const primaryBody = ref(null)
const glanceCard = ref(null)
const glanceBody = ref(null)
const primaryScroll = ref({ up: false, down: false })
const glanceScroll = ref({ up: false, down: false })
const GAP = 16

function checkScrollFade(el, state) {
  if (!el) return
  state.up = el.scrollTop > 1
  state.down = el.scrollTop + el.clientHeight < el.scrollHeight - 1
}

function capBodyHeight(cardEl, bodyEl, budget) {
  if (!cardEl || !bodyEl) return
  bodyEl.style.maxHeight = ''
  const natural = cardEl.getBoundingClientRect().height
  if (natural > budget) {
    const bodyNatural = bodyEl.getBoundingClientRect().height
    bodyEl.style.maxHeight = Math.max(0, bodyNatural - (natural - budget)) + 'px'
  }
}

// Vue's nextTick only waits for Vue's own DOM patch - ui5-card is a Lit-
// based web component with its own internal update cycle that can still be
// pending right after that (verified: measuring immediately after
// nextTick() read a stale, pre-layout height). A double rAF reliably waits
// out a full browser layout/paint cycle on top of it.
function waitForLayout() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

async function layoutSideCards() {
  // selecting/deselecting a technology swaps which ui5-card primaryCard
  // points to (v-if/v-else) - wait for that DOM patch before measuring,
  // otherwise this runs against the about-to-be-replaced element.
  await nextTick()
  await waitForLayout()
  if (!radarSize.value || !primaryCard.value) {
    return
  }
  const total = radarSize.value

  capBodyHeight(primaryCard.value, primaryBody.value, total * 0.6)
  await waitForLayout()

  if (glanceCard.value) {
    const primaryActual = primaryCard.value.getBoundingClientRect().height
    capBodyHeight(glanceCard.value, glanceBody.value, Math.max(0, total - primaryActual - GAP))
    await waitForLayout()
  }

  checkScrollFade(primaryBody.value, primaryScroll.value)
  checkScrollFade(glanceBody.value, glanceScroll.value)
}

watch([selectedEntry, radarSize], layoutSideCards)
</script>

<template>
  <div class="radar-page" :class="{ fullscreen: isFullscreen }">
    <div v-if="!isFullscreen" class="tiles">
      <ui5-card class="tile" :class="{ active: ringFilter === 'All' }" @click="ringFilter = 'All'">
        <div class="tile-body">
          <div class="tile-label">Total</div>
          <div class="tile-count">{{ totalCount }}</div>
        </div>
      </ui5-card>
      <ui5-card
        v-for="ring in RINGS"
        :key="ring"
        class="tile"
        :class="{ active: ringFilter === ring }"
        @click="toggleRingFilter(ring)"
      >
        <div class="tile-body">
          <div class="tile-label">{{ ring }}</div>
          <div class="tile-count" :style="{ color: RING_COLORS[ring] }">{{ tileCounts[ring] }}</div>
        </div>
      </ui5-card>
    </div>

    <div v-if="!isFullscreen" class="filters">
      <div class="filter-group">
        <span class="filter-label">Quadrant:</span>
        <button class="chip" :class="{ on: quadrantFilter === 'All' }" @click="quadrantFilter = 'All'">All</button>
        <button
          v-for="q in QUADRANTS"
          :key="q.name"
          class="chip"
          :class="{ on: quadrantFilter === q.name }"
          @click="quadrantFilter = q.name"
        >{{ q.name }}</button>
      </div>
      <div class="filter-group">
        <span class="filter-label">Ring:</span>
        <button class="chip" :class="{ on: ringFilter === 'All' }" @click="ringFilter = 'All'">All</button>
        <button
          v-for="r in RINGS"
          :key="r"
          class="chip"
          :class="{ on: ringFilter === r }"
          @click="toggleRingFilter(r)"
        ><span class="dot" :style="{ background: RING_COLORS[r] }"></span>{{ r }}</button>
      </div>
      <div class="filter-group">
        <span class="filter-label">Trend:</span>
        <button class="chip" :class="{ on: trendFilter === 'All' }" @click="trendFilter = 'All'">All</button>
        <button
          v-for="t in TRENDS"
          :key="t"
          class="chip chip-icon"
          :class="{ on: trendFilter === t }"
          :title="t"
          :aria-label="t"
          @click="toggleTrendFilter(t)"
        >{{ TREND_ARROWS[t] }}</button>
      </div>
    </div>

    <div class="main-area">
      <div class="radar-card-wrapper" :style="radarCardWrapperStyle">
        <ui5-card class="radar-card">
          <div class="radar-card-inner" :style="radarCardInnerStyle">
            <svg ref="chart" class="radar-chart"></svg>
          </div>
        </ui5-card>

        <ui5-button
          class="fullscreen-toggle"
          :icon="isFullscreen ? 'exit-full-screen' : 'full-screen'"
          design="Transparent"
          :accessible-name="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
          :tooltip="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
          @click="isFullscreen = !isFullscreen"
        ></ui5-button>
      </div>

      <template v-if="isFullscreen">
        <div class="quadrant-legend legend-left">
          <div class="legend-block">
            <h4>UI</h4>
            <ol>
              <li v-for="item in quadrantLegends.UI" :key="item.id" :class="{ selected: item.id === selectedId }" @click="selectEntry(item.id)">
                <span class="num">{{ item.number }}</span>{{ item.label }}
              </li>
            </ol>
          </div>
          <div class="legend-block">
            <h4>Tools</h4>
            <ol>
              <li v-for="item in quadrantLegends.Tools" :key="item.id" :class="{ selected: item.id === selectedId }" @click="selectEntry(item.id)">
                <span class="num">{{ item.number }}</span>{{ item.label }}
              </li>
            </ol>
          </div>
        </div>
        <div class="quadrant-legend legend-right">
          <div class="legend-block">
            <h4>Technology</h4>
            <ol>
              <li v-for="item in quadrantLegends.Technology" :key="item.id" :class="{ selected: item.id === selectedId }" @click="selectEntry(item.id)">
                <span class="num">{{ item.number }}</span>{{ item.label }}
              </li>
            </ol>
          </div>
          <div class="legend-block">
            <h4>Frameworks</h4>
            <ol>
              <li v-for="item in quadrantLegends.Frameworks" :key="item.id" :class="{ selected: item.id === selectedId }" @click="selectEntry(item.id)">
                <span class="num">{{ item.number }}</span>{{ item.label }}
              </li>
            </ol>
          </div>
        </div>
      </template>

      <div v-if="!isFullscreen" class="side-cards" ref="sideCards">
        <ui5-card v-if="!selectedEntry" ref="primaryCard">
          <ui5-card-header slot="header" title-text="About this radar"></ui5-card-header>
          <div
            class="card-body scroll-fade"
            ref="primaryBody"
            :class="{ 'fade-top': primaryScroll.up, 'fade-bottom': primaryScroll.down }"
            @scroll="checkScrollFade(primaryBody, primaryScroll)"
          >
            <p>The SAP Development Tech Radar gives guidance on which technologies to use when
              building SAP applications. Every technology sits in one quadrant and one ring.</p>
            <p>Select a blip or a filter to see details here.</p>
            <p v-if="changes.previousRelease">
              Changes since {{ changes.previousRelease }}:
              &#10022; {{ changeCounts.new }} new &middot;
              &rarr; {{ changeCounts.moved }} moved to next ring &middot;
              &#8856; {{ changeCounts.deprecated }} deprecated
            </p>
          </div>
        </ui5-card>

        <ui5-card v-else ref="primaryCard">
          <ui5-card-header slot="header" title-text="Selected technology" :subtitle-text="selectedEntry.title"></ui5-card-header>
          <div
            class="card-body scroll-fade"
            ref="primaryBody"
            :class="{ 'fade-top': primaryScroll.up, 'fade-bottom': primaryScroll.down }"
            @scroll="checkScrollFade(primaryBody, primaryScroll)"
          >
            <p v-html="sanitizeDescription(selectedEntry.description)"></p>
            <p>Ring: <b>{{ selectedEntry.ring }}</b> &middot; Quadrant: <b>{{ selectedEntry.quadrant }}</b>
              &middot; Trend: <b>{{ TREND_ARROWS[selectedEntry.trend] }} {{ selectedEntry.trend }}</b></p>
            <p>Reason: {{ selectedEntry.reason }}</p>
            <ui5-button @click="emit('open-detail', selectedEntry.id)">Open detail page &rarr;</ui5-button>
          </div>
        </ui5-card>

        <ui5-card ref="glanceCard">
          <ui5-card-header slot="header" title-text="Rings at a glance"></ui5-card-header>
          <div
            class="card-body scroll-fade"
            ref="glanceBody"
            :class="{ 'fade-top': glanceScroll.up, 'fade-bottom': glanceScroll.down }"
            @scroll="checkScrollFade(glanceBody, glanceScroll)"
          >
            <div class="rings-glance">
              <div class="row">
                <RingPill ring="ADOPT" />
                <div class="row-text"><b>Assess now</b><span>New, stabilizing - may succeed a HOLD/STOP tech</span></div>
              </div>
              <div class="row">
                <RingPill ring="USE" />
                <div class="row-text"><b>Recommended for new projects</b><span>Supported, stable, with roadmap</span></div>
              </div>
              <div class="row">
                <RingPill ring="HOLD" />
                <div class="row-text"><b>Only if no alternative</b><span>Don't start new products with it</span></div>
              </div>
              <div class="row">
                <RingPill ring="STOP" />
                <div class="row-text"><b>Migrate away</b><span>Obsolete, EOL defined</span></div>
              </div>
              <div class="row">
                <RingPill ring="DEPRECATED" />
                <div class="row-text"><b>Removed from radar</b><span>Not shown on the radar</span></div>
              </div>
            </div>
          </div>
        </ui5-card>
      </div>
    </div>

    <div v-if="!isFullscreen" class="table-wrap">
      <table class="list-view">
        <thead>
          <tr>
            <th class="num-col" @click="sortBy('number')">#</th>
            <th @click="sortBy('title')">Technology</th>
            <th @click="sortBy('quadrant')">Quadrant</th>
            <th @click="sortBy('ring')">Ring</th>
            <th>Trend</th>
            <th @click="sortBy('lastChangedRelease')">Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="e in sortedEntries"
            :key="e.id"
            :class="{ selected: e.id === selectedId }"
            @click="selectEntry(e.id)"
          >
            <td class="num-col">{{ blipNumbers[e.id] }}</td>
            <td><a href="#" @click.prevent="emit('open-detail', e.id)">{{ e.title }}</a></td>
            <td>{{ e.quadrant }}</td>
            <td><RingPill :ring="e.ring" /></td>
            <td>{{ TREND_ARROWS[e.trend] }} {{ e.trend }}</td>
            <td>{{ e.lastChangedRelease ?? 'current' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.radar-page { padding: 1rem 1.5rem 2rem; }
.tiles { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
.tiles ui5-card.tile { flex: 1 1 0; min-width: 140px; cursor: pointer; }
.tiles ui5-card.tile.active { outline: 2px solid var(--sap-adopt, #0064d9); }
.tile-body { padding: 0.9rem 1.1rem; }
.tile-label { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.03em; color: var(--sap-text-muted, #5b738b); margin-bottom: 0.3rem; }
.tile-count { font-size: 1.6rem; font-weight: 700; }

.filters { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 0.5rem 2.5rem; margin-bottom: 1rem; }
.filter-group { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.filter-label { font-size: 0.85rem; color: var(--sap-text-muted, #5b738b); margin-right: 0.3rem; }
.chip {
  border: 1px solid var(--sap-border, #d9d9d9);
  background: #fff;
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.chip.on {
  background: #e5f0fc;
  border-color: var(--sap-adopt, #0064d9);
  color: var(--sap-adopt, #0064d9);
  font-weight: 600;
}
.chip .dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; display: inline-block; }
.chip-icon { padding: 0.3rem 0.6rem; font-size: 0.9rem; line-height: 1; }

.main-area { display: flex; gap: 1.5rem; align-items: flex-start; }

/* Screen F: break .main-area out of #app's max-width: 1280px so the
   radar can center on the full viewport width, not just the constrained
   content column. */
.radar-page.fullscreen .main-area {
  width: 100vw;
  position: relative;
  left: 50%;
  margin-left: -50vw;
  justify-content: center;
}

/* Screen F: per-quadrant legend lists in the margins left/right of the
   centered (70vw) radar - UI/Tools on the left (matching their top-left/
   bottom-left blip positions), Technology/Frameworks on the right. */
.quadrant-legend {
  position: absolute;
  top: 1rem;
  bottom: 1rem;
  width: 15vw;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.8rem;
}
.quadrant-legend.legend-left { left: 0; padding: 0 2.5rem 0 1rem; }
.quadrant-legend.legend-right { right: 0; padding: 0 1rem 0 2.5rem; }
.legend-block { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; }
.legend-block h4 {
  margin: 0 0 0.4rem;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--sap-text-muted, #5b738b);
}
.legend-block ol {
  flex: 1 1 auto;
  min-height: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}
.legend-block li {
  padding: 0.1rem 0.3rem;
  margin: 0 -0.3rem;
  border-radius: 0.25rem;
  cursor: pointer;
}
.legend-block li:hover { color: var(--sap-adopt, #0064d9); }
.legend-block li.selected {
  background: #eef4fb;
  color: var(--sap-adopt, #0064d9);
  font-weight: 700;
}
.legend-block li.selected .num { color: var(--sap-adopt, #0064d9); }
.legend-block .num {
  display: inline-block;
  width: 1.6em;
  font-weight: 700;
  color: var(--sap-text-muted, #5b738b);
}
.radar-card-wrapper { position: relative; flex: 0 0 auto; width: 600px; }
.radar-card { display: block; width: 100%; }
.fullscreen-toggle {
  position: absolute;
  top: -14px;
  right: -14px;
  z-index: 2;
  border-radius: 50%;
  background: var(--sap-tile-bg, #fff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.radar-card-inner { padding: 1rem; aspect-ratio: 1 / 1; }
.radar-chart { width: 100%; height: 100%; display: block; }
.side-cards { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1rem; }
.card-body { padding: 0.75rem 1rem 1rem; }

/* scrollable card bodies (side-cards is a fixed height once a technology
   is selected - see layoutSideCards): no visible scrollbar, instead a
   gray-to-transparent fade at whichever edge(s) still have more content,
   using sticky pseudo-elements so no extra wrapper markup is needed. */
.scroll-fade {
  overflow-y: auto;
  scrollbar-width: none;
}
.scroll-fade::-webkit-scrollbar { display: none; }
.scroll-fade::before,
.scroll-fade::after {
  content: '';
  display: block;
  position: sticky;
  left: 0;
  right: 0;
  height: 28px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
}
.scroll-fade::before {
  top: 0;
  margin-bottom: -28px;
  background: linear-gradient(to bottom, var(--sap-tile-bg, #fff), transparent);
}
.scroll-fade::after {
  bottom: 0;
  margin-top: -28px;
  background: linear-gradient(to top, var(--sap-tile-bg, #fff), transparent);
}
.scroll-fade.fade-top::before { opacity: 1; }
.scroll-fade.fade-bottom::after { opacity: 1; }
.rings-glance { display: grid; grid-template-columns: auto 1fr; column-gap: 0.75rem; row-gap: 0.9rem; font-size: 0.85rem; }
.rings-glance .row { display: contents; }
.rings-glance :deep(.ring-pill) { justify-self: start; align-self: start; }
.rings-glance .row-text { display: flex; flex-direction: column; gap: 0.2rem; }
.rings-glance .row-text span { color: var(--sap-text-muted, #5b738b); }
.table-wrap { overflow-x: auto; }
.list-view { width: 100%; min-width: 640px; margin-top: 1.5rem; border-collapse: collapse; }
.list-view th { text-align: left; cursor: pointer; border-bottom: 1px solid var(--sap-border, #ccc); padding: 0.5rem 0.4rem; font-size: 0.8rem; color: var(--sap-text-muted, #5b738b); text-transform: uppercase; letter-spacing: 0.02em; }
.list-view td { padding: 0.5rem 0.4rem; border-bottom: 1px solid #f0f0f0; }
.list-view .num-col { width: 2rem; color: var(--sap-text-muted, #5b738b); }
.list-view td.num-col { cursor: default; }
.list-view tr { cursor: pointer; }
.list-view tr.selected { background: #eef4fb; }

/* Tablet (iPad 10" portrait ~810-834px, landscape ~1080-1194px) and
   anything narrower than the mock's fixed 1280px desktop frame: stack the
   radar and side cards instead of forcing them side by side. */
@media (max-width: 1100px) {
  .main-area { flex-direction: column; }
  .radar-card-wrapper { flex: 0 0 auto; width: 100% !important; }
  .radar-card-inner { width: 100% !important; height: auto !important; }
  .side-cards { flex: 0 0 auto; width: 100%; }
  .side-cards ui5-card { width: 100%; }
}

@media (max-width: 600px) {
  .tiles ui5-card.tile { flex: 1 1 calc(50% - 0.75rem); }
}
</style>
