<script setup>
import { computed } from 'vue'

const props = defineProps({
  entries: { type: Array, required: true }
})
const emit = defineEmits(['back', 'open-detail'])

const deprecatedEntries = computed(() =>
  props.entries
    .filter((e) => e.ring === 'DEPRECATED')
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
)
</script>

<template>
  <div class="deprecated-page">
    <nav class="breadcrumb">
      <a href="#" @click.prevent="emit('back')">Radar</a> &rsaquo; Deprecated
    </nav>

    <h1>Deprecated Technologies</h1>
    <p class="intro">This page lists all technologies that have been marked as deprecated in the SAP Development Tech Radar.</p>

    <ui5-card>
      <ui5-card-header slot="header" :title-text="`${deprecatedEntries.length} technologies`"></ui5-card-header>
      <div class="card-body">
        <table class="deprecated-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Quadrant</th>
              <th>Deprecated since</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in deprecatedEntries" :key="e.id" @click="emit('open-detail', e.id)">
              <td><a href="#" @click.prevent="emit('open-detail', e.id)">{{ e.title }}</a></td>
              <td>{{ e.quadrant }}</td>
              <td>{{ e.since }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ui5-card>
  </div>
</template>

<style scoped>
.deprecated-page { padding: 1.5rem; max-width: 900px; margin: 0 auto; }
.breadcrumb { margin-bottom: 1rem; font-size: 0.85rem; color: var(--sap-text-muted, #5b738b); }
h1 { font-size: 1.5rem; margin: 0 0 0.4rem; }
.intro { color: var(--sap-text-muted, #5b738b); margin: 0 0 1.25rem; }

.card-body { padding: 0.5rem 1.5rem 1.5rem; }
.deprecated-table { width: 100%; border-collapse: collapse; }
.deprecated-table th {
  text-align: left;
  padding: 0.5rem 0.4rem;
  border-bottom: 1px solid var(--sap-border, #e4e7eb);
  font-size: 0.8rem;
  color: var(--sap-text-muted, #5b738b);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.deprecated-table td { padding: 0.5rem 0.4rem; border-bottom: 1px solid #f0f0f0; }
.deprecated-table tr { cursor: pointer; }
</style>
