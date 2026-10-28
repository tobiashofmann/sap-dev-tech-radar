<script setup>
import { ref, onMounted } from 'vue'
import * as d3 from 'd3'

// Proof of concept only: exercises the three stack pieces chosen in the
// plan (Vue 3 reactivity + native UI5 Web Components + D3 for the radar
// chart) together in one Vite-bundled, static-output app. It does not
// implement the real A1-G screens or fetch the generated radar data yet.

const tabs = ['Radar', 'List', 'Changes']
const activeTab = ref(tabs[0])

// static stand-in for radar/releases/manifest.json until this is wired
// into the real data pipeline
const releases = ['2026-06', '2025-12', '2025-06', '2024-12', '2024-06']
const selectedRelease = ref(releases[0])

const ringColors = {
  ADOPT: '#0064d9',
  USE: '#256f3a',
  HOLD: '#f0ab00',
  STOP: '#d20a0a'
}
const demoBlips = [
  { ring: 'ADOPT', angle: 20, radius: 40 },
  { ring: 'USE', angle: 100, radius: 70 },
  { ring: 'USE', angle: 190, radius: 75 },
  { ring: 'HOLD', angle: 260, radius: 100 },
  { ring: 'STOP', angle: 320, radius: 120 }
]

const chart = ref(null)

onMounted(() => {
  const size = 280
  const center = size / 2
  const svg = d3.select(chart.value)
    .attr('width', size)
    .attr('height', size)
    .attr('viewBox', `0 0 ${size} ${size}`)

  const radii = [40, 70, 100, 130]
  svg.selectAll('circle.ring')
    .data(radii)
    .join('circle')
    .attr('class', 'ring')
    .attr('cx', center)
    .attr('cy', center)
    .attr('r', (d) => d)
    .attr('fill', 'none')
    .attr('stroke', 'var(--sapNeutralBorderColor, #ccc)')

  const toXY = (angleDeg, radius) => {
    const rad = (angleDeg * Math.PI) / 180
    return [center + radius * Math.cos(rad), center + radius * Math.sin(rad)]
  }

  svg.selectAll('circle.blip')
    .data(demoBlips)
    .join('circle')
    .attr('class', 'blip')
    .attr('cx', (d) => toXY(d.angle, d.radius)[0])
    .attr('cy', (d) => toXY(d.angle, d.radius)[1])
    .attr('r', 6)
    .attr('fill', (d) => ringColors[d.ring])
})
</script>

<template>
  <div id="app">
    <header class="page-header">
      <h1>SAP Development Tech Radar</h1>
      <ui5-select @change="(e) => selectedRelease = e.target.value">
        <ui5-option v-for="r in releases" :key="r" :value="r" :selected="r === selectedRelease">
          Release: {{ r }}
        </ui5-option>
      </ui5-select>
    </header>

    <ui5-tabcontainer @tab-select="(e) => activeTab = e.detail.tab.textContent">
      <ui5-tab v-for="t in tabs" :key="t" :text="t" :selected="t === activeTab"></ui5-tab>
    </ui5-tabcontainer>

    <p>Active tab: <b>{{ activeTab }}</b> &middot; selected release: <b>{{ selectedRelease }}</b></p>

    <div class="cards">
      <ui5-card>
        <ui5-card-header title-text="ADOPT" subtitle-text="9 technologies"></ui5-card-header>
      </ui5-card>
      <ui5-card>
        <ui5-card-header title-text="USE" subtitle-text="34 technologies"></ui5-card-header>
      </ui5-card>
    </div>

    <svg ref="chart"></svg>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
}
.cards {
  display: flex;
  gap: 1rem;
  padding: 1rem;
}
svg {
  display: block;
  margin: 0 auto;
}
</style>
