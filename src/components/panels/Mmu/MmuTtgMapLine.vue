<template>
    <path :d="path" :stroke-width="strokeWidth" :class="pathClass" fill="none" marker-start="url(#squareStart)" marker-end="url(#arrowEnd)" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMmu, MmuTtgMap_LEADER, MmuTtgMap_MAP_SPACE, MmuTtgMap_START_X, MmuTtgMap_START_Y, MmuTtgMap_VERTICAL_SPACING, TOOL_GATE_UNKNOWN } from '@/composables/useMmu'

const props = withDefaults(
    defineProps<{
        tool: number
        selectedTool?: number
    }>(),
    {
        selectedTool: TOOL_GATE_UNKNOWN,
    }
)

const { ttgMap } = useMmu()

const gate = computed(() => ttgMap.value[props.tool] ?? TOOL_GATE_UNKNOWN)

const pathClass = computed(() => {
    if (props.tool === props.selectedTool) {
        return 'stroke-selected-color'
    }

    return 'stroke-regular-color'
})

const strokeWidth = computed(() => {
    if (props.tool === props.selectedTool) {
        return 4
    }

    return 2
})

const path = computed(() => {
    const xOffset = 28 // offset between tool number and line start
    const yOffset = 4 // to center the line vertically

    const x1 = MmuTtgMap_START_X + xOffset
    const y1 = MmuTtgMap_START_Y + props.tool * MmuTtgMap_VERTICAL_SPACING + yOffset
    const tX = x1 + MmuTtgMap_LEADER
    const gX = tX + MmuTtgMap_MAP_SPACE

    return `M ${x1} ${y1} ` + `L ${tX} ${y1} ` + `L ${gX - MmuTtgMap_LEADER} ${MmuTtgMap_START_Y + gate.value * MmuTtgMap_VERTICAL_SPACING + yOffset} ` + `L ${gX} ${MmuTtgMap_START_Y + gate.value * MmuTtgMap_VERTICAL_SPACING + yOffset}`
})
</script>

<style scoped>
.stroke-regular-color {
    stroke: rgb(var(--v-theme-secondary, 128 128 128));
}
.stroke-selected-color {
    stroke: rgb(var(--v-theme-primary, 44 169 188));
}
</style>
