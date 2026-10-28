<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import * as d3 from 'd3'
import { QUADRANTS, RINGS, blipPosition, ringBoundaryRadii } from '../radarLayout.js'
import { RING_COLORS } from '../ringColors.js'
import RingPill from './RingPill.vue'
import { sanitizeDescription } from '../sanitize.js'

const props = defineProps({
  entries: { type: Array, required: true },
  changes: { type: Object, required: true }
})
const emit = defineEmits(['open-detail'])

const quadrantFilter = ref('All')
const ringFilter = ref('All')
const selectedId = ref(null)

const activeEntries = computed(() => props.entries.filter((e) => e.ring !== 'DEPRECATED'))

const quadrantFiltered = computed(() =>
  quadrantFilter.value === 'All'
    ? activeEntries.value
    : activeEntries.value.filter((e) => e.quadrant === quadrantFilter.value)
)

const visibleEntries = computed(() =>
  ringFilter.value === 'All'
    ? quadrantFiltered.value
    : quadrantFiltered.value.filter((e) => e.ring === ringFilter.value)
)

const tileCounts = computed(() => {
  const counts = { ADOPT: 0, USE: 0, HOLD: 0, STOP: 0 }
  quadrantFiltered.value.forEach((e) => { counts[e.ring]++ })
  return counts
})

const totalCount = computed(() => quadrantFiltered.value.length)

const selectedEntry = computed(() =>
  selectedId.value ? props.entries.find((e) => e.id === selectedId.value) : null
)

const changeCounts = computed(() => {
  const counts = { new: 0, moved: 0, deprecated: 0 }
  props.changes.items.forEach((c) => { counts[c.type]++ })
  return counts
})

// --- sortable list ---
const sortKey = ref('title')
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
    const av = a[sortKey.value] ?? ''
    const bv = b[sortKey.value] ?? ''
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

// --- radar chart ---
const chart = ref(null)
const CHART_SIZE = 680
const OUTER_RADIUS = 220

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

  // quadrant labels just outside the outer ring, per design/DESIGN.md rule 7
  // (UI top-left, Technology top-right, Frameworks bottom-right, Tools bottom-left)
  QUADRANTS.forEach((q) => {
    const mid = ((q.radial_min + q.radial_max) / 2) * Math.PI
    const r = OUTER_RADIUS + 22
    const x = r * Math.cos(mid)
    const y = r * Math.sin(mid)
    g.append('text')
      .attr('x', x)
      .attr('y', y)
      .attr('text-anchor', x < -5 ? 'end' : x > 5 ? 'start' : 'middle')
      .attr('dominant-baseline', y < 0 ? 'auto' : 'hanging')
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
    .attr('r', (d) => (d.id === selectedId.value ? 8 : 5))
    .attr('fill', (d) => RING_COLORS[d.ring])
    .attr('stroke', (d) => (d.id === selectedId.value ? '#131e29' : 'none'))
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('click', (_, d) => selectEntry(d.id))
    .append('title')
    .text((d) => `${d.title} (${d.ring}, ${d.quadrant})`)
}

onMounted(renderChart)
watch([visibleEntries, selectedId], renderChart)
</script>

<template>
  <div class="radar-page">
    <div class="tiles">
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

    <div class="filters">
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
    </div>

    <div class="main-area">
      <svg ref="chart" class="radar-chart"></svg>

      <div class="side-cards">
        <ui5-card>
          <ui5-card-header slot="header" title-text="Rings at a glance"></ui5-card-header>
          <div class="card-body rings-glance">
            <div class="row"><RingPill ring="ADOPT" /><b>Assess now</b><span>New, stabilizing - may succeed a HOLD/STOP tech</span></div>
            <div class="row"><RingPill ring="USE" /><b>Recommended for new projects</b><span>Supported, stable, with roadmap</span></div>
            <div class="row"><RingPill ring="HOLD" /><b>Only if no alternative</b><span>Don't start new products with it</span></div>
            <div class="row"><RingPill ring="STOP" /><b>Migrate away</b><span>Obsolete, EOL defined</span></div>
            <div class="row"><RingPill ring="DEPRECATED" /><b>Removed from radar</b><span>Not shown on the radar</span></div>
          </div>
        </ui5-card>

        <ui5-card v-if="!selectedEntry">
          <ui5-card-header slot="header" title-text="About this radar"></ui5-card-header>
          <div class="card-body">
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

        <ui5-card v-else>
          <ui5-card-header slot="header" title-text="Selected technology" :subtitle-text="selectedEntry.title"></ui5-card-header>
          <div class="card-body">
            <p v-html="sanitizeDescription(selectedEntry.description)"></p>
            <p>Ring: <b>{{ selectedEntry.ring }}</b> &middot; Quadrant: <b>{{ selectedEntry.quadrant }}</b>
              &middot; Trend: <b>{{ selectedEntry.trend }}</b></p>
            <p>Reason: {{ selectedEntry.reason }}</p>
            <ui5-button @click="emit('open-detail', selectedEntry.id)">Open detail page &rarr;</ui5-button>
          </div>
        </ui5-card>
      </div>
    </div>

    <div class="table-wrap">
      <table class="list-view">
        <thead>
          <tr>
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
            <td><a href="#" @click.prevent="emit('open-detail', e.id)">{{ e.title }}</a></td>
            <td>{{ e.quadrant }}</td>
            <td><RingPill :ring="e.ring" /></td>
            <td>{{ e.trend }}</td>
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

.main-area { display: flex; gap: 1.5rem; align-items: flex-start; }
.radar-chart { flex: 1 1 auto; width: 100%; max-width: none; height: auto; display: block; }
.side-cards { flex: 0 1 460px; max-width: 460px; display: flex; flex-direction: column; gap: 1rem; }
.card-body { padding: 0.75rem 1rem 1rem; }
.rings-glance {
  display: grid;
  grid-template-columns: auto auto 1fr;
  column-gap: 0.75rem;
  row-gap: 0.6rem;
  align-items: baseline;
  font-size: 0.85rem;
}
.rings-glance .row { display: contents; }
.rings-glance .row span { color: var(--sap-text-muted, #5b738b); }
.table-wrap { overflow-x: auto; }
.list-view { width: 100%; min-width: 640px; margin-top: 1.5rem; border-collapse: collapse; }
.list-view th { text-align: left; cursor: pointer; border-bottom: 1px solid var(--sap-border, #ccc); padding: 0.5rem 0.4rem; font-size: 0.8rem; color: var(--sap-text-muted, #5b738b); text-transform: uppercase; letter-spacing: 0.02em; }
.list-view td { padding: 0.5rem 0.4rem; border-bottom: 1px solid #f0f0f0; }
.list-view tr { cursor: pointer; }
.list-view tr.selected { background: #eef4fb; }

/* Tablet (iPad 10" portrait ~810-834px, landscape ~1080-1194px) and
   anything narrower than the mock's fixed 1280px desktop frame: stack the
   radar and side cards instead of forcing them side by side. */
@media (max-width: 1100px) {
  .main-area { flex-direction: column; }
  .side-cards { max-width: none; width: 100%; }
  .side-cards ui5-card { width: 100%; }
}

@media (max-width: 600px) {
  .tiles ui5-card.tile { flex: 1 1 calc(50% - 0.75rem); }
}
</style>
