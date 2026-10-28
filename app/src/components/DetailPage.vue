<script setup>
import { computed } from 'vue'
import RingPill from './RingPill.vue'

const props = defineProps({
  entry: { type: Object, required: true },
  allEntries: { type: Array, required: true }
})
const emit = defineEmits(['back', 'open-detail'])

// most recent ring transition: the ring right before it, and the release
// it happened in (null = happened in the current, not-yet-released draft)
const lastChange = computed(() => {
  const sequence = [...props.entry.releaseHistory, { release: null, ring: props.entry.ring }]
  let previousRing = null
  let release = null
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i].ring !== sequence[i - 1].ring) {
      previousRing = sequence[i - 1].ring
      release = sequence[i].release
    }
  }
  return { previousRing, release }
})

const voteLink = computed(() =>
  props.entry.links.find((l) => l.name === 'Ring proposal & vote')
)
</script>

<template>
  <div class="detail-page">
    <nav class="breadcrumb">
      <a href="#" @click.prevent="emit('back')">Radar</a> &rsaquo;
      {{ entry.quadrant }} &rsaquo; {{ entry.title }}
    </nav>

    <section class="header-card">
      <h1>{{ entry.title }}</h1>
      <p>{{ entry.description }}</p>
      <p>
        <RingPill :ring="entry.ring" />
        {{ entry.quadrant }} &middot; trend: {{ entry.trend }}
      </p>
      <p v-if="lastChange.previousRing">
        Previous ring: <b>{{ lastChange.previousRing }}</b> &middot;
        Last change: <b>{{ lastChange.release ?? 'current (not yet released)' }}</b>
      </p>
      <p>Support: {{ entry.support }}</p>
    </section>

    <section class="what-to-do">
      <h2>What to do</h2>
      <p class="recommendation">{{ entry.recommendation }}</p>
      <p>Reason: {{ entry.reason }}
        <a v-if="voteLink" :href="voteLink.url" target="_blank" rel="noopener">View ring proposal &amp; vote</a>
      </p>
    </section>

    <section class="ring-history">
      <h2>Ring history</h2>
      <ul>
        <li v-for="h in entry.releaseHistory" :key="h.release">{{ h.release }}: <b>{{ h.ring }}</b></li>
        <li>current: <b>{{ entry.ring }}</b></li>
      </ul>
    </section>

    <section class="references" v-if="entry.links.length">
      <h2>References</h2>
      <ul>
        <li v-for="l in entry.links" :key="l.name">
          <a :href="l.url" target="_blank" rel="noopener">{{ l.name }}</a>
        </li>
      </ul>
    </section>

    <section class="related" v-if="entry.related.length">
      <h2>Related technologies</h2>
      <table>
        <thead><tr><th>Technology</th><th>Quadrant</th><th>Ring</th></tr></thead>
        <tbody>
          <tr v-for="r in entry.related" :key="r.id">
            <td><a href="#" @click.prevent="emit('open-detail', r.id)">{{ r.title }}</a></td>
            <td>{{ r.quadrant }}</td>
            <td><RingPill :ring="r.ring" /></td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.detail-page { padding: 1.5rem; max-width: 900px; margin: 0 auto; }
.breadcrumb { margin-bottom: 1rem; font-size: 0.85rem; color: var(--sap-text-muted, #5b738b); }
.recommendation { font-weight: bold; font-size: 1.05rem; }
section { margin-bottom: 1.5rem; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.4rem 0.3rem; border-bottom: 1px solid #f0f0f0; }
</style>
