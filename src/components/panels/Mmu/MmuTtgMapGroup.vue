<template>
    <g>
        <path :d="path" stroke-width="2" stroke-linecap="round" :class="elementClass" fill="none" />
        <text :x="textPositionX" :y="textPositionY" :class="elementClass" stroke-width="0" font-size="8px">
            {{ groupChar }}
        </text>
    </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMmu, MmuTtgMap_GROUP_SPACING, MmuTtgMap_START_Y, MmuTtgMap_VERTICAL_SPACING } from '@/composables/useMmu'

const props = withDefaults(
    defineProps<{
        groupNumber: number
        group: number[]
        index: number
        gateX: number
        groupX: number
        currentGroup?: number
    }>(),
    {
        currentGroup: -1,
    }
)

const { mmuNumGates } = useMmu()

const textPositionX = computed(() => props.groupX + props.index * MmuTtgMap_GROUP_SPACING)

const textPositionY = computed(() => MmuTtgMap_START_Y + mmuNumGates.value * MmuTtgMap_VERTICAL_SPACING + 2)

const path = computed(() => {
    const tick = 5 // length of the horizontal tick
    const y1 = MmuTtgMap_START_Y + 4 // small offset to align with gate lines

    const paths: string[] = []
    let y0: number | null = null

    props.group.forEach((gate) => {
        const y = y1 + gate * MmuTtgMap_VERTICAL_SPACING
        paths.push(`M ${textPositionX.value + tick} ${y} L ${textPositionX.value} ${y}`)
        if (y0 !== null) {
            paths.push(`M ${textPositionX.value + tick} ${y0} L ${textPositionX.value + tick} ${y}`)
        }
        y0 = y
    })

    return paths.join(' ')
})

const groupChar = computed(() => String.fromCharCode(props.groupNumber + 65))

const elementClass = computed(() => (props.groupNumber === props.currentGroup ? 'selected' : 'regular'))
</script>

<style scoped>
.regular {
    stroke: rgb(var(--v-theme-secondary, 128 128 128));
    fill: rgb(var(--v-theme-secondary, 128 128 128));
    font-weight: normal;
}
.selected {
    stroke: rgb(var(--v-theme-primary, 44 169 188));
    fill: rgb(var(--v-theme-primary, 44 169 188));
    font-weight: bold;
}
</style>
