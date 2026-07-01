<template>
    <panel :icon="mdiFileDocumentMultipleOutline" :title="t('History.PrintHistory')" card-class="history-list-panel">
        <v-card-text>
            <v-row>
                <v-col class="col-4 d-flex align-center">
                    <v-text-field v-model="search" :append-inner-icon="mdiMagnify" :label="t('History.Search')" single-line variant="outlined" clearable hide-details density="compact" />
                </v-col>
                <v-col class="offset-4 col-4 d-flex align-center justify-end">
                    <v-tooltip v-if="selectedJobsTable.length" location="top">
                        <template #activator="{ props: activatorProps }">
                            <v-btn color="error" class="px-2 minwidth-0 ml-3" v-bind="activatorProps" @click="deleteSelectedDialog = true">
                                <v-icon>{{ mdiDelete }}</v-icon>
                            </v-btn>
                        </template>
                        <span>{{ t('Buttons.Delete') }}</span>
                    </v-tooltip>
                    <v-tooltip location="top">
                        <template #activator="{ props: activatorProps }">
                            <v-btn class="px-2 minwidth-0 ml-3" v-bind="activatorProps" @click="addMaintenanceDialog = true">
                                <v-icon>{{ mdiNotebookPlus }}</v-icon>
                            </v-btn>
                        </template>
                        <span>{{ t('History.AddMaintenance') }}</span>
                    </v-tooltip>
                    <v-tooltip v-if="!allLoaded" location="top">
                        <template #activator="{ props: activatorProps }">
                            <v-btn :loading="loadings.includes('historyLoadAll')" class="px-2 minwidth-0 ml-3" v-bind="activatorProps" @click="refreshHistory">
                                <v-icon>{{ mdiDatabaseArrowDownOutline }}</v-icon>
                            </v-btn>
                        </template>
                        <span>{{ t('History.LoadCompleteHistory') }}</span>
                    </v-tooltip>
                    <v-tooltip location="top">
                        <template #activator="{ props: activatorProps }">
                            <v-btn class="px-2 minwidth-0 ml-3" v-bind="activatorProps" @click="exportHistory">
                                <v-icon>{{ mdiDatabaseExportOutline }}</v-icon>
                            </v-btn>
                        </template>
                        <span>{{ t('History.TitleExportHistory') }}</span>
                    </v-tooltip>
                    <v-menu :close-on-content-click="false">
                        <template #activator="{ props: activatorProps }">
                            <v-tooltip location="top">
                                <template #activator="{ props: tooltipProps }">
                                    <v-btn class="px-2 minwidth-0 ml-3" v-bind="{ ...activatorProps, ...tooltipProps }">
                                        <v-icon>{{ mdiCog }}</v-icon>
                                    </v-btn>
                                </template>
                                <span>{{ t('History.Settings') }}</span>
                            </v-tooltip>
                        </template>
                        <v-list>
                            <v-list-item class="minHeight36">
                                <v-checkbox class="mt-0" hide-details :model-value="showMaintenanceEntries" :label="t('History.MaintenanceEntries')" @update:model-value="showMaintenanceEntries = !showMaintenanceEntries" />
                            </v-list-item>
                            <v-list-item class="minHeight36">
                                <v-checkbox class="mt-0" hide-details :model-value="showPrintJobs" :label="t('History.PrintJobs')" @update:model-value="showPrintJobs = !showPrintJobs" />
                            </v-list-item>
                            <v-divider />
                            <template v-if="printStatusArray.length">
                                <v-list-item v-for="status of printStatusArray" :key="status.name" class="minHeight36">
                                    <v-checkbox class="mt-0" hide-details :model-value="status.showInTable" :label="`${status.displayName} (${status.value})`" @update:model-value="changeStatusVisible(status)" />
                                </v-list-item>
                                <v-divider />
                            </template>
                            <v-list-item v-for="(header, index) of configHeaders" :key="'history-list-panel-header-option-' + index" class="minHeight36">
                                <v-checkbox v-model="header.visible" class="mt-0" hide-details :label="header.text" @update:model-value="changeColumnVisible(header.value)" />
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </v-col>
            </v-row>
        </v-card-text>
        <v-divider class="mb-3" />
        <v-data-table
            v-model="selectedJobsTable"
            :items="entries"
            class="history-jobs-table"
            :headers="vuetifyHeaders"
            v-model:sort-by="vuetifySortBy"
            v-model:items-per-page="countPerPage"
            :items-per-page-options="[10, 25, 50, 100, -1]"
            item-value="select_id"
            return-object
            :search="search"
            :custom-filter="advancedSearch"
            :mobile-breakpoint="0"
            show-select>
            <template #no-data>
                <div class="text-center">{{ t('History.Empty') }}</div>
            </template>

            <template #item="{ item, isSelected, toggleSelect, internalItem }">
                <history-list-entry-job v-if="item.type === 'job'" :key="item.select_id" :is-selected="isSelected(internalItem)" :item="item" :table-fields="tableFields" @select="() => toggleSelect(internalItem)" />
                <history-list-entry-maintenance
                    v-else-if="item.type === 'maintenance'"
                    :key="item.select_id"
                    :is-selected="isSelected(internalItem)"
                    :item="item"
                    :table-fields="tableFields"
                    @select="() => toggleSelect(internalItem)" />
            </template>
        </v-data-table>
        <confirmation-dialog v-model="deleteSelectedDialog" :title="t('History.Delete')" :text="deleteSelectedQuestion" :action-button-text="t('Buttons.Delete')" :icon="mdiDelete" @action="deleteSelectedJobs" />
        <history-list-panel-add-maintenance v-model="addMaintenanceDialog" />
    </panel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DataTableSortItem } from 'vuetify'
import type { HistoryListPanelCol, HistoryListRowJob, ServerHistoryStateAllPrintStatusEntry, ServerHistoryStateJob } from '@/store/server/history/types'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick, mdiCog, mdiDatabaseArrowDownOutline, mdiDatabaseExportOutline, mdiDelete, mdiFileDocumentMultipleOutline, mdiMagnify, mdiNotebookPlus } from '@mdi/js'
import HistoryListEntryJob from '@/components/panels/History/HistoryListEntryJob.vue'
import HistoryListPanelAddMaintenance from '@/components/dialogs/HistoryListPanelAddMaintenance.vue'
import type { GuiMaintenanceStateEntry, HistoryListRowMaintenance } from '@/store/gui/maintenance/types'
import HistoryListEntryMaintenance from '@/components/panels/History/HistoryListEntryMaintenance.vue'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import { useBase } from '@/composables/useBase'
import { useHistory } from '@/composables/useHistory'
import { useHistoryStats } from '@/composables/useHistoryStats'
import { useServerHistoryStore } from '@/store/server/history'
import { useGuiMaintenanceStore } from '@/store/gui/maintenance'
import { useGuiStore } from '@/store/gui'
import { useSocketStore } from '@/store/socket'
import { webSocketClient } from '@/plugins/webSocketClient'

export type HistoryListPanelRow = HistoryListRowJob | HistoryListRowMaintenance

const { t } = useI18n()
const { loadings, browserLocale, formatDateTime } = useBase()
const { jobs, moonrakerHistoryFields } = useHistory()
const { printStatusArray } = useHistoryStats(computed(() => 'jobs' as const))
const historyStore = useServerHistoryStore()
const guiMaintenanceStore = useGuiMaintenanceStore()
const guiStore = useGuiStore()

const search = ref('')

const addMaintenanceDialog = ref(false)
const deleteSelectedDialog = ref(false)

const allLoaded = computed(() => historyStore.all_loaded ?? false)

const maintenanceEntries = computed(() => guiMaintenanceStore.getEntries ?? [])

const showMaintenanceEntries = computed<boolean>({
    get: () => guiStore.view.history.showMaintenanceEntries,
    set: (newVal) => guiStore.saveSetting({ name: 'view.history.showMaintenanceEntries', value: newVal }),
})

const showPrintJobs = computed<boolean>({
    get: () => guiStore.view.history.showPrintJobs,
    set: (newVal) => guiStore.saveSetting({ name: 'view.history.showPrintJobs', value: newVal }),
})

const sortBy = ref('start_time')
const sortDesc = ref(true)

const entries = computed(() => {
    let entries: HistoryListPanelRow[] = []

    if (showPrintJobs.value) {
        entries = [...jobs.value].map((job) => {
            return { ...job, type: 'job' as const, select_id: `job_${job.job_id}` }
        })
    }

    if (sortBy.value !== 'start_time') return entries

    if (showMaintenanceEntries.value) {
        entries = [
            ...entries,
            ...maintenanceEntries.value.map((entry: GuiMaintenanceStateEntry) => {
                return { ...entry, type: 'maintenance' as const, select_id: `maintenance_${entry.id}` }
            }),
        ]
    }

    return entries
})

const hideColums = computed<string[]>({
    get: () => guiStore.view.history.hideColums ?? [],
    set: (newVal) => guiStore.saveSetting({ name: 'view.history.hideColums', value: newVal }),
})

const headers = computed(() => {
    const headers: HistoryListPanelCol[] = [
        {
            text: '',
            value: '',
            align: 'left',
            configable: false,
            visible: true,
            filterable: false,
        },
        {
            text: t('History.Filename'),
            value: 'filename',
            align: 'left',
            configable: false,
            visible: true,
        },
        {
            text: '',
            value: 'status',
            align: 'left',
            configable: false,
            visible: true,
            filterable: false,
        },
        {
            text: t('History.Filesize'),
            value: 'size',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'filesize',
        },
        {
            text: t('History.LastModified'),
            value: 'modified',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'date',
        },
        {
            text: t('History.StartTime'),
            value: 'start_time',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'date',
        },
        {
            text: t('History.EndTime'),
            value: 'end_time',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'date',
        },
        {
            text: t('History.EstimatedTime'),
            value: 'estimated_time',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'time',
        },
        {
            text: t('History.PrintTime'),
            value: 'print_duration',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'time',
        },
        {
            text: t('History.TotalTime'),
            value: 'total_duration',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'time',
        },
        {
            text: t('History.FilamentCalc'),
            value: 'filament_total',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'length',
        },
        {
            text: t('History.FilamentUsed'),
            value: 'filament_used',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'length',
        },
        {
            text: t('History.FirstLayerExtTemp'),
            value: 'first_layer_extr_temp',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'temp',
        },
        {
            text: t('History.FirstLayerBedTemp'),
            value: 'first_layer_bed_temp',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'temp',
        },
        {
            text: t('History.FirstLayerHeight'),
            value: 'first_layer_height',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'length',
        },
        {
            text: t('History.LayerHeight'),
            value: 'layer_height',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'length',
        },
        {
            text: t('History.ObjectHeight'),
            value: 'object_height',
            align: 'left',
            configable: true,
            visible: true,
            outputType: 'length',
        },
        {
            text: t('History.Slicer'),
            value: 'slicer',
            align: 'left',
            configable: true,
            visible: true,
        },
    ]

    moonrakerHistoryFields.value.forEach((sensor) => {
        headers.push({
            text: sensor.desc,
            value: sensor.name,
            align: 'left',
            configable: true,
            visible: false,
        })
    })

    headers.forEach((header) => {
        if (header.visible && hideColums.value.includes(header.value)) {
            header.visible = false
        } else if (!header.visible && !hideColums.value.includes(header.value)) {
            header.visible = true
        }
    })

    return headers
})

const filteredHeaders = computed<HistoryListPanelCol[]>(() => headers.value.filter((header: HistoryListPanelCol) => header.visible))

const tableFields = computed<HistoryListPanelCol[]>(() => filteredHeaders.value.filter((col: HistoryListPanelCol) => !['filename', 'status'].includes(col.value) && col.value !== ''))

const configHeaders = computed<HistoryListPanelCol[]>(() => headers.value.filter((header: HistoryListPanelCol) => header.configable))

const countPerPage = computed<number>({
    get: () => guiStore.view.history.countPerPage ?? 10,
    set: (newVal) => guiStore.saveSetting({ name: 'view.history.countPerPage', value: newVal }),
})

const selectedJobsTable = computed<HistoryListPanelRow[]>({
    get: () => (guiStore.view.history.selectedJobs as unknown as HistoryListPanelRow[]) ?? [],
    set: (newVal) => guiStore.saveSetting({ name: 'view.history.selectedJobs', value: newVal }),
})

function refreshHistory() {
    useSocketStore().addLoading('historyLoadAll')

    webSocketClient.emit('server.history.list', { start: 0, limit: 50 }, { action: 'server/history/getHistory' })
}

function sortableValue(item: HistoryListPanelRow, columnKey: string): string {
    const raw = (item as unknown as Record<string, unknown>)[columnKey]

    if (raw === null || raw === undefined) return ''
    if (typeof raw === 'number') return String(raw).padStart(20, '0')
    if (Array.isArray(raw)) {
        const sum = raw.reduce((acc: number, cur: unknown) => acc + (typeof cur === 'number' ? cur : 0), 0)
        return String(sum).padStart(20, '0')
    }

    return String(raw).toLowerCase()
}

const vuetifyHeaders = computed(() =>
    filteredHeaders.value.map((header) => ({
        title: header.text,
        key: header.value,
        align: header.align === 'left' ? ('start' as const) : undefined,
        sortable: header.filterable !== false,
        value: (item: HistoryListPanelRow) => sortableValue(item, header.value),
    }))
)

const vuetifySortBy = computed<DataTableSortItem[]>({
    get: () => [{ key: sortBy.value, order: sortDesc.value ? ('desc' as const) : ('asc' as const) }],
    set: (newVal: DataTableSortItem[]) => {
        if (!newVal.length) return

        sortBy.value = newVal[0].key
        sortDesc.value = newVal[0].order === 'desc'
    },
})

function advancedSearch(value: unknown, search: string | null) {
    return value != null && search != null && value.toString().toLowerCase().indexOf(search.toLowerCase()) !== -1
}

function changeColumnVisible(name: string) {
    const matching = headers.value.filter((header) => header.value === name)
    if (matching.length) {
        const value = matching[0].visible

        guiStore.setHistoryColumns({ name: name, value: value })
    }
}

function changeStatusVisible(status: ServerHistoryStateAllPrintStatusEntry) {
    guiStore.toggleStatusInHistoryList(status.name)
}

function exportHistory() {
    const checkString = parseFloat('1.23').toLocaleString(browserLocale.value)
    const decimalSeparator = checkString.indexOf(',') >= 0 ? ',' : '.'
    const csvSeperator = decimalSeparator === ',' ? ';' : ','

    const content: string[][] = []
    const row: string[] = []

    row.push('filename')
    row.push('type')
    row.push('status')

    tableFields.value.forEach((col) => {
        if (col.value.startsWith('history_field_')) {
            const sensorName = col.value.replace('history_field_', '')
            row.push(sensorName)
            return
        }

        row.push(col.value)
    })

    content.push(row)

    let jobsToExport = [...entries.value]
    if (selectedJobsTable.value.length) {
        jobsToExport = [...selectedJobsTable.value]
    }

    if (jobsToExport.length) {
        jobsToExport
            .sort((a, b) => {
                return b.start_time - a.start_time
            })
            .forEach((entry: HistoryListPanelRow) => {
                const row: string[] = []
                const type = entry.type ?? 'job'

                if (type === 'maintenance') {
                    const maintenance = entry as HistoryListRowMaintenance
                    row.push(maintenance.name)
                    row.push('maintenance')
                    row.push(maintenance.end_time !== null ? 'performed' : 'open') // status

                    tableFields.value
                        .filter((header) => header.value !== 'slicer')
                        .forEach((header) => {
                            if (header.value === 'start_time') {
                                row.push(formatDateTime(maintenance.start_time * 1000))
                                return
                            }

                            if (header.value === 'end_time' && maintenance.end_time !== null) {
                                row.push(formatDateTime(maintenance.end_time * 1000))
                                return
                            }

                            if (header.value === 'print_duration' && maintenance.end_printtime !== null) {
                                const value = maintenance.end_printtime - maintenance.start_printtime
                                row.push(value.toLocaleString(browserLocale.value, { useGrouping: false }))
                                return
                            }

                            if (header.value === 'filament_used' && maintenance.end_filament !== null) {
                                const value = maintenance.end_filament - maintenance.start_filament
                                row.push(value.toLocaleString(browserLocale.value, { useGrouping: false }))
                                return
                            }

                            row.push('')
                        })

                    if (tableFields.value.find((header) => header.value === 'slicer')?.visible) {
                        row.push('')
                    }

                    content.push(row)
                    return
                }

                const job = entry as ServerHistoryStateJob
                let filename = job.filename
                if (filename.includes(csvSeperator)) filename = '"' + filename + '"'
                row.push(filename)
                row.push('job')
                row.push(job.status)

                tableFields.value.forEach((col) => {
                    row.push(outputValue(col, job, csvSeperator))
                })

                content.push(row)
            })
    }

    // escape fields with the csvSeperator in the content
    // prettier-ignore
    const csvContent =
        'data:text/csv;charset=utf-8,' +
        content.map((entry) =>
            entry.map((field) => (field?.indexOf(csvSeperator) === -1 ? field : `"${field}"`)).join(csvSeperator)
        ).join('\n')

    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', 'print_history.csv')
    document.body.appendChild(link)

    link.click()
    link.remove()
}

function outputValue(col: HistoryListPanelCol, job: ServerHistoryStateJob, csvSeperator: string | null = null) {
    const key = col.value
    let value: string | number | null = null
    if (key in job) {
        const raw = job[key as keyof ServerHistoryStateJob]
        if (typeof raw === 'string' || typeof raw === 'number') value = raw
    } else if (key in job.metadata) {
        const raw = job.metadata[key as keyof typeof job.metadata]
        if (typeof raw === 'string' || typeof raw === 'number') value = raw
    }
    if (key === 'slicer' && 'slicer_version' in job.metadata) value += ` ${job.metadata.slicer_version}`

    if (key.startsWith('history_field_')) {
        const sensorName = key.replace('history_field_', '')
        const sensor = job.auxiliary_data?.find((sensor) => sensor.name === sensorName)

        value = sensor?.value?.toString() ?? null
        if (sensor && !Array.isArray(sensor.value)) {
            value = sensor.value?.toLocaleString(browserLocale.value, { useGrouping: false }) ?? 0
        }
    }

    if (value === null) return '--'

    if (typeof value === 'string') {
        if (csvSeperator !== null && value?.includes(csvSeperator)) value = `"${value}"`

        return value
    }

    switch (col.outputType) {
        case 'date':
            return formatDateTime(value * 1000)

        case 'time':
            return value?.toFixed() ?? ''

        default:
            return value?.toLocaleString(browserLocale.value, { useGrouping: false }) ?? 0
    }
}

const deleteSelectedQuestion = computed<string>(() => {
    if (selectedJobsTable.value.length === 1) return t('History.DeleteSingleJobQuestion')

    return t('History.DeleteSelectedQuestion', { count: selectedJobsTable.value.length })
})

function deleteSelectedJobs() {
    selectedJobsTable.value.forEach((item: HistoryListPanelRow) => {
        if (item.type === 'maintenance') {
            guiMaintenanceStore.delete(item.id as string)
            return
        }

        if (!('job_id' in item)) return

        webSocketClient.emit('server.history.delete_job', { uid: item.job_id }, { action: 'server/history/getDeletedJobs' })
    })

    selectedJobsTable.value = []
}
</script>

<style scoped>
.history-jobs-table :deep(th) {
    white-space: nowrap;
}

.history-jobs-table :deep(th.text-start) {
    padding-right: 0 !important;
}
</style>
