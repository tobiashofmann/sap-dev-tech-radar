<script setup>
import { RING_COLORS } from '../ringColors.js'

defineProps({
  ring: { type: String, required: true }
})
</script>

<template>
  <span class="ring-pill" :style="{ color: RING_COLORS[ring], borderColor: RING_COLORS[ring] }">
    {{ ring }}
  </span>
</template>

<style scoped>
.ring-pill {
  display: inline-block;
  padding: 0.05rem 0.55rem;
  border: 1px solid;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  background: rgba(0, 0, 0, 0.03);
}
</style>
