<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import RadarPage from './components/RadarPage.vue'
import DetailPage from './components/DetailPage.vue'
import PrivacyPage from './components/PrivacyPage.vue'
import AboutPage from './components/AboutPage.vue'
import DeprecatedPage from './components/DeprecatedPage.vue'
import ChangesPage from './components/ChangesPage.vue'

const releaseData = ref(null)
const loadError = ref(null)
const view = ref('radar')
const selectedId = ref(null)
const activeTab = ref('Radar')
const searchQuery = ref('')
const infoOpen = ref(false)
const pastReleases = ref([])
const selectedRelease = ref('current')
// cache of already-fetched past releases' data.json, keyed by version, so
// switching back to one already viewed doesn't refetch it - a published
// release never changes, so there's nothing to invalidate.
const pastReleaseCache = ref({})
const pastReleaseLoading = ref(false)
const pastReleaseError = ref(null)
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
    return
  }

  // Clear any pending jump so a later unrelated remount of RadarPage
  // (e.g. coming back from a detail page via this same "Radar" tab)
  // doesn't replay a stale scroll-to-table from an earlier List click.
  listJumpToken.value = 0
  const target = t === 'Changes' ? changesPath : basePath
  if (window.location.pathname !== target || window.location.hash) {
    window.history.pushState({}, '', target)
  }
}

// radar/data.json and radar/releases/** live right next to this app's own
// build output once deployed (both land directly under radar/, see
// vite.config.js's outDir); in dev they're served by the small middleware
// in vite.config.js instead.
const dataUrl = import.meta.env.DEV ? '/data.json' : './data.json'
const manifestUrl = import.meta.env.DEV ? '/releases-manifest.json' : './releases/manifest.json'
function pastReleaseUrl(version) {
  return import.meta.env.DEV ? `/releases/${version}/data.json` : `./releases/${version}/data.json`
}

// Deep linking: /details/<id> (id = the technology's TOML filename, already
// unique and URL-safe per CONTRIBUTING.md's naming rule - no need to use
// config.label, which can contain spaces and isn't pipeline-enforced unique).
// Pure client-side (History API), no router dependency. Direct hard loads of
// /details/<id> on GitHub Pages still need the standard 404.html SPA-fallback
// trick once app/ is wired into the deploy workflow - not done yet, flagged
// separately in design/DESIGN.md's follow-up notes.
const basePath = import.meta.env.BASE_URL
const detailPrefix = basePath + 'details/'
const privacyPath = basePath + 'privacy'
const aboutPath = basePath + 'about'
const deprecatedPath = basePath + 'deprecated'
const changesPath = basePath + 'changes'
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
  if (window.location.pathname === privacyPath) {
    view.value = 'privacy'
    return
  }
  if (window.location.pathname === aboutPath) {
    view.value = 'about'
    return
  }
  if (window.location.pathname === deprecatedPath) {
    view.value = 'deprecated'
    return
  }
  view.value = 'radar'
  if (window.location.pathname === changesPath) {
    activeTab.value = 'Changes'
    listJumpToken.value = 0
  } else if (window.location.hash === TECHNOLOGIES_HASH) {
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

// Whichever release is currently selected - the live draft, or an
// archived past release once fetched (radar/releases/<version>/data.json,
// same {date, entries, changes} shape as the live one, so every consumer
// below reads from this one source regardless of which is active).
const activeData = computed(() =>
  selectedRelease.value === 'current' ? releaseData.value : pastReleaseCache.value[selectedRelease.value] ?? null
)

// Fetches+caches a past release's data.json (no-op if already cached, or
// for 'current' which is always already loaded as releaseData). Shared by
// the header's release selector and the Changes page's "Compare with"
// picker - both just need a release's entries available on demand.
async function fetchPastRelease(version) {
  if (version === 'current' || pastReleaseCache.value[version]) {
    return
  }
  const res = await fetch(pastReleaseUrl(version))
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  pastReleaseCache.value = { ...pastReleaseCache.value, [version]: await res.json() }
}

// Entries for any already-loaded release, current or archived - null if a
// past release hasn't been fetched yet (caller's responsibility to await
// fetchPastRelease(version) first if it needs them).
function releaseEntries(version) {
  if (version === 'current') {
    return releaseData.value ? releaseData.value.entries : null
  }
  return pastReleaseCache.value[version] ? pastReleaseCache.value[version].entries : null
}

async function onReleaseChange(e) {
  const version = e.target.value
  selectedRelease.value = version
  pastReleaseError.value = null

  if (version === 'current') {
    return
  }

  // switching release shows that release's own radar overview, not
  // whatever detail page happened to be open
  view.value = 'radar'
  activeTab.value = 'Radar'

  pastReleaseLoading.value = true
  try {
    await fetchPastRelease(version)
  } catch (err) {
    pastReleaseError.value = `Could not load release ${version}: ${err.message}`
  } finally {
    pastReleaseLoading.value = false
  }
}

const selectedEntry = computed(() =>
  activeData.value && selectedId.value
    ? activeData.value.entries.find((e) => e.id === selectedId.value)
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

// Info dialog's "Privacy notice" link
function openPrivacy() {
  infoOpen.value = false
  view.value = 'privacy'
  if (window.location.pathname !== privacyPath) {
    window.history.pushState({}, '', privacyPath)
  }
}

// Info dialog's "About" section link
function openAbout() {
  infoOpen.value = false
  view.value = 'about'
  if (window.location.pathname !== aboutPath) {
    window.history.pushState({}, '', aboutPath)
  }
}

// Radar page's "Deprecated" tile (design/DESIGN.md screen C)
function openDeprecated() {
  view.value = 'deprecated'
  if (window.location.pathname !== deprecatedPath) {
    window.history.pushState({}, '', deprecatedPath)
  }
}
</script>

<template>
  <div id="app">
    <header class="page-header">
      <div class="header-left">
        <h1>SAP Development Tech Radar <small v-if="activeData">&middot; Release {{ activeData.date }}</small></h1>
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
      <p v-if="pastReleaseLoading" class="historical-notice">Loading release {{ selectedRelease }}&hellip;</p>
      <p v-else-if="pastReleaseError" class="error">{{ pastReleaseError }}</p>
      <template v-else-if="activeData">
        <p v-if="selectedRelease !== 'current'" class="historical-notice">
          Showing archived release <b>{{ selectedRelease }}</b> as it was published - read-only.
          <a href="#" @click.prevent="onReleaseChange({ target: { value: 'current' } })">Back to current &rarr;</a>
        </p>
        <DetailPage
          v-if="view === 'detail' && selectedEntry"
          :entry="selectedEntry"
          :all-entries="activeData.entries"
          @back="backToRadar"
          @open-detail="openDetail"
          @show-on-radar="showOnRadar"
        />
        <PrivacyPage v-else-if="view === 'privacy'" @back="backToRadar" />
        <AboutPage v-else-if="view === 'about'" @back="backToRadar" />
        <DeprecatedPage
          v-else-if="view === 'deprecated'"
          :entries="activeData.entries"
          @back="backToRadar"
          @open-detail="openDetail"
        />
        <RadarPage
          v-else-if="activeTab === 'Radar' || activeTab === 'List'"
          :entries="activeData.entries"
          :changes="activeData.changes"
          :search-query="searchQuery"
          :jump-to-list="listJumpToken"
          :preselect-id="radarPreselectId"
          @open-detail="openDetail"
          @open-deprecated="openDeprecated"
        />
        <ChangesPage
          v-else-if="activeTab === 'Changes'"
          :entries="activeData.entries"
          :changes="activeData.changes"
          :release-date="activeData.date"
          :search-query="searchQuery"
          :past-releases="pastReleases"
          :viewing-version="selectedRelease"
          :release-entries="releaseEntries"
          :fetch-past-release="fetchPastRelease"
          @open-detail="openDetail"
        />
        <p v-else class="not-implemented">The "{{ activeTab }}" tab isn't implemented yet.</p>
      </template>
    </template>

    <p v-else>Loading&hellip;</p>

    <ui5-dialog
      class="info-dialog"
      header-text="About SAP Development Tech Radar"
      :open="infoOpen"
      @close="infoOpen = false"
    >
      <div class="info-logo">
        <img src="/favicon.svg" alt="" width="40" height="40" />
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
        <div class="info-links">
          <a href="#" @click.prevent="openAbout">More about the tech radar</a>
        </div>
      </div>
      <div class="info-section">
        <div class="info-label">Legal &amp; Privacy</div>
        <p class="info-muted">This site is hosted on GitHub Pages. When you open it, GitHub may process technical
          data such as your IP address in server logs.</p>
        <div class="info-links">
          <a href="#" @click.prevent="openPrivacy">Privacy notice</a>
          <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub Privacy Statement &#8599;</a>
        </div>
      </div>
      <div class="dialog-footer">
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
.historical-notice {
  margin: 1rem 1.5rem;
  padding: 0.6rem 1rem;
  background: #fff7e0;
  border: 1px solid #f0ab00;
  border-radius: 0.5rem;
  color: #a34400;
}
.historical-notice a { margin-left: 0.5rem; }

/* Screen E (design/Tech Radar Recommendations.html "Info dialog"): fixed,
   near-square width rather than ui5-dialog's content-based auto width;
   plain host-level width/border-radius do reach the dialog's own popup
   box despite it living in shadow DOM (verified - unlike ui5-card, which
   needed ::part()). */
.info-dialog { width: 620px; border-radius: 1rem; }
.info-dialog::part(header) { justify-content: center; }
.info-logo { display: flex; justify-content: center; padding: 1rem 1.5rem 0; }
.info-logo img { width: 40px; height: 40px; }

.info-section { padding: 1rem 1.5rem; }
.info-section + .info-section { border-top: 1px solid var(--sap-border, #e4e7eb); }
.info-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sap-text-muted, #5b738b); margin-bottom: 0.5rem; }
.info-grid { display: grid; grid-template-columns: 7.5rem 1fr; gap: 0.4rem 1rem; }
.info-muted { color: var(--sap-text-muted, #5b738b); }
.info-links { display: flex; gap: 1rem; margin-top: 0.75rem; flex-wrap: wrap; }
/* Rendered as a trailing content section (not slot="footer") - that
   slot's [part="footer"] has a fixed, non-content-reactive height (UI5's
   standard footer-bar convention), which clipped/overflowed once this
   needed more than its default space for the bottom spacing below. */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem 1.5rem 1.25rem;
  border-top: 1px solid var(--sap-border, #e4e7eb);
}
</style>
