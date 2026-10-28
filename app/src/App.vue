<script setup>
import { ref, computed, onMounted } from 'vue'
import RadarPage from './components/RadarPage.vue'
import DetailPage from './components/DetailPage.vue'

const releaseData = ref(null)
const loadError = ref(null)
const view = ref('radar')
const selectedId = ref(null)
const activeTab = ref('Radar')

// radar/data.json lives next to this app's build output once deployed
// (radar/app/ + radar/data.json side by side); in dev it's served by the
// small middleware in vite.config.js.
const dataUrl = import.meta.env.DEV ? '/data.json' : '../data.json'

onMounted(async () => {
  try {
    const res = await fetch(dataUrl)
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`)
    }
    releaseData.value = await res.json()
  } catch (err) {
    loadError.value = `Could not load ${dataUrl} - run "npm run conv" in the repo root first. (${err.message})`
  }
})

const selectedEntry = computed(() =>
  releaseData.value && selectedId.value
    ? releaseData.value.entries.find((e) => e.id === selectedId.value)
    : null
)

function openDetail(id) {
  selectedId.value = id
  view.value = 'detail'
}

function backToRadar() {
  view.value = 'radar'
  activeTab.value = 'Radar'
}
</script>

<template>
  <div id="app">
    <header class="page-header">
      <h1>SAP Development Tech Radar <small v-if="releaseData">&middot; {{ releaseData.date }}</small></h1>
      <nav class="tabs">
        <button
          v-for="t in ['Radar', 'List', 'Changes']"
          :key="t"
          :class="{ active: activeTab === t }"
          @click="activeTab = t; view = 'radar'"
        >{{ t }}</button>
      </nav>
    </header>

    <p v-if="loadError" class="error">{{ loadError }}</p>

    <template v-else-if="releaseData">
      <DetailPage
        v-if="view === 'detail' && selectedEntry"
        :entry="selectedEntry"
        :all-entries="releaseData.entries"
        @back="backToRadar"
        @open-detail="openDetail"
      />
      <RadarPage
        v-else-if="activeTab === 'Radar'"
        :entries="releaseData.entries"
        :changes="releaseData.changes"
        @open-detail="openDetail"
      />
      <p v-else class="not-implemented">The "{{ activeTab }}" tab isn't implemented yet.</p>
    </template>

    <p v-else>Loading&hellip;</p>
  </div>
</template>

<style scoped>
#app { max-width: 1280px; margin: 0 auto; }
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  padding: 1rem 1.5rem;
  background: var(--sap-tile-bg, #fff);
  border-bottom: 1px solid #e5e5e5;
}
.page-header h1 { font-size: 1.3rem; }
.tabs { display: flex; gap: 0.5rem; }
.tabs button {
  background: none;
  border: none;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font: inherit;
}
.tabs button.active { border-bottom: 2px solid #0064d9; font-weight: bold; }
.error { color: #d20a0a; padding: 1rem 1.5rem; }
.not-implemented { padding: 1rem 1.5rem; color: #666; }
</style>
