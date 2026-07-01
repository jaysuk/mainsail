<template>
    <text :x="positionX" :y="positionY" text-anchor="end" :fill="fill" font-size="10px" :font-weight="fontWeight">
        {{ name }}
    </text>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MmuTtgMap_START_X, MmuTtgMap_START_Y, MmuTtgMap_VERTICAL_SPACING, TOOL_GATE_UNKNOWN } from '@/composables/useMmu'

const props = withDefaults(
    defineProps<{
        tool: number
        selectedTool?: number
    }>(),
    {
        selectedTool: TOOL_GATE_UNKNOWN,
    }
)

const name = computed(() => `T${props.tool}`)

const positionX = computed(() => MmuTtgMap_START_X + 14)

const positionY = computed(() => props.tool * MmuTtgMap_VERTICAL_SPACING + MmuTtgMap_START_Y + 8)

const fill = computed(() => (props.tool === props.selectedTool ? 'rgb(var(--v-theme-primary, 44 169 188))' : 'currentColor'))

const fontWeight = computed(() => (props.tool === props.selectedTool ? 'bold' : 'inherit'))
</script>
