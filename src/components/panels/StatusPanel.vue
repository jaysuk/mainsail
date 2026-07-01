<template>
    <div>
        <min-settings-panel />
        <klippy-state-panel />
        <panel v-if="klipperReadyForGui" :icon="mdiInformation" :title="printerStateOutput" :collapsible="true" card-class="status-panel">
            <template #icon>
                <v-progress-circular v-if="['paused', 'printing'].includes(printer_state)" :rotate="-90" :size="30" :width="5" :model-value="printPercent" color="primary" class="mr-3" />
            </template>
            <template #buttons>
                <v-btn v-for="button in filteredToolbarButtons" :key="button.loadingName" :color="button.color" :loading="loadings.includes(button.loadingName)" icon="" variant="text" @click="button.click">
                    <v-tooltip location="top">
                        <template #activator="{ props: activatorProps }">
                            <v-icon v-bind="activatorProps">{{ button.icon }}</v-icon>
                        </template>
                        <span>{{ button.text }}</span>
                    </v-tooltip>
                </v-btn>
                <v-menu v-if="multiFunctionButton" location="bottom end" :close-on-content-click="false" class="pa-0">
                    <template #activator="{ props: activatorProps }">
                        <v-btn icon="" variant="text" v-bind="activatorProps">
                            <v-icon>{{ mdiDotsVertical }}</v-icon>
                        </v-btn>
                    </template>
                    <v-list density="compact">
                        <v-list-item v-for="(entry, index) in multiFunctionMenuButtonsFiltered" :key="'multiFunction_' + index">
                            <v-btn size="small" style="width: 100%" @click="entry.click()">
                                <v-icon start size="small">{{ entry.icon }}</v-icon>
                                {{ entry.text }}
                            </v-btn>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </template>
            <status-panel-printstatus-thumbnail />
            <status-panel-exclude-object v-model:show-dialog="boolShowObjects" />
            <status-panel-pause-at-layer-dialog v-model:show-dialog="boolShowPauseAtLayer" />
            <template v-if="print_stats_message">
                <v-container>
                    <v-row>
                        <v-col class="py-2">
                            <span class="subtitle-2 px-0 text-disabled">
                                <v-icon class="mr-2 mt-1 float-left" color="warning" size="small">
                                    {{ mdiAlertOutline }}
                                </v-icon>
                                {{ print_stats_message }}
                            </span>
                        </v-col>
                    </v-row>
                </v-container>
                <v-divider class="mt-0 mb-0" />
            </template>
            <template v-if="display_message">
                <v-container>
                    <v-row class="flex-nowrap">
                        <v-col class="py-2" style="min-width: 0">
                            <span class="subtitle-2 px-0 text-disabled">
                                <v-icon class="mr-2 mt-1 float-left" size="small">{{ mdiMessageProcessingOutline }}</v-icon>
                                {{ display_message }}
                            </span>
                        </v-col>
                        <v-col class="col-auto py-2">
                            <v-icon class="text-disabled cursor-pointer" size="small" @click="clearDisplayMessage">
                                {{ mdiCloseCircle }}
                            </v-icon>
                        </v-col>
                    </v-row>
                </v-container>
                <v-divider class="mt-0 mb-0" />
            </template>
            <v-tabs v-model="activeTab" fixed-tabs>
                <v-tab v-if="current_filename" value="status">
                    <v-icon>{{ mdiSpeedometer }}</v-icon>
                </v-tab>
                <v-tab v-if="displayFilesTab" value="files">
                    <v-icon>{{ mdiFileDocumentMultipleOutline }}</v-icon>
                </v-tab>
                <v-tab v-if="displayHistoryTab" value="history">
                    <v-icon>{{ mdiHistory }}</v-icon>
                </v-tab>
                <v-tab value="jobqueue">
                    <v-badge :color="jobQueueBadgeColor" :content="jobsCount.toString()" :inline="true">
                        <v-icon color="disabled">{{ mdiTrayFull }}</v-icon>
                    </v-badge>
                </v-tab>
            </v-tabs>
            <v-divider class="my-0" />
            <v-window v-model="activeTab" class="_border-radius">
                <v-window-item v-if="current_filename" value="status">
                    <status-panel-printstatus />
                </v-window-item>
                <v-window-item v-if="displayFilesTab" value="files">
                    <status-panel-gcodefiles />
                </v-window-item>
                <v-window-item v-if="displayHistoryTab" value="history">
                    <status-panel-history />
                </v-window-item>
                <v-window-item value="jobqueue">
                    <status-panel-jobqueue />
                </v-window-item>
            </v-window>
        </panel>
        <confirmation-dialog
            v-model="showCancelJobDialog"
            :icon="mdiStopCircleOutline"
            :title="t('CancelJobDialog.CancelJob')"
            :text="t('CancelJobDialog.AreYouSure')"
            :action-button-text="t('Buttons.Yes')"
            :cancel-button-text="t('Buttons.No')"
            @action="cancelJob" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MinSettingsPanel from '@/components/panels/MinSettingsPanel.vue'
import KlippyStatePanel from '@/components/panels/KlippyStatePanel.vue'
import StatusPanelPrintstatus from '@/components/panels/Status/Printstatus.vue'
import StatusPanelGcodefiles from '@/components/panels/Status/Gcodefiles.vue'
import StatusPanelHistory from '@/components/panels/Status/History.vue'
import StatusPanelJobqueue from '@/components/panels/Status/Jobqueue.vue'
import StatusPanelExcludeObject from '@/components/panels/Status/ExcludeObject.vue'
import StatusPanelPrintstatusThumbnail from '@/components/panels/Status/PrintstatusThumbnail.vue'
import StatusPanelPauseAtLayerDialog from '@/components/panels/Status/PauseAtLayerDialog.vue'
import Panel from '@/components/ui/Panel.vue'
import {
    mdiAlertOutline,
    mdiBroom,
    mdiCloseCircle,
    mdiDotsVertical,
    mdiFileDocumentMultipleOutline,
    mdiHistory,
    mdiInformation,
    mdiLayersPlus,
    mdiMessageProcessingOutline,
    mdiPause,
    mdiPlay,
    mdiPrinter,
    mdiSelectionRemove,
    mdiSpeedometer,
    mdiStop,
    mdiStopCircleOutline,
    mdiTrayFull,
} from '@mdi/js'
import type { PrinterStateMacro } from '@/store/printer/types'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import { useBase } from '@/composables/useBase'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'
import { useServerJobQueueStore } from '@/store/server/jobQueue'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { klipperReadyForGui, printer_state, loadings } = useBase()
const printerStore = usePrinterStore()
const guiStore = useGuiStore()
const jobQueueStore = useServerJobQueueStore()

const showCancelJobDialog = ref(false)
const boolShowObjects = ref(false)
const boolShowPauseAtLayer = ref(false)

const activeTab = ref('files')
const lastFilename = ref('')

const jobsCount = computed(() => jobQueueStore.getJobsCount)

const jobQueueBadgeColor = computed(() => (jobsCount.value > 0 ? 'primary-darken-2' : 'grey-darken-2'))

const current_filename = computed(() => printerStore.print_stats?.filename ?? '')

const printPercent = computed(() => Math.floor(printerStore.getPrintPercent * 100))

const printerStateOutput = computed(() => {
    if (printer_state.value !== '') {
        const idle_timeout_state = printerStore.idle_timeout?.state

        if (printer_state.value === 'standby' && idle_timeout_state === 'Printing') return 'Busy'

        if (printer_state.value !== '' && ['paused', 'printing'].includes(printer_state.value)) {
            return printPercent.value + '% ' + printer_state.value.charAt(0).toUpperCase() + printer_state.value.slice(1)
        }

        return printer_state.value.charAt(0).toUpperCase() + printer_state.value.slice(1)
    }

    return t('Panels.StatusPanel.Unknown')
})

const printing_objects = computed(() => printerStore.exclude_object?.objects ?? [])

const display_message = computed(() => printerStore.display_status?.message ?? null)

const print_stats_message = computed(() => printerStore.print_stats?.message ?? null)

const layer_count = computed(() => printerStore.print_stats?.info?.total_layer ?? null)

const macros = computed(() => printerStore.getMacros ?? [])

const existsSetPauseAtLayer = computed(() => macros.value.findIndex((macro: PrinterStateMacro) => macro.name === 'SET_PAUSE_AT_LAYER') !== -1)

const existsSetPauseNextLayer = computed(() => macros.value.findIndex((macro: PrinterStateMacro) => macro.name === 'SET_PAUSE_NEXT_LAYER') !== -1)

const displayPauseAtLayerButton = computed(() => layer_count.value !== null && (existsSetPauseAtLayer.value || existsSetPauseNextLayer.value))

function clearDisplayMessage() {
    webSocketClient.emit('printer.gcode.script', { script: 'M117' })
}

function btnPauseJob() {
    webSocketClient.emit('printer.print.pause', {}, { loading: 'statusPrintPause' })
}

function btnResumeJob() {
    webSocketClient.emit('printer.print.resume', {}, { loading: 'statusPrintResume' })
}

function btnExcludeObject() {
    boolShowObjects.value = true
}

function btnPauseAtLayer() {
    boolShowPauseAtLayer.value = true
}

function cancelJob() {
    webSocketClient.emit('printer.print.cancel', {}, { loading: 'statusPrintCancel' })
}

function btnCancelJob() {
    const confirmOnCancelJob = guiStore.uiSettings.confirmOnCancelJob
    if (confirmOnCancelJob) {
        showCancelJobDialog.value = true
        return
    }

    cancelJob()
}

function btnClearJob() {
    webSocketClient.emit('printer.gcode.script', { script: 'SDCARD_RESET_FILE' }, { loading: 'statusPrintClear' })
}

function btnReprintJob() {
    webSocketClient.emit('printer.print.start', { filename: current_filename.value }, { loading: 'statusPrintReprint' })
}

const toolbarButtons = computed(() => [
    {
        text: t('Panels.StatusPanel.PausePrint'),
        color: 'warning',
        icon: mdiPause,
        loadingName: 'statusPrintPause',
        status: () => ['printing'].includes(printer_state.value),
        click: btnPauseJob,
    },
    {
        text: t('Panels.StatusPanel.ResumePrint'),
        color: 'success',
        icon: mdiPlay,
        loadingName: 'statusPrintResume',
        status: () => ['paused'].includes(printer_state.value),
        click: btnResumeJob,
    },
    {
        text: t('Panels.StatusPanel.CancelPrint'),
        color: 'error',
        icon: mdiStop,
        loadingName: 'statusPrintCancel',
        status: () => {
            if (guiStore.uiSettings.displayCancelPrint) return ['paused', 'printing'].includes(printer_state.value)

            return ['paused'].includes(printer_state.value)
        },
        click: btnCancelJob,
    },
    {
        text: t('Panels.StatusPanel.ExcludeObject.ExcludeObject'),
        color: 'warning',
        icon: mdiSelectionRemove,
        loadingName: 'excludeObjectButton',
        status: () => {
            if (multiFunctionButton.value || printing_objects.value.length < 2) return false

            return ['paused', 'printing'].includes(printer_state.value)
        },
        click: btnExcludeObject,
    },
    {
        text: t('Panels.StatusPanel.PauseAtLayer.PauseAtLayer'),
        color: 'warning',
        icon: mdiLayersPlus,
        loadingName: 'pauseAtLayer',
        status: () => {
            if (multiFunctionButton.value || !displayPauseAtLayerButton.value) return false

            return ['paused', 'printing'].includes(printer_state.value)
        },
        click: btnPauseAtLayer,
    },
    {
        text: t('Panels.StatusPanel.ClearPrintStats'),
        color: 'primary',
        icon: mdiBroom,
        loadingName: 'statusPrintClear',
        status: () => ['error', 'complete', 'cancelled'].includes(printer_state.value),
        click: btnClearJob,
    },
    {
        text: t('Panels.StatusPanel.ReprintJob'),
        color: 'primary',
        icon: mdiPrinter,
        loadingName: 'statusPrintReprint',
        status: () => ['error', 'complete', 'cancelled'].includes(printer_state.value),
        click: btnReprintJob,
    },
])

const filteredToolbarButtons = computed(() => toolbarButtons.value.filter((button) => button.status()))

const multiFunctionMenuButtons = computed(() => [
    {
        text: t('Panels.StatusPanel.ExcludeObject.ExcludeObject'),
        loadingName: 'excludeObjectButton',
        icon: mdiSelectionRemove,
        status: () => printing_objects.value.length > 1,
        disabled: () => ['paused', 'printing'].includes(printer_state.value),
        click: btnExcludeObject,
    },
    {
        text: t('Panels.StatusPanel.PauseAtLayer.PauseAtLayer'),
        loadingName: 'pauseAtLayer',
        icon: mdiLayersPlus,
        status: () => displayPauseAtLayerButton.value,
        disabled: () => ['paused', 'printing'].includes(printer_state.value),
        click: btnPauseAtLayer,
    },
])

const multiFunctionMenuButtonsFiltered = computed(() => multiFunctionMenuButtons.value.filter((button) => button.status()))

const multiFunctionButton = computed(() => {
    if (!['paused', 'printing'].includes(printer_state.value)) return false

    return multiFunctionMenuButtonsFiltered.value.length > 1
})

const displayFilesTab = computed(() => {
    const count = guiStore.uiSettings.dashboardFilesLimit ?? 5

    return count > 0
})

const displayHistoryTab = computed(() => {
    const count = guiStore.uiSettings.dashboardHistoryLimit ?? 5

    return count > 0
})

onMounted(() => {
    if (current_filename.value !== '') activeTab.value = 'status'
    if (!displayFilesTab.value) activeTab.value = 'history'
    if (!displayHistoryTab.value) activeTab.value = 'jobqueue'
})

watch(current_filename, (newVal) => {
    if (newVal === '') activeTab.value = 'files'
    else if (lastFilename.value !== newVal) activeTab.value = 'status'

    lastFilename.value = newVal
})
</script>

<style scoped>
._border-radius {
    border-bottom-left-radius: inherit;
    border-bottom-right-radius: inherit;
}

.v-theme--dark .v-tabs .v-tab:not(.v-tab--selected) .v-badge .v-icon {
    color: rgba(255, 255, 255, 0.6);
}
</style>
