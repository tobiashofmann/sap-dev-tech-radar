<script setup>
import { ref, computed, onMounted } from 'vue'
import RadarPage from './components/RadarPage.vue'
import DetailPage from './components/DetailPage.vue'

const releaseData = ref(null)
const loadError = ref(null)
const view = ref('radar')
const selectedId = ref(null)
const activeTab = ref('Radar')
const searchQuery = ref('')
const infoOpen = ref(false)
const pastReleases = ref([])
const selectedRelease = ref('current')
const historicalNotice = ref(false)

// radar/data.json and radar/releases/manifest.json live next to this app's
// build output once deployed (radar/app/ + radar/*.json side by side); in
// dev they're served by the small middleware in vite.config.js.
const dataUrl = import.meta.env.DEV ? '/data.json' : '../data.json'
const manifestUrl = import.meta.env.DEV ? '/releases-manifest.json' : '../releases/manifest.json'

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

  try {
    const res = await fetch(manifestUrl)
    if (res.ok) {
      pastReleases.value = (await res.json()).slice().reverse()
    }
  } catch {
    // optional: release selector just won't offer past releases
  }
})

function onReleaseChange(e) {
  selectedRelease.value = e.target.value
  historicalNotice.value = e.target.value !== 'current'
}

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
      <div class="header-left">
        <h1>SAP Development Tech Radar <small v-if="releaseData">&middot; Release {{ releaseData.date }}</small></h1>
        <nav class="tabs">
          <button
            v-for="t in ['Radar', 'List', 'Changes']"
            :key="t"
            :class="{ active: activeTab === t }"
            @click="activeTab = t; view = 'radar'"
          >{{ t }}</button>
        </nav>
      </div>

      <div class="header-actions">
        <ui5-input
          class="search"
          type="Search"
          placeholder="Search technology..."
          show-clear-icon
          @input="(e) => searchQuery = e.target.value"
        ></ui5-input>
        <ui5-select class="release-select" @change="onReleaseChange" v-if="releaseData">
          <ui5-option value="current" :selected="selectedRelease === 'current'">Release: {{ releaseData.date }}</ui5-option>
          <ui5-option v-for="r in pastReleases" :key="r" :value="r" :selected="selectedRelease === r">Release: {{ r }}</ui5-option>
        </ui5-select>
        <ui5-button
          class="info-button"
          icon="information"
          design="Transparent"
          accessible-name="About this radar"
          @click="infoOpen = true"
        ></ui5-button>
      </div>
    </header>

    <p v-if="loadError" class="error">{{ loadError }}</p>

    <template v-else-if="releaseData">
      <p v-if="historicalNotice" class="not-implemented">
        Switching to a past release isn't implemented yet - showing the current (draft) state.
      </p>
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
        :search-query="searchQuery"
        @open-detail="openDetail"
      />
      <p v-else class="not-implemented">The "{{ activeTab }}" tab isn't implemented yet.</p>
    </template>

    <p v-else>Loading&hellip;</p>

    <ui5-dialog
      header-text="About SAP Development Tech Radar"
      :open="infoOpen"
      @close="infoOpen = false"
    >
      <div class="info-section">
        <h3>Version</h3>
        <p>SDTR version <b>{{ releaseData ? releaseData.date : '...' }}</b><br/>
          Source code: <a href="https://github.com/tobiashofmann/sap-dev-tech-radar" target="_blank" rel="noopener">github.com/tobiashofmann/sap-dev-tech-radar</a></p>
      </div>
      <div class="info-section">
        <h3>About</h3>
        <p>The SAP Development Tech Radar gives guidance on which technologies to use when
          building SAP applications. Every technology sits in one quadrant and one ring.</p>
        <p>Rings: Adopt &rarr; Use &rarr; Hold &rarr; Stop. Deprecated technologies are not shown
          on the radar but on the Deprecated page.</p>
      </div>
      <div class="info-section">
        <h3>Legal &amp; Privacy</h3>
        <p>This site is hosted on GitHub Pages. When you open it, GitHub may process technical
          data such as your IP address in server logs.</p>
      </div>
      <div slot="footer" class="dialog-footer">
        <ui5-button @click="infoOpen = false">Close</ui5-button>
      </div>
    </ui5-dialog>
  </div>
</template>

<style scoped>
#app { max-width: 1280px; margin: 0 auto; }
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  padding: 1rem 1.5rem;
  background: var(--sap-tile-bg, #fff);
  border-bottom: 1px solid #e5e5e5;
}
.header-left { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
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

.header-actions { display: flex; align-items: center; gap: 0.75rem; }
.header-actions .search { width: 15rem; }
.header-actions .release-select { width: 11rem; }
.info-button { border-radius: 50%; }

.error { color: #d20a0a; padding: 1rem 1.5rem; }
.not-implemented { padding: 1rem 1.5rem; color: #666; }

.info-section { margin-bottom: 1.25rem; }
.info-section h3 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sap-text-muted, #5b738b); margin-bottom: 0.4rem; }
.dialog-footer { display: flex; justify-content: flex-end; padding: 0.5rem; }
</style>
