<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
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
// bumped on every "List" tab click (even if already active) so RadarPage's
// watcher re-triggers the scroll-to-table jump each time, not just once.
const listJumpToken = ref(0)
// set by the detail page's "Show on full radar" link, passed through to
// RadarPage to select that technology once we're back on the radar.
const radarPreselectId = ref(null)

function selectTab(t) {
  activeTab.value = t
  view.value = 'radar'
  if (t === 'List') {
    listJumpToken.value++
    const target = basePath + TECHNOLOGIES_HASH
    if (window.location.pathname + window.location.hash !== target) {
      window.history.pushState({}, '', target)
    }
  } else {
    // Clear any pending jump so a later unrelated remount of RadarPage
    // (e.g. coming back from a detail page via this same "Radar" tab)
    // doesn't replay a stale scroll-to-table from an earlier List click.
    listJumpToken.value = 0
    if (window.location.pathname !== basePath || window.location.hash) {
      window.history.pushState({}, '', basePath)
    }
  }
}

// radar/data.json and radar/releases/manifest.json live next to this app's
// build output once deployed (radar/app/ + radar/*.json side by side); in
// dev they're served by the small middleware in vite.config.js.
const dataUrl = import.meta.env.DEV ? '/data.json' : '../data.json'
const manifestUrl = import.meta.env.DEV ? '/releases-manifest.json' : '../releases/manifest.json'

// Deep linking: /details/<id> (id = the technology's TOML filename, already
// unique and URL-safe per CONTRIBUTING.md's naming rule - no need to use
// config.label, which can contain spaces and isn't pipeline-enforced unique).
// Pure client-side (History API), no router dependency. Direct hard loads of
// /details/<id> on GitHub Pages still need the standard 404.html SPA-fallback
// trick once app/ is wired into the deploy workflow - not done yet, flagged
// separately in design/DESIGN.md's follow-up notes.
const basePath = import.meta.env.BASE_URL
const detailPrefix = basePath + 'details/'
// Makes the List tab's scroll position visible/shareable in the URL -
// reflected on every List click, and read back on load/back-forward so a
// link with this hash lands on the table instead of the bare radar.
const TECHNOLOGIES_HASH = '#technologies'

function detailPath(id) {
  return detailPrefix + encodeURIComponent(id)
}

function idFromLocation() {
  const { pathname } = window.location
  return pathname.startsWith(detailPrefix) ? decodeURIComponent(pathname.slice(detailPrefix.length)) : null
}

function syncViewFromLocation() {
  const id = idFromLocation()
  if (id && releaseData.value?.entries.some((e) => e.id === id)) {
    selectedId.value = id
    view.value = 'detail'
    return
  }
  view.value = 'radar'
  if (window.location.hash === TECHNOLOGIES_HASH) {
    activeTab.value = 'List'
    listJumpToken.value++
  } else {
    activeTab.value = 'Radar'
    listJumpToken.value = 0
  }
}

window.addEventListener('popstate', syncViewFromLocation)
onBeforeUnmount(() => window.removeEventListener('popstate', syncViewFromLocation))

onMounted(async () => {
  try {
    const res = await fetch(dataUrl)
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`)
    }
    releaseData.value = await res.json()
    syncViewFromLocation()
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
  const path = detailPath(id)
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path)
  }
}

function backToRadar() {
  view.value = 'radar'
  activeTab.value = 'Radar'
  listJumpToken.value = 0
  if (window.location.pathname !== basePath || window.location.hash) {
    window.history.pushState({}, '', basePath)
  }
}

// Detail page's "Show on full radar ->" link (design/DESIGN.md screen B):
// go back to the radar with that technology selected, same as clicking its
// blip or list row directly.
function showOnRadar(id) {
  radarPreselectId.value = id
  backToRadar()
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
            @click="selectTab(t)"
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
        @show-on-radar="showOnRadar"
      />
      <RadarPage
        v-else-if="activeTab === 'Radar' || activeTab === 'List'"
        :entries="releaseData.entries"
        :changes="releaseData.changes"
        :search-query="searchQuery"
        :jump-to-list="listJumpToken"
        :preselect-id="radarPreselectId"
        @open-detail="openDetail"
      />
      <p v-else class="not-implemented">The "{{ activeTab }}" tab isn't implemented yet.</p>
    </template>

    <p v-else>Loading&hellip;</p>

    <ui5-dialog
      class="info-dialog"
      accessible-name="About SAP Development Tech Radar"
      :open="infoOpen"
      @close="infoOpen = false"
    >
      <div slot="header" class="info-dialog-header">
        <h3>About SAP Development Tech Radar</h3>
        <button class="dialog-close" aria-label="Close" @click="infoOpen = false">&#10005;</button>
      </div>

      <div class="info-section">
        <div class="info-label">Version</div>
        <div class="info-grid">
          <span class="info-label">Release</span>
          <span><b>{{ releaseData ? releaseData.date : '...' }}</b></span>
          <span class="info-label">Source code</span>
          <span><a href="https://github.com/tobiashofmann/sap-dev-tech-radar" target="_blank" rel="noopener">github.com/tobiashofmann/sap-dev-tech-radar &#8599;</a></span>
        </div>
      </div>
      <div class="info-section">
        <div class="info-label">About</div>
        <p>The SAP Development Tech Radar gives guidance on which technologies to use when
          building SAP applications. Every technology sits in one quadrant and one ring.</p>
        <p class="info-muted">Rings: Adopt &rarr; Use &rarr; Hold &rarr; Stop. Deprecated technologies are not shown
          on the radar but on the Deprecated page.</p>
      </div>
      <div class="info-section">
        <div class="info-label">Legal &amp; Privacy</div>
        <p class="info-muted">This site is hosted on GitHub Pages. When you open it, GitHub may process technical
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

/* Screen E (design/Tech Radar Recommendations.html "Info dialog"): fixed,
   near-square width rather than ui5-dialog's content-based auto width;
   plain host-level width/border-radius do reach the dialog's own popup
   box despite it living in shadow DOM (verified - unlike ui5-card, which
   needed ::part()). */
.info-dialog { width: 620px; border-radius: 1rem; }

.info-dialog-header {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--sap-border, #e4e7eb);
}
.info-dialog-header h3 { margin: 0; font-size: 1.1rem; }
.dialog-close {
  margin-left: auto;
  border: none;
  background: none;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--sap-text-muted, #5b738b);
  cursor: pointer;
  padding: 0.25rem;
}
.dialog-close:hover { color: var(--sap-text, #1a2733); }

.error { color: #d20a0a; padding: 1rem 1.5rem; }
.not-implemented { padding: 1rem 1.5rem; color: #666; }

.info-section { padding: 1rem 1.5rem; }
.info-section + .info-section { border-top: 1px solid var(--sap-border, #e4e7eb); }
.info-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sap-text-muted, #5b738b); margin-bottom: 0.5rem; }
.info-grid { display: grid; grid-template-columns: 7.5rem 1fr; gap: 0.4rem 1rem; }
.info-muted { color: var(--sap-text-muted, #5b738b); }
.dialog-footer { display: flex; justify-content: flex-end; padding: 0.75rem 1.5rem; border-top: 1px solid var(--sap-border, #e4e7eb); }
</style>
