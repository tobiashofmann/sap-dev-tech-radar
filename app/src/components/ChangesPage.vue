<script setup>
import { ref, computed } from 'vue'
import RingPill from './RingPill.vue'

const props = defineProps({
  entries: { type: Array, required: true }, // the viewed release's entries (the "now" side of every comparison)
  changes: { type: Object, required: true }, // precomputed vs the immediately preceding release: {previousRelease, items}
  releaseDate: { type: String, required: true }, // the viewed release's own date/version label
  searchQuery: { type: String, default: '' },
  pastReleases: { type: Array, required: true }, // version strings, newest first
  viewingVersion: { type: String, required: true }, // 'current' or a version string - whichever release is on screen
  releaseEntries: { type: Function, required: true }, // (version) => entries array | null (null = not fetched yet)
  fetchPastRelease: { type: Function, required: true } // (version) => Promise<void>
})
const emit = defineEmits(['open-detail'])

const QUADRANTS = ['UI', 'Technology', 'Tools', 'Frameworks']
const RING_ORDER = { ADOPT: 0, USE: 1, HOLD: 2, STOP: 3, DEPRECATED: 4 }
const TYPE_LABEL = { new: '✦ New', moved: '→ Next ring', deprecated: '⊘ Deprecated' }

const changeFilter = ref('All')
const quadrantFilter = ref('All')
const compareWith = ref(props.changes.previousRelease)
const compareLoading = ref(false)

// "Compare with" (design/DESIGN.md screen D): any other release than the
// one currently on screen - 'current' (the live draft) if that isn't
// already what's showing, plus every archived release except itself.
const compareOptions = computed(() => {
  const options = []
  if (props.viewingVersion !== 'current') {
    options.push('current')
  }
  props.pastReleases.forEach((v) => {
    if (v !== props.viewingVersion) {
      options.push(v)
    }
  })
  return options
})

async function onCompareChange(e) {
  const version = e.target.value
  compareWith.value = version
  if (version && !props.releaseEntries(version)) {
    compareLoading.value = true
    try {
      await props.fetchPastRelease(version)
    } finally {
      compareLoading.value = false
    }
  }
}

function classify(currentRing, previousRing) {
  if (previousRing === null) {
    return 'new'
  }
  return currentRing === 'DEPRECATED' ? 'deprecated' : 'moved'
}

// When comparing against the release's own natural predecessor, the
// precomputed `changes` prop already has this (and is cheaper to reuse);
// for any other "Compare with" choice, diff this release's entries
// against the chosen one's entries client-side, same classification rules
// release-data.js's computeChanges() uses server-side.
const items = computed(() => {
  if (compareWith.value === props.changes.previousRelease) {
    return props.changes.items
  }
  const compareEntries = props.releaseEntries(compareWith.value)
  if (!compareEntries) {
    return []
  }
  const byId = {}
  compareEntries.forEach((e) => { byId[e.id] = e })

  const diffed = []
  props.entries.forEach((e) => {
    const prev = byId[e.id]
    const previousRing = prev ? prev.ring : null
    if (previousRing === e.ring) {
      return
    }
    diffed.push({
      id: e.id,
      title: e.title,
      quadrant: e.quadrant,
      type: classify(e.ring, previousRing),
      previousRing,
      currentRing: e.ring,
      reason: e.reason
    })
  })
  diffed.sort((a, b) => RING_ORDER[a.currentRing] - RING_ORDER[b.currentRing])
  return diffed
})

const counts = computed(() => {
  const c = { new: 0, moved: 0, deprecated: 0 }
  items.value.forEach((i) => { c[i.type]++ })
  return c
})

const filteredItems = computed(() => {
  let list = items.value
  if (changeFilter.value !== 'All') {
    list = list.filter((i) => i.type === changeFilter.value)
  }
  if (quadrantFilter.value !== 'All') {
    list = list.filter((i) => i.quadrant === quadrantFilter.value)
  }
  const q = props.searchQuery.trim().toLowerCase()
  return q ? list.filter((i) => i.title.toLowerCase().includes(q)) : list
})
</script>

<template>
  <div class="changes-page">
    <h1>Changes<template v-if="compareWith"> since {{ compareWith === 'current' ? 'current (draft)' : compareWith }}</template></h1>
    <p class="intro">Technologies that were added, moved on to the next ring or deprecated in release {{ releaseDate }}.
      Rings only progress in one direction: Adopt &rarr; Use &rarr; Hold &rarr; Stop &rarr; Deprecated.</p>

    <div class="tiles">
      <ui5-card class="tile">
        <div class="tile-body">
          <div class="tile-label">&rarr; Next ring</div>
          <div class="tile-count" style="color: #131e29">{{ counts.moved }}</div>
        </div>
      </ui5-card>
      <ui5-card class="tile">
        <div class="tile-body">
          <div class="tile-label">&#8856; Deprecated</div>
          <div class="tile-count" style="color: #556b82">{{ counts.deprecated }}</div>
        </div>
      </ui5-card>
      <ui5-card class="tile">
        <div class="tile-body">
          <div class="tile-label">&#10022; New</div>
          <div class="tile-count" style="color: #0064d9">{{ counts.new }}</div>
        </div>
      </ui5-card>
    </div>

    <div class="filters">
      <div class="filter-group">
        <span class="filter-label">Change:</span>
        <button class="chip" :class="{ on: changeFilter === 'All' }" @click="changeFilter = 'All'">All</button>
        <button class="chip" :class="{ on: changeFilter === 'new' }" @click="changeFilter = 'new'">New</button>
        <button class="chip" :class="{ on: changeFilter === 'moved' }" @click="changeFilter = 'moved'">Next ring</button>
        <button class="chip" :class="{ on: changeFilter === 'deprecated' }" @click="changeFilter = 'deprecated'">Deprecated</button>
      </div>
      <div class="filter-group">
        <span class="filter-label">Quadrant:</span>
        <button class="chip" :class="{ on: quadrantFilter === 'All' }" @click="quadrantFilter = 'All'">All</button>
        <button
          v-for="q in QUADRANTS"
          :key="q"
          class="chip"
          :class="{ on: quadrantFilter === q }"
          @click="quadrantFilter = q"
        >{{ q }}</button>
      </div>
      <ui5-select class="compare-select" :disabled="!compareOptions.length" @change="onCompareChange">
        <ui5-option
          v-for="v in compareOptions"
          :key="v"
          :value="v"
          :selected="v === compareWith"
        >Compare with: {{ v === 'current' ? 'current (draft)' : v }}</ui5-option>
      </ui5-select>
    </div>

    <p v-if="compareLoading" class="loading-note">Loading comparison release&hellip;</p>

    <ui5-card v-else>
      <div class="card-body">
        <table class="changes-table">
          <thead>
            <tr>
              <th>Technology</th>
              <th>Quadrant</th>
              <th>Change</th>
              <th>Ring: previous &rarr; now</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in filteredItems" :key="i.id" @click="emit('open-detail', i.id)">
              <td><a href="#" @click.prevent="emit('open-detail', i.id)">{{ i.title }}</a></td>
              <td>{{ i.quadrant }}</td>
              <td><span class="change-type" :class="i.type">{{ TYPE_LABEL[i.type] }}</span></td>
              <td class="ring-cell">
                <RingPill v-if="i.previousRing" :ring="i.previousRing" />
                <span v-else class="lab">&ndash;</span>
                <span class="arrow">&rarr;</span>
                <RingPill :ring="i.currentRing" />
              </td>
              <td>{{ i.reason }}</td>
            </tr>
            <tr v-if="!filteredItems.length">
              <td colspan="5" class="empty">No changes match these filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ui5-card>
  </div>
</template>

<style scoped>
.changes-page { padding: 1.5rem; max-width: 1280px; margin: 0 auto; }
h1 { font-size: 1.5rem; margin: 0 0 0.4rem; }
.intro { color: var(--sap-text-muted, #5b738b); margin: 0 0 1.25rem; }

.tiles { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
.tiles ui5-card.tile { flex: 1 1 0; min-width: 160px; }
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
.compare-select { width: 13rem; margin-left: auto; }
.loading-note { color: var(--sap-text-muted, #5b738b); padding: 1rem 0; }

.card-body { padding: 0.5rem 1.5rem 1.5rem; }
.changes-table { width: 100%; border-collapse: collapse; }
.changes-table th {
  text-align: left;
  padding: 0.5rem 0.4rem;
  border-bottom: 1px solid var(--sap-border, #e4e7eb);
  font-size: 0.8rem;
  color: var(--sap-text-muted, #5b738b);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.changes-table td { padding: 0.5rem 0.4rem; border-bottom: 1px solid #f0f0f0; }
.changes-table tbody tr { cursor: pointer; }
.changes-table .empty { text-align: center; color: var(--sap-text-muted, #5b738b); cursor: default; padding: 1.5rem 0; }

.change-type { font-weight: 700; white-space: nowrap; }
.change-type.new { color: var(--sap-adopt, #0064d9); }
.change-type.moved { color: #131e29; }
.change-type.deprecated { color: var(--sap-text-muted, #5b738b); }

.ring-cell { display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; }
.ring-cell .lab { color: var(--sap-text-muted, #5b738b); }
.ring-cell .arrow { color: var(--sap-text-muted, #5b738b); }
</style>
