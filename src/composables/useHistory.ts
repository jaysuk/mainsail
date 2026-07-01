import { computed } from 'vue'
import { useGuiStore } from '@/store/gui'
import { useServerStore } from '@/store/server'
import { useServerHistoryStore } from '@/store/server/history'
import type { ServerHistoryStateJob } from '@/store/server/history/types'
import type { HistoryListRowJob } from '@/store/server/history/types'
import type { HistoryListRowMaintenance } from '@/store/gui/maintenance/types'

type HistoryListPanelRow = HistoryListRowJob | HistoryListRowMaintenance

/** Replaces the Vue 2 `HistoryMixin` class component. */
export function useHistory() {
    const guiStore = useGuiStore()
    const serverStore = useServerStore()
    const historyStore = useServerHistoryStore()

    const hidePrintStatus = computed<string[]>(() => guiStore.view.history.hidePrintStatus ?? [])
    const allJobs = computed<ServerHistoryStateJob[]>(() => historyStore.jobs ?? [])

    const jobs = computed(() => allJobs.value.filter((job) => !hidePrintStatus.value.includes(job.status)))

    const selectedJobs = computed<ServerHistoryStateJob[]>(() => {
        const entries = (guiStore.view.history.selectedJobs ?? []) as unknown as HistoryListPanelRow[]
        return entries.filter((entry) => entry.type === 'job') as unknown as ServerHistoryStateJob[]
    })

    const moonrakerHistoryFields = computed(() => {
        const config = (serverStore.config?.config ?? {}) as unknown as Record<
            string,
            Record<string, { desc: string; units: string; parameter: string }>
        >
        const historyFields: { desc: string; unit: string; provider: string; name: string; parameter: string }[] = []

        const sensors = Object.keys(config).filter((key) => key.startsWith('sensor '))

        sensors.forEach((configName) => {
            const sensor = config[configName] ?? {}

            Object.keys(sensor)
                .filter((key) => key.startsWith('history_field_'))
                .forEach((key) => {
                    const historyField = sensor[key]

                    historyFields.push({
                        desc: historyField.desc,
                        unit: historyField.units,
                        provider: configName,
                        parameter: historyField.parameter,
                        name: key,
                    })
                })
        })

        return historyFields
    })

    return { hidePrintStatus, allJobs, jobs, selectedJobs, moonrakerHistoryFields }
}
