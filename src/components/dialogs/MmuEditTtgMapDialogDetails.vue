<template>
    <v-row>
        <v-col cols="4" class="d-flex align-center pr-0">
            <v-list v-if="fileNeedsTool" class="max-width-100">
                <v-list-item class="pr-0">
                    <div class="text-overline">{{ t('Panels.MmuPanel.TtgMapDialog.SlicerExpects') }}</div>
                    <v-divider />
                    <div class="mb-2 mt-2">
                        <span class="tool-swatch mr-1" :style="'background-color: ' + fileFilamentColor" />
                        {{ toolName }}
                    </div>
                    <v-list-item-title class="wrap-tool-name">{{ fileFilamentName }}</v-list-item-title>
                    <v-list-item-subtitle>{{ fileFilamentDetails }}</v-list-item-subtitle>
                    <v-alert v-if="selectedGateWarnings.length > 0" color="warning" density="compact" variant="text" class="mt-2 max-width-100">
                        <p class="mb-2">{{ t('Panels.MmuPanel.TtgMapDialog.Mismatch') }}</p>
                        <ul class="mb-0">
                            <li v-for="(warning, index) in selectedGateWarnings" :key="index">{{ warning }}</li>
                        </ul>
                    </v-alert>
                </v-list-item>
            </v-list>
            <div v-else class="body-2 text-medium-emphasis">{{ toolRowText }}</div>
        </v-col>
        <v-col cols="1" class="d-flex justify-center align-center">
            <span class="triangle" />
        </v-col>
        <v-col cols="7" class="pa-0 minwidth-0">
            <v-data-table :headers="gateTableHeaders" :items="gateItems" :item-value="(item) => item" class="drop-down-table" :items-per-page="-1" hide-default-footer>
                <template #no-data>
                    <div class="text-center">
                        {{ t('Panels.MmuPanel.TtgMapDialog.NoGateData') }}
                    </div>
                </template>

                <template #item="{ item }">
                    <mmu-edit-ttg-map-dialog-details-row :ref="(el) => setRowRef(item, el)" :gate="item" :selected-gate="selectedGate" @select-gate="selectGate(item)" @select-endless-spool-group="selectEndlessSpoolGroup(item)" />
                </template>
            </v-data-table>
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu, GATE_UNKNOWN, TOOL_GATE_BYPASS } from '@/composables/useMmu'
import type { FileStateGcodefile } from '@/store/files/types'
import { colorsMatch, convertStringToArray } from '@/plugins/helpers'
import MmuEditTtgMapDialogDetailsRow from '@/components/dialogs/MmuEditTtgMapDialogDetailsRow.vue'

const props = withDefaults(
    defineProps<{
        tool: number
        file?: FileStateGcodefile | null
    }>(),
    {
        file: null,
    }
)

const { t } = useI18n()
const { mmu, ttgMap, endlessSpoolGroups, doSend, formColorString } = useMmu()

const rowRefs = new Map<number, HTMLTableRowElement>()
function setRowRef(gate: number, el: unknown) {
    if (el) rowRefs.set(gate, (el as { $el: HTMLTableRowElement }).$el)
    else rowRefs.delete(gate)
}

const toolName = computed(() => {
    if (props.tool === TOOL_GATE_BYPASS) return t('Panels.MmuPanel.TtgMapDialog.Bypass')

    return `T${props.tool}`
})

const fileFilamentWeight = computed(() => {
    const weights = props.file?.filament_weights ?? []

    return weights[props.tool] ?? 0
})

const toolRowText = computed(() => {
    if (props.file && fileFilamentWeight.value === 0) return t('Panels.MmuPanel.TtgMapDialog.ToolNotUsed', { tool: toolName.value })

    return t('Panels.MmuPanel.TtgMapDialog.NoSlicerInfo', { tool: toolName.value })
})

const fileNeedsTool = computed(() => props.file && fileFilamentWeight.value > 0)

const fileFilamentColor = computed(() => {
    let colors = props.file?.extruder_colors ?? []
    if (['BambuStudio', 'OrcaSlicer'].includes(props.file?.slicer ?? '')) {
        colors = props.file?.filament_colors ?? []
    }

    return formColorString(colors[props.tool] ?? '')
})

const fileFilamentName = computed(() => {
    const names = convertStringToArray(props.file?.filament_name ?? '')

    return names[props.tool]?.trim() ?? 'Unknown'
})

const fileFilamentTemp = computed(() => {
    const temps = props.file?.filament_temps ?? []

    return temps[props.tool] ?? 0
})

const fileFilamentType = computed(() => {
    const types = convertStringToArray(props.file?.filament_type ?? '')

    return types[props.tool]?.trim() ?? 'Unknown'
})

const fileFilamentDetails = computed(() => {
    const details = [fileFilamentType.value]
    if (fileFilamentTemp.value) {
        details.push(fileFilamentTemp.value + '°C')
    }

    return details.join(' | ')
})

const gateItems = computed(() => {
    const gates = []
    for (let i = 0; i < (mmu.value?.num_gates ?? 0); i++) {
        gates.push(i)
    }

    return gates
})

const gateTableHeaders = computed(() => {
    if (props.tool < 0) return []

    return [
        {
            title: t('Panels.MmuPanel.TtgMapDialog.Gate'),
            align: 'center' as const,
            key: 'index',
            value: (item: number) => item,
            sortable: false,
        },
        {
            title: '',
            align: 'center' as const,
            sortable: false,
        },
        {
            title: t('Panels.MmuPanel.TtgMapDialog.FilamentInfo'),
            align: 'start' as const,
            sortable: false,
        },
        {
            title: t('Panels.MmuPanel.TtgMapDialog.EndlessSpool'),
            align: 'end' as const,
            sortable: false,
        },
    ]
})

const selectedGate = computed(() => ttgMap.value[props.tool] ?? null)

const selectedGateMaterial = computed(() => mmu.value?.gate_material?.[selectedGate.value] ?? null)

const selectedGateTemperature = computed(() => mmu.value?.gate_temperature?.[selectedGate.value] ?? null)

const selectedGateColor = computed(() => mmu.value?.gate_color?.[selectedGate.value] ?? null)

const selectedGateWarnings = computed(() => {
    const warnings = []

    if (selectedGateMaterial.value !== fileFilamentType.value) {
        warnings.push(t('Panels.MmuPanel.TtgMapDialog.Material'))
    }

    if (selectedGateTemperature.value !== fileFilamentTemp.value) {
        warnings.push(t('Panels.MmuPanel.TtgMapDialog.Temperature'))
    }

    const selectedGateColorString = formColorString(selectedGateColor.value)
    if (selectedGateColor.value === null || !colorsMatch(selectedGateColorString, fileFilamentColor.value, 10)) {
        warnings.push(t('Panels.MmuPanel.TtgMapDialog.Color'))
    }

    return warnings
})

function selectGate(gate: number) {
    doSend(`MMU_REMAP_TTG TOOL=${props.tool} GATE=${gate} QUIET=1`)
}

function selectEndlessSpoolGroup(gate: number) {
    if (gate === GATE_UNKNOWN) return

    // copy the array to change one value
    const groups = [...endlessSpoolGroups.value]
    // get the current group of the selected gate
    const selectedGroup = groups[selectedGate.value]
    // toggle the group of the clicked gate
    groups[gate] = groups[gate] === selectedGroup ? gate : selectedGroup

    doSend(`MMU_ENDLESS_SPOOL GROUPS="${groups.join(',')}" QUIET=1`)
}

function scrollToSelectedGate() {
    nextTick(() => {
        const element = rowRefs.get(selectedGate.value)
        element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
}

onMounted(() => {
    scrollToSelectedGate()
})

watch(
    () => props.tool,
    () => {
        scrollToSelectedGate()
    }
)
</script>

<style scoped>
.max-width-100 {
    max-width: 100%;
}

.tool-swatch {
    display: inline-block;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    border: 1px solid lightgray;
    vertical-align: middle;
}

.triangle {
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 40px 0 40px 15px;
    border-color: transparent transparent transparent #595959;
}

:deep(.drop-down-table .v-table__wrapper) {
    height: 300px;
    overflow-y: auto;
}

:deep(.drop-down-table .v-table__wrapper table) {
    table-layout: fixed;
    width: 100%;
}

:deep(.drop-down-table table th:nth-child(1)),
:deep(.drop-down-table table th:nth-child(4)) {
    width: 64px;
}

:deep(.drop-down-table table th:nth-child(2)) {
    width: 36px;
}
</style>
