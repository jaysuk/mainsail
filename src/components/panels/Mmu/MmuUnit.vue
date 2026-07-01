<template>
    <div :class="mmuUnitClass" class="d-inline-flex flex-column mx-1 mb-3 mmu-unit">
        <div class="d-flex flex-wrap pt-3 px-4 position-relative">
            <mmu-unit-gate
                v-for="gateIndex in numGates"
                :key="gateIndex"
                :gate-index="gateIndex - 1 + firstGateNumber"
                :mmu-machine-unit="mmuMachineUnit"
                :show-details="showDetails"
                :show-context-menu="showContextMenu"
                :unhighlight-spools="unhighlightSpools"
                :selected-gate="selectedGate"
                :has-bypass="hasBypass"
                @edit-filament="editFilament"
                @select-gate="selectGate" />
            <mmu-unit-gate v-if="hasBypass" :gate-index="TOOL_GATE_BYPASS" :mmu-machine-unit="mmuMachineUnit" :show-context-menu="showContextMenu" :selected-gate="selectedGate" @select-gate="selectGate" />
        </div>
        <mmu-unit-footer class="pt-0 position-relative" :style="footerStyle" :mmu-machine-unit="mmuMachineUnit" :show-details="showDetails" :show-footer="showFooter" :unit-index="unitIndex" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMmu, TOOL_GATE_BYPASS } from '@/composables/useMmu'
import MmuUnitGate from '@/components/panels/Mmu/MmuUnitGate.vue'
import MmuUnitFooter from '@/components/panels/Mmu/MmuUnitFooter.vue'

const props = withDefaults(
    defineProps<{
        selectedGate: number
        unitIndex: number
        showDetails?: boolean
        showContextMenu?: boolean
        showFooter?: boolean
        hideBypass?: boolean
        unhighlightSpools?: boolean
    }>(),
    {
        showDetails: false,
        showContextMenu: true,
        showFooter: true,
        hideBypass: false,
        unhighlightSpools: false,
    }
)

const emit = defineEmits<{
    'edit-filament': [gateIndex: number]
    'select-gate': [gateIndex: number]
}>()

const { getMmuMachineUnit, spoolWidth } = useMmu()

const mmuUnitClass = computed(() => (props.unitIndex < 0 ? 'mmu-unit-clear' : ''))

const mmuMachineUnit = computed(() => getMmuMachineUnit(props.unitIndex))

const numGates = computed(() => mmuMachineUnit.value?.num_gates ?? 0)

const firstGateNumber = computed(() => mmuMachineUnit.value?.first_gate ?? 0)

const hasBypass = computed(() => {
    if (props.hideBypass) return false

    return mmuMachineUnit.value?.has_bypass ?? true
})

const footerStyle = computed(() => {
    const numSpools = numGates.value + (hasBypass.value ? 1 : 0)
    const maxWidth = spoolWidth.value * numSpools + 32
    return `max-width: ${maxWidth}px;`
})

function editFilament(gateIndex: number) {
    emit('edit-filament', gateIndex)
}

function selectGate(gateIndex: number) {
    emit('select-gate', gateIndex)
}
</script>

<style scoped>
.mmu-unit-clear {
    background: none !important;
    box-shadow: none !important;
}

.mmu-unit {
    background: #2c2c2c;
    overflow: hidden;
    border-radius: 32px 32px 8px 8px;
    box-shadow: inset 0 4px 4px -4px #ffffff80;
}

html.theme--light .mmu-unit {
    background: #f0f0f0;
    box-shadow: inset 0 4px 2px -4px #2c2c2c80;
}
</style>
