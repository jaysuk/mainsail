<template>
    <tr :class="rowClass" @click="selectGate">
        <td class="text-center">{{ gate }}</td>
        <td class="px-0 py-2 w-36">
            <mmu-unit-gate-spool svg-class="w-36" :gate-index="gate" />
        </td>
        <td class="py-0" style="width: 264px">
            <mmu-gate-summary :gate-index="gate" :compact="true" />
        </td>
        <td class="text-right">
            <span class="es-group-icon" :class="endlessSpoolClass" @click.stop="selectEndlessSpoolGroup" />
        </td>
    </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMmu, GATE_EMPTY } from '@/composables/useMmu'
import MmuUnitGateSpool from '@/components/panels/Mmu/MmuUnitGateSpool.vue'
import MmuGateSummary from '@/components/panels/Mmu/MmuGateSummary.vue'

const props = defineProps<{
    gate: number
    selectedGate: number
}>()

const emit = defineEmits<{
    'select-gate': []
    'select-endless-spool-group': []
}>()

const { mmu, endlessSpoolGroups } = useMmu()

const gateStatus = computed(() => {
    const status = mmu.value?.gate_status ?? []

    return status[props.gate] ?? GATE_EMPTY
})

const rowClass = computed(() => ({
    'cursor-pointer': true,
    'disabled-row': gateStatus.value === GATE_EMPTY,
    'selected-row': props.gate === props.selectedGate,
}))

const endlessSpoolGroup = computed(() => endlessSpoolGroups.value[props.gate] ?? null)

const selectedEndlessSpoolGroup = computed(() => endlessSpoolGroups.value[props.selectedGate] ?? null)

const endlessSpoolClass = computed(() => ({
    'disabled-group': selectedEndlessSpoolGroup.value === props.gate,
    'selected-group': endlessSpoolGroup.value === selectedEndlessSpoolGroup.value,
}))

function selectGate() {
    emit('select-gate')
}

function selectEndlessSpoolGroup() {
    emit('select-endless-spool-group')
}
</script>

<style scoped>
.v-data-table__table {
    table-layout: fixed;
}

.selected-row {
    background: #595959;
}

.disabled-row {
    opacity: 0.7;
}

:deep(.w-36) {
    width: 36px;
}

.es-group-icon {
    display: inline-block;
    width: 24px;
    height: 24px;
    border-radius: 25%;
    border: 1px solid rgb(var(--v-theme-secondary));
    vertical-align: middle;
    cursor: context-menu;
}

.es-group-icon.disabled-group {
    cursor: not-allowed;
}

.es-group-icon.selected-group {
    background-color: limegreen;
}
</style>
