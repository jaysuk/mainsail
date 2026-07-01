<template>
    <panel :icon="mdiChartAreaspline" :title="t('History.Statistics')" card-class="history-statistics-panel" :collapsible="true">
        <v-card-text class="pa-0">
            <v-row align="center">
                <v-col class="col-12 col-sm-6 col-md-4">
                    <v-table>
                        <tbody>
                            <tr v-for="total in totals" :key="total.title">
                                <td>{{ total.title }}</td>
                                <td class="text-right">{{ total.value }}</td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-col>
                <v-col class="col-12 col-sm-6 col-md-4">
                    <history-all-print-status-chart v-if="togglePrintStatus === 'chart'" :value-name="toggleValue" />
                    <history-all-print-status-table v-else :value-name="toggleValue" />
                    <div class="text-center mb-3">
                        <v-btn-toggle v-model="togglePrintStatus" density="compact" mandatory>
                            <v-btn size="small" value="chart">{{ t('History.Chart') }}</v-btn>
                            <v-btn size="small" value="table">{{ t('History.Table') }}</v-btn>
                        </v-btn-toggle>
                        <v-tooltip v-if="!allLoaded" location="top">
                            <template #activator="{ props: activatorProps }">
                                <v-btn variant="outlined" size="small" :loading="loadings.includes('historyLoadAll')" class="ml-3 minwidth-0 px-2" color="primary" v-bind="activatorProps" @click="refreshHistory">
                                    <v-icon size="small">{{ mdiDatabaseArrowDownOutline }}</v-icon>
                                </v-btn>
                            </template>
                            <span>{{ t('History.LoadCompleteHistory') }}</span>
                        </v-tooltip>
                    </div>
                    <div class="text-center mb-3">
                        <v-btn-toggle v-model="toggleValue" density="compact" mandatory>
                            <v-btn v-for="option in toggleValueOptions" :key="option.value" size="small" :value="option.value">
                                {{ option.text }}
                            </v-btn>
                        </v-btn-toggle>
                    </div>
                </v-col>
                <v-col class="col-12 col-sm-12 col-md-4">
                    <history-filament-usage v-if="toggleChart === 'filament_usage'" />
                    <history-printtime-avg v-else-if="toggleChart === 'printtime_avg'" />
                    <div class="text-center mt-3">
                        <v-btn-toggle v-model="toggleChart" density="compact" mandatory>
                            <v-btn size="small" value="filament_usage">{{ t('History.FilamentUsage') }}</v-btn>
                            <v-btn size="small" value="printtime_avg">{{ t('History.PrinttimeAvg') }}</v-btn>
                        </v-btn-toggle>
                    </div>
                </v-col>
            </v-row>
        </v-card-text>
    </panel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import HistoryFilamentUsage from '@/components/charts/HistoryFilamentUsage.vue'
import HistoryPrinttimeAvg from '@/components/charts/HistoryPrinttimeAvg.vue'
import HistoryAllPrintStatusChart from '@/components/charts/HistoryAllPrintStatusChart.vue'
import HistoryAllPrintStatusTable from '@/components/charts/HistoryAllPrintStatusTable.vue'
import type { HistoryStatsValueNames, ServerHistoryStateJob, ServerHistoryStateJobAuxiliaryTotal } from '@/store/server/history/types'
import { mdiChartAreaspline, mdiDatabaseArrowDownOutline } from '@mdi/js'
import { formatPrintTime } from '@/plugins/helpers'
import { useBase } from '@/composables/useBase'
import { useHistory } from '@/composables/useHistory'
import { useServerHistoryStore } from '@/store/server/history'
import { useGuiStore } from '@/store/gui'
import { useSocketStore } from '@/store/socket'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { loadings } = useBase()
const { selectedJobs, moonrakerHistoryFields } = useHistory()
const historyStore = useServerHistoryStore()
const guiStore = useGuiStore()

const toggleValue = ref<HistoryStatsValueNames>('jobs')

const toggleValueOptions = computed(() => [
    { text: t('History.Jobs'), value: 'jobs' as HistoryStatsValueNames },
    { text: t('History.Filament'), value: 'filament' as HistoryStatsValueNames },
    { text: t('History.Time'), value: 'time' as HistoryStatsValueNames },
])

const existsSelectedJobs = computed(() => selectedJobs.value.length > 0)

const totalPrintTime = computed(() => historyStore.job_totals?.total_print_time ?? 0)

const selectedPrintTime = computed(() => {
    let printtime = 0

    selectedJobs.value.forEach((job: ServerHistoryStateJob) => {
        printtime += job.print_duration
    })

    return printtime
})

const longestPrintTime = computed(() => historyStore.job_totals?.longest_print ?? 0)

const selectedLongestPrintTime = computed(() => {
    let printtime = 0

    selectedJobs.value.forEach((job: ServerHistoryStateJob) => {
        if (job.print_duration > printtime) printtime = job.print_duration
    })

    return printtime
})

const totalJobsCount = computed(() => historyStore.job_totals?.total_jobs ?? 0)

const avgPrintTime = computed(() => {
    if (totalJobsCount.value > 0 && totalPrintTime.value > 0) return Math.round(totalPrintTime.value / totalJobsCount.value)

    return 0
})

const selectedAvgPrintTime = computed(() => {
    if (selectedJobs.value.length > 0 && selectedPrintTime.value > 0) return Math.round(selectedPrintTime.value / selectedJobs.value.length)

    return 0
})

const totalFilamentUsed = computed(() => historyStore.job_totals?.total_filament_used ?? 0)

const totalFilamentUsedFormat = computed(() => {
    const value = Math.round(totalFilamentUsed.value / 100) / 10

    return `${value} m`
})

const selectedFilamentUsed = computed(() => {
    let filamentUsed = 0

    selectedJobs.value.forEach((job: ServerHistoryStateJob) => {
        filamentUsed += job.filament_used
    })

    return filamentUsed
})

const selectedFilamentUsedFormat = computed(() => {
    const value = Math.round(selectedFilamentUsed.value / 100) / 10

    return `${value} m`
})

const toggleChart = computed<string>({
    get: () => guiStore.view.history.toggleChartCol3,
    set: (newVal) => guiStore.saveSetting({ name: 'view.history.toggleChartCol3', value: newVal }),
})

const togglePrintStatus = computed<'chart' | 'table'>({
    get: () => guiStore.view.history.toggleChartCol2,
    set: (newVal) => guiStore.saveSetting({ name: 'view.history.toggleChartCol2', value: newVal }),
})

const allLoaded = computed(() => historyStore.all_loaded ?? false)

const auxiliarySelectedTotals = computed(() => {
    const output: { title: string; value: string }[] = []
    moonrakerHistoryFields.value.forEach((historyField) => {
        const value = selectedJobs.value.reduce((acc: number, job: ServerHistoryStateJob) => {
            const historyFieldName = historyField.name.replace('history_field_', '')
            const auxiliary_data = job.auxiliary_data?.find((auxiliary) => auxiliary.provider === historyField.provider && auxiliary.name === historyFieldName)

            if (!auxiliary_data || typeof auxiliary_data.value !== 'number') return acc

            return acc + auxiliary_data.value
        }, 0)

        output.push({
            title: historyField.desc,
            value: `${Math.round(value * 1000) / 1000} ${historyField.unit}`,
        })
    })

    return output
})

const selectedTotals = computed(() => {
    const output: { title: string; value: string }[] = [
        {
            title: t('History.SelectedPrinttime'),
            value: formatPrintTime(selectedPrintTime.value, false),
        },
        {
            title: t('History.LongestPrinttime'),
            value: formatPrintTime(selectedLongestPrintTime.value, false),
        },
        {
            title: t('History.AvgPrinttime'),
            value: formatPrintTime(selectedAvgPrintTime.value, false),
        },
        {
            title: t('History.SelectedFilamentUsed'),
            value: selectedFilamentUsedFormat.value,
        },
        {
            title: t('History.SelectedJobs'),
            value: selectedJobs.value.length.toString(),
        },
    ]

    output.push(...auxiliarySelectedTotals.value)

    return output
})

const auxiliaryTotals = computed(() => {
    const auxiliaries = historyStore.auxiliary_totals ?? []
    const output: { title: string; value: string }[] = []

    auxiliaries.forEach((auxiliary: ServerHistoryStateJobAuxiliaryTotal) => {
        const historyFieldName = `history_field_${auxiliary.field}`
        const historyField = moonrakerHistoryFields.value.find((historyField) => historyField.provider === auxiliary.provider && historyField.name === historyFieldName)
        const value = Math.round((auxiliary.total ?? 0) * 1000) / 1000

        output.push({
            title: historyField?.desc ?? auxiliary.field,
            value: `${value} ${historyField?.unit}`,
        })
    })

    return output
})

const genericTotals = computed(() => {
    const output: { title: string; value: string }[] = [
        {
            title: t('History.TotalPrinttime'),
            value: formatPrintTime(totalPrintTime.value, false),
        },
        {
            title: t('History.LongestPrinttime'),
            value: formatPrintTime(longestPrintTime.value, false),
        },
        {
            title: t('History.AvgPrinttime'),
            value: formatPrintTime(avgPrintTime.value, false),
        },
        {
            title: t('History.TotalFilamentUsed'),
            value: totalFilamentUsedFormat.value,
        },
        {
            title: t('History.TotalJobs'),
            value: totalJobsCount.value.toString(),
        },
    ]

    output.push(...auxiliaryTotals.value)

    return output
})

const totals = computed(() => (existsSelectedJobs.value ? selectedTotals.value : genericTotals.value))

function refreshHistory() {
    useSocketStore().addLoading('historyLoadAll')

    webSocketClient.emit('server.history.list', { start: 0, limit: 50 }, { action: 'server/history/getHistory' })
}
</script>
