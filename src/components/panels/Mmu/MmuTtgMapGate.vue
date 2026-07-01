<template>
    <text :x="gateX" :y="positionY" text-anchor="end" :fill="fill" font-size="10px" :font-weight="fontWeight">
        {{ name }}
    </text>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GATE_UNKNOWN, MmuTtgMap_START_Y, MmuTtgMap_VERTICAL_SPACING } from '@/composables/useMmu'

const props = withDefaults(
    defineProps<{
        gate: number
        gateX: number
        selectedGate?: number
    }>(),
    {
        selectedGate: GATE_UNKNOWN,
    }
)

const name = computed(() => `#${props.gate}`)

const positionY = computed(() => props.gate * MmuTtgMap_VERTICAL_SPACING + MmuTtgMap_START_Y + 8)

const fill = computed(() => (props.gate === props.selectedGate ? 'rgb(var(--v-theme-primary, 44 169 188))' : 'currentColor'))

const fontWeight = computed(() => (props.gate === props.selectedGate ? 'bold' : 'inherit'))
</script>
