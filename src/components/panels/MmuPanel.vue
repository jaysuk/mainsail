<template>
    <panel v-if="showPanel" :icon="mdiMulticast" :title="title" :collapsible="true" card-class="mmu-panel">
        <template #buttons>
            <v-menu location="bottom end" :close-on-content-click="false">
                <template #activator="{ props: activatorProps }">
                    <v-btn icon="" variant="text" v-bind="activatorProps">
                        <v-icon>{{ mdiDotsVertical }}</v-icon>
                    </v-btn>
                </template>
                <v-list density="compact">
                    <v-list-item :disabled="!enabled" :class="{ 'mmu-disabled': !enabled }">
                        <v-btn size="small" class="w-100" @click="showEditTtgMapDialog = true">
                            {{ t('Panels.MmuPanel.EditTtgMap') }}
                        </v-btn>
                    </v-list-item>
                    <v-list-item :disabled="!enabled" :class="{ 'mmu-disabled': !enabled }">
                        <v-btn size="small" class="w-100" @click="showEditGateMapDialog = true">
                            {{ t('Panels.MmuPanel.EditGateMap') }}
                        </v-btn>
                    </v-list-item>
                    <v-list-item :disabled="!enabled" :class="{ 'mmu-disabled': !enabled }">
                        <v-btn size="small" class="w-100" :disabled="!canSend" @click="showRecoverStateDialog = true">
                            {{ t('Panels.MmuPanel.RecoverState') }}
                        </v-btn>
                    </v-list-item>
                    <v-list-item :disabled="!enabled" :class="{ 'mmu-disabled': !enabled }">
                        <v-btn size="small" class="w-100" :disabled="!canSend" @click="showMaintenanceDialog = true">
                            {{ t('Panels.MmuPanel.MmuMaintenance') }}
                        </v-btn>
                    </v-list-item>
                    <v-divider class="my-2" />
                    <v-list-item :disabled="!enabled" :class="{ 'mmu-disabled': !enabled }">
                        <v-btn size="small" class="w-100" :loading="loadings.includes('mmu_stats')" @click="doSend('MMU_STATS SHOWCOUNTS=1', 'mmu_stats')">
                            <v-icon start>{{ mdiNoteText }}</v-icon>
                            {{ t('Panels.MmuPanel.ButtonPrintStats') }}
                        </v-btn>
                    </v-list-item>
                    <v-list-item :disabled="!enabled || mmuSpoolmanSupport === 'off'" :class="{ 'mmu-disabled': !enabled || mmuSpoolmanSupport === 'off' }">
                        <v-btn size="small" class="w-100" :loading="loadings.includes('mmu_spoolman')" @click="handleSyncSpoolman()">
                            <v-icon start>{{ mdiRefresh }}</v-icon>
                            {{ t('Panels.MmuPanel.ButtonSyncSpoolman') }}
                        </v-btn>
                    </v-list-item>
                    <v-list-item :disabled="!enabled" :class="{ 'mmu-disabled': !enabled }">
                        <v-btn size="small" class="w-100" :disabled="!canSend" :loading="loadings.includes('mmu_check_gates')" @click="doSend('MMU_CHECK_GATES', 'mmu_check_gates')">
                            <v-icon start>{{ mdiCheckAll }}</v-icon>
                            {{ t('Panels.MmuPanel.ButtonCheckAllGates') }}
                        </v-btn>
                    </v-list-item>
                </v-list>
            </v-menu>
            <mmu-panel-settings />
        </template>

        <v-card-text :class="{ 'mmu-disabled': !enabled }">
            <v-row>
                <v-col class="pb-0">
                    <mmu-unit v-for="i in mmuNumUnits" :key="i" :selected-gate="mmuGate" :unit-index="i - 1" :show-details="true" @edit-filament="editFilament" @select-gate="selectGate" />
                    <mmu-unit v-if="showStandaloneBypass" key="bypass" :selected-gate="mmuGate" :unit-index="-1" :show-details="false" :show-footer="false" @select-gate="selectGate" />
                </v-col>
            </v-row>
            <v-row>
                <v-col :cols="col1Size">
                    <div class="text-disabled body-1">{{ toolchangeText }}</div>
                    <mmu-filament-status />
                    <div v-if="showClogDetection" class="text-center">
                        <mmu-clog-meter v-if="hasMmuEncoder" width="40%" />
                        <mmu-flowguard-meter v-if="hasSyncFeedback" width="40%" />
                        <div class="text-disabled body-1">{{ t('Panels.MmuPanel.ClogTangleDetection') }}</div>
                    </div>
                </v-col>
                <v-col :cols="12 - col1Size">
                    <template v-if="showDetails">
                        <mmu-gate-summary :gate-index="mmuGate" />
                        <v-divider />
                    </template>
                    <mmu-controls />
                    <template v-if="showTtgMap">
                        <v-divider />
                        <div class="d-flex flex-column align-center">
                            <mmu-ttg-map width="75%" :selected-tool="mmuTool" :selected-gate="mmuGate" @click="showEditTtgMapDialog = true" />
                        </div>
                        <div class="text-disabled text-center body-1">{{ t('Panels.MmuPanel.ToolMapping') }}</div>
                    </template>
                </v-col>
            </v-row>
        </v-card-text>
        <template v-if="reasonForPause">
            <v-divider />
            <v-card-text class="pt-3">
                <v-row>
                    <v-col cols="auto" class="d-flex justify-center pr-0">
                        <v-icon color="error">{{ mdiInformationOutline }}</v-icon>
                    </v-col>
                    <v-col>
                        <div class="text-medium-emphasis body-1"><strong>Last Error</strong></div>
                        <div class="text-disabled body-2">{{ reasonForPause }}</div>
                    </v-col>
                </v-row>
            </v-card-text>
        </template>
        <mmu-edit-gate-map-dialog v-model="showEditGateMapDialog" :initial-gate="initialEditGate" @close="initialEditGate = null" />
        <mmu-edit-ttg-map-dialog v-model="showEditTtgMapDialog" :file="fileForTtgMap" />
        <mmu-recover-state-dialog v-model="showRecoverStateDialog" />
        <mmu-maintenance-dialog v-model="showMaintenanceDialog" />
    </panel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiMulticast, mdiDotsVertical, mdiCheckAll, mdiNoteText, mdiInformationOutline, mdiRefresh } from '@mdi/js'
import Panel from '@/components/ui/Panel.vue'
import MmuPanelSettings from '@/components/panels/Mmu/MmuPanelSettings.vue'
import MmuFilamentStatus from '@/components/panels/Mmu/MmuFilamentStatus.vue'
import MmuClogMeter from '@/components/panels/Mmu/MmuClogMeter.vue'
import MmuFlowguardMeter from '@/components/panels/Mmu/MmuFlowguardMeter.vue'
import MmuGateSummary from '@/components/panels/Mmu/MmuGateSummary.vue'
import MmuControls from '@/components/panels/Mmu/MmuControls.vue'
import MmuTtgMap from '@/components/panels/Mmu/MmuTtgMap.vue'
import MmuUnit from '@/components/panels/Mmu/MmuUnit.vue'
import MmuEditGateMapDialog from '@/components/dialogs/MmuEditGateMapDialog.vue'
import MmuEditTtgMapDialog from '@/components/dialogs/MmuEditTtgMapDialog.vue'
import MmuRecoverStateDialog from '@/components/dialogs/MmuRecoverStateDialog.vue'
import MmuMaintenanceDialog from '@/components/dialogs/MmuMaintenanceDialog.vue'
import { useBase } from '@/composables/useBase'
import { useMmu, TOOL_GATE_BYPASS, TOOL_GATE_UNKNOWN } from '@/composables/useMmu'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { klipperReadyForGui, loadings, printerIsPrinting } = useBase()
const { mmu, mmuNumUnits, mmuGate, mmuTool, hasMmuEncoder, hasSyncFeedback, mmuSpoolmanSupport, canSend, doSend, getMmuMachineUnit } = useMmu()
const printerStore = usePrinterStore()
const guiStore = useGuiStore()

const showRecoverStateDialog = ref(false)
const showEditTtgMapDialog = ref(false)
const showEditGateMapDialog = ref(false)
const showMaintenanceDialog = ref(false)
const initialEditGate = ref<number | null>(null)

const showPanel = computed(() => {
    if (!klipperReadyForGui.value) return false

    return 'mmu' in printerStore
})

const enabled = computed<boolean>(() => mmu.value?.enabled ?? false)

const title = computed(() => {
    let headline = t('Panels.MmuPanel.Headline')
    if (!enabled.value) {
        const disabledText = t('Panels.MmuPanel.Disabled')

        headline += ` (${disabledText})`
    }

    return headline
})

const largeFilamentStatus = computed(() => guiStore.view.mmu?.largeFilamentStatus ?? false)

const col1Size = computed(() => (largeFilamentStatus.value ? 6 : 5))

function editFilament(gateIndex: number) {
    initialEditGate.value = gateIndex
    showEditGateMapDialog.value = true
}

function selectGate(gateIndex: number) {
    if (gateIndex === TOOL_GATE_BYPASS) {
        doSend('MMU_SELECT BYPASS=1', 'mmu_select')
        return
    }

    doSend(`MMU_SELECT GATE=${gateIndex}`, 'mmu_select')
}

const showStandaloneBypass = computed(() => {
    for (let i = 0; i < mmuNumUnits.value; i++) {
        if (getMmuMachineUnit(i)?.has_bypass) return false
    }
    return true
})

const showClogDetection = computed(() => (hasMmuEncoder.value || hasSyncFeedback.value) && guiStore.view.mmu.showClogDetection)

const showTtgMap = computed(() => guiStore.view.mmu.showTtgMap ?? true)

const showDetails = computed(() => guiStore.view.mmu.showDetails ?? true)

const lastTool = computed(() => mmu.value?.last_tool ?? TOOL_GATE_UNKNOWN)

const nextTool = computed(() => mmu.value?.next_tool ?? TOOL_GATE_UNKNOWN)

const toolchangeText = computed(() => {
    if (nextTool.value === TOOL_GATE_UNKNOWN) return ''

    const label = (t: number) => (t === TOOL_GATE_BYPASS ? 'Bypass' : `T${t}`)
    const parts: string[] = ['Changing tool']
    if (lastTool.value !== TOOL_GATE_UNKNOWN) {
        parts.push('from', label(lastTool.value))
    }
    parts.push('to', label(nextTool.value))
    return parts.join(' ')
})

const reasonForPause = computed(() => mmu.value?.reason_for_pause ?? null)

const fileForTtgMap = computed(() => {
    if (!printerIsPrinting.value) return null

    return printerStore.current_file ?? null
})

function handleSyncSpoolman() {
    doSend('MMU_SPOOLMAN REFRESH=1 QUIET=1', 'mmu_spoolman')
}
</script>

<style scoped>
.mmu-disabled {
    pointer-events: none !important;
    opacity: 0.5 !important;
}
</style>
