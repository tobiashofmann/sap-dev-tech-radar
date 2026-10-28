<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import * as d3 from 'd3'
import { QUADRANTS, RINGS, blipPosition, ringBoundaryRadii } from '../radarLayout.js'
import { RING_COLORS } from '../ringColors.js'
import RingPill from './RingPill.vue'

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

// --- radar chart ---
const chart = ref(null)
const CHART_SIZE = 560
const OUTER_RADIUS = 240

function renderChart() {
  const svg = d3.select(chart.value)
  svg.selectAll('*').remove()

  const center = CHART_SIZE / 2
  svg.attr('viewBox', `0 0 ${CHART_SIZE} ${CHART_SIZE}`)

  const g = svg.append('g').attr('transform', `translate(${center},${center})`)

  ringBoundaryRadii(OUTER_RADIUS).forEach((r) => {
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
      <ui5-card v-for="ring in RINGS" :key="ring" :class="{ active: ringFilter === ring }">
        <ui5-card-header slot="header" :title-text="ring" :subtitle-text="`${tileCounts[ring]}`"></ui5-card-header>
      </ui5-card>
    </div>

    <div class="filters">
      <label>
        <span>Quadrant:</span>
        <ui5-select @change="(e) => quadrantFilter = e.target.value">
          <ui5-option value="All" :selected="quadrantFilter === 'All'">All</ui5-option>
          <ui5-option v-for="q in QUADRANTS" :key="q.name" :value="q.name" :selected="quadrantFilter === q.name">{{ q.name }}</ui5-option>
        </ui5-select>
      </label>
      <label>
        <span>Ring:</span>
        <ui5-select @change="(e) => ringFilter = e.target.value">
          <ui5-option value="All" :selected="ringFilter === 'All'">All</ui5-option>
          <ui5-option v-for="r in RINGS" :key="r" :value="r" :selected="ringFilter === r">{{ r }}</ui5-option>
        </ui5-select>
      </label>
    </div>

    <div class="main-area">
      <svg ref="chart" class="radar-chart"></svg>

      <div class="side-cards">
        <ui5-card>
          <ui5-card-header slot="header" title-text="Rings at a glance"></ui5-card-header>
          <div class="card-body rings-glance">
            <div><RingPill ring="ADOPT" /> <b>Assess now</b> - new, stabilizing - may succeed a HOLD/STOP tech</div>
            <div><RingPill ring="USE" /> <b>Recommended for new projects</b> - supported, stable, with roadmap</div>
            <div><RingPill ring="HOLD" /> <b>Only if no alternative</b> - don't start new products with it</div>
            <div><RingPill ring="STOP" /> <b>Migrate away</b> - obsolete, EOL defined</div>
            <div><RingPill ring="DEPRECATED" /> <b>Removed from radar</b> - not shown on the radar</div>
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
            <p>{{ selectedEntry.description }}</p>
            <p>Ring: <b>{{ selectedEntry.ring }}</b> &middot; Quadrant: <b>{{ selectedEntry.quadrant }}</b>
              &middot; Trend: <b>{{ selectedEntry.trend }}</b></p>
            <p>Reason: {{ selectedEntry.reason }}</p>
            <ui5-button @click="emit('open-detail', selectedEntry.id)">Open detail page &rarr;</ui5-button>
          </div>
        </ui5-card>
      </div>
    </div>

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
</template>

<style scoped>
.radar-page { padding: 1rem 1.5rem 2rem; }
.tiles { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
.tiles ui5-card { flex: 0 0 160px; }
.tiles ui5-card.active { outline: 2px solid var(--sap-adopt, #0064d9); }
.filters { display: flex; align-items: center; gap: 2rem; margin-bottom: 1rem; }
.filters label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--sap-text-muted, #5b738b); }
.main-area { display: flex; gap: 1.5rem; align-items: flex-start; }
.radar-chart { flex: 1 1 auto; max-width: 560px; }
.side-cards { flex: 0 0 320px; display: flex; flex-direction: column; gap: 1rem; }
.card-body { padding: 0.75rem 1rem 1rem; }
.rings-glance > div { padding: 0.3rem 0; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; }
.list-view { width: 100%; margin-top: 1.5rem; border-collapse: collapse; }
.list-view th { text-align: left; cursor: pointer; border-bottom: 1px solid var(--sap-border, #ccc); padding: 0.5rem 0.4rem; font-size: 0.8rem; color: var(--sap-text-muted, #5b738b); text-transform: uppercase; letter-spacing: 0.02em; }
.list-view td { padding: 0.5rem 0.4rem; border-bottom: 1px solid #f0f0f0; }
.list-view tr { cursor: pointer; }
.list-view tr.selected { background: #eef4fb; }
</style>
