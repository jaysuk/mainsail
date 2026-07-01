import { computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HistoryStatsValueNames, ServerHistoryStateAllPrintStatusEntry, ServerHistoryStateJob } from '@/store/server/history/types'
import { useHistory } from '@/composables/useHistory'

/**
 * Replaces the Vue 2 `HistoryStatsMixin` class component. `valueName` was a
 * bare class field (no `@Prop()`) set by whatever concrete component
 * ultimately extended this mixin chain; it's now an explicit parameter.
 */
export function useHistoryStats(valueName: Ref<HistoryStatsValueNames>) {
    const { t, te } = useI18n()
    const { hidePrintStatus, allJobs, jobs, selectedJobs } = useHistory()

    const getStatusColor = (status: string) => {
        const colorMap: Record<string, string> = {
            completed: '#BDBDBD',
            in_progress: '#EEEEEE',
            cancelled: '#616161',
            default: '#424242',
        }

        return colorMap[status] ?? colorMap.default
    }

    const getLocalizedStatusName = (status: string) => (te(`History.StatusValues.${status}`) ? t(`History.StatusValues.${status}`) : status)

    const groupSmallEntries = (entries: ServerHistoryStateAllPrintStatusEntry[], threshold: number): ServerHistoryStateAllPrintStatusEntry[] => {
        const totalCount = entries.reduce((acc, cur) => acc + cur.value, 0)
        const otherLimit = totalCount * threshold
        const others = entries.filter((entry) => entry.value < otherLimit)

        if (others.length < 2) return entries

        const value = others.reduce((acc, cur) => acc + cur.value, 0)
        const remaining = entries.filter((entry) => entry.value >= otherLimit)
        const displayName = t(`History.StatusValues.Others`) + ` (${others.length})`

        remaining.push({
            name: displayName,
            displayName,
            value,
            showInTable: true,
            itemStyle: {
                opacity: 0.9,
                color: '#616161',
                borderColor: '#1E1E1E',
                borderWidth: 2,
                borderRadius: 3,
            },
        })

        return remaining
    }

    const allPrintStati = computed(() => {
        const array = allJobs.value.map((job: ServerHistoryStateJob) => job.status)
        return array.filter((item, index) => array.indexOf(item) === index)
    })

    const printStatusArray = computed<ServerHistoryStateAllPrintStatusEntry[]>(() =>
        allPrintStati.value.map((status: string) => {
            const filterdJobs = allJobs.value.filter((job) => job.status === status)

            return {
                name: status,
                displayName: getLocalizedStatusName(status),
                showInTable: !hidePrintStatus.value.includes(status),
                value: filterdJobs.length,
                itemStyle: {
                    opacity: 0.9,
                    color: getStatusColor(status),
                    borderColor: '#1E1E1E',
                    borderWidth: 2,
                    borderRadius: 3,
                },
            }
        })
    )

    const printStatusArrayChart = computed(() => {
        if (valueName.value === 'filament') {
            const jobsToUse = selectedJobs.value.length ? selectedJobs.value : jobs.value

            return printStatusArray.value
                .map((entry) => {
                    const value = jobsToUse.reduce(
                        (acc: number, cur: ServerHistoryStateJob) => (cur.status === entry.name ? acc + cur.filament_used : acc),
                        0
                    )

                    return { ...entry, value }
                })
                .filter((entry) => entry.value > 0)
        }

        if (valueName.value === 'time') {
            const jobsToUse = selectedJobs.value.length ? selectedJobs.value : jobs.value

            return printStatusArray.value
                .map((entry) => {
                    const value = jobsToUse.reduce(
                        (acc: number, cur: ServerHistoryStateJob) => (cur.status === entry.name ? acc + cur.total_duration : acc),
                        0
                    )

                    return { ...entry, value }
                })
                .filter((entry) => entry.value > 0)
        }

        return printStatusArray.value
    })

    const groupedPrintStatusArray = computed(() => groupSmallEntries(printStatusArrayChart.value, 0.05))

    return {
        allPrintStati,
        printStatusArray,
        printStatusArrayChart,
        groupedPrintStatusArray,
    }
}
