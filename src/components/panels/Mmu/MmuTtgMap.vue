<template>
    <svg :viewBox="viewbox" preserveAspectRatio="xMidYMid meet" class="cursor-pointer" @click="emit('click')">
        <defs>
            <marker id="squareStart" fill="context-stroke" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                <rect x="0" y="0" width="7" height="7" stroke-width="2" />
            </marker>
            <marker id="arrowEnd" fill="context-stroke" markerWidth="7" markerHeight="7" refX="0" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 7 3.5, 0 7" stroke-width="1" />
            </marker>
        </defs>

        <g v-for="tool in toolsArray" :key="tool">
            <mmu-ttg-map-tool :tool="tool" :selected-tool="selectedTool" />
            <mmu-ttg-map-gate :gate="tool" :selected-gate="selectedGate" :gate-x="gateX" />
            <mmu-ttg-map-line :tool="tool" :selected-tool="selectedTool" />
        </g>

        <mmu-ttg-map-group v-for="([key, gates], index) in Object.entries(printGroups)" :key="'group_' + key" :group-number="+key" :group="gates" :current-group="currentGroup" :index="index" :gate-x="gateX" :group-x="groupX" />
    </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMmu, GATE_UNKNOWN, MmuTtgMap_START_X, MmuTtgMap_START_Y, MmuTtgMap_VERTICAL_SPACING, MmuTtgMap_GROUP_SPACING, MmuTtgMap_MAP_SPACE, MmuTtgMap_LEADER, TOOL_GATE_UNKNOWN } from '@/composables/useMmu'
import MmuTtgMapTool from '@/components/panels/Mmu/MmuTtgMapTool.vue'
import MmuTtgMapGate from '@/components/panels/Mmu/MmuTtgMapGate.vue'
import MmuTtgMapLine from '@/components/panels/Mmu/MmuTtgMapLine.vue'
import MmuTtgMapGroup from '@/components/panels/Mmu/MmuTtgMapGroup.vue'

const props = withDefaults(
    defineProps<{
        selectedTool?: number
        selectedGate?: number
        filteredTtgMap?: { tool: number; gate: number }[] | null
    }>(),
    {
        selectedTool: TOOL_GATE_UNKNOWN,
        selectedGate: GATE_UNKNOWN,
        filteredTtgMap: null,
    }
)

const emit = defineEmits<{
    click: []
}>()

const { mmu, mmuNumGates, ttgMap } = useMmu()

const gateX = computed(() => MmuTtgMap_START_X + MmuTtgMap_LEADER + MmuTtgMap_MAP_SPACE + MmuTtgMap_LEADER + 40)

const groupX = computed(() => {
    const xOffset = 10 // extra space between gates and groups

    return gateX.value + xOffset
})

const groups = computed(() => mmu.value?.endless_spool_groups ?? [])

const printGroups = computed(() => {
    if (props.filteredTtgMap !== null && props.filteredTtgMap?.length !== mmuNumGates.value) return {}

    const groups_: { [key: number]: number[] } = {}
    groups.value.forEach((group, index) => {
        if (!groups_[group]) {
            groups_[group] = []
        }

        groups_[group].push(index)
    })

    Object.keys(groups_).forEach((key) => {
        if (groups_[+key].length > 1) return

        delete groups_[+key]
    })

    return groups_
})

const width = computed(() => groupX.value + Object.keys(printGroups.value).length * MmuTtgMap_GROUP_SPACING)

const height = computed(() => MmuTtgMap_START_Y + mmuNumGates.value * MmuTtgMap_VERTICAL_SPACING + 6)

const viewbox = computed(() => `0 0 ${width.value} ${height.value}`)

const toolsArray = computed(() => {
    const array = []

    for (let tool = 0; tool < mmuNumGates.value; tool++) {
        if (tool === props.selectedTool) continue
        if (props.filteredTtgMap !== null && !props.filteredTtgMap?.some((map) => map.tool === tool)) continue

        array.push(tool)
    }

    if (props.selectedTool >= 0) array.push(props.selectedTool)

    return array
})

const currentGroup = computed(() => {
    if (props.selectedGate !== GATE_UNKNOWN) {
        return groups.value[props.selectedGate]
    }

    if (props.selectedTool !== TOOL_GATE_UNKNOWN) {
        const gate = ttgMap.value[props.selectedTool]
        if (gate !== GATE_UNKNOWN) {
            return groups.value[gate]
        }
    }

    return -1
})
</script>
