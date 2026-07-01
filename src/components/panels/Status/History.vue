<template>
    <v-card class="history" flat>
        <template v-if="jobsCombined.length">
            <v-row class="mx-0 mt-0 pb-3">
                <v-col class="history-list">
                    <status-panel-history-entry v-for="job in jobsCombined" :key="job.job_id" :job="job" />
                </v-col>
            </v-row>
        </template>
        <div v-else>
            <p class="body-2 my-3 text-center text-disabled">{{ t('Panels.StatusPanel.EmptyHistory') }}</p>
        </div>
    </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StatusPanelHistoryEntry from '@/components/panels/Status/HistoryEntry.vue'
import type { ServerHistoryStateJob, ServerHistoryStateJobWithCount } from '@/store/server/history/types'
import { useServerHistoryStore } from '@/store/server/history'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const historyStore = useServerHistoryStore()
const guiStore = useGuiStore()

const jobs = computed<ServerHistoryStateJob[]>(() => historyStore.jobs ?? [])

const maxLength = computed(() => guiStore.uiSettings.dashboardHistoryLimit ?? 5)

const jobsCombined = computed(() => {
    const jobs_: ServerHistoryStateJobWithCount[] = []

    for (const job of jobs.value) {
        if (jobs_.length === 0) {
            jobs_.push({ ...job, count: 1 })
            continue
        }

        const lastJob = jobs_[jobs_.length - 1]
        const lastJobUuid = lastJob.metadata.uuid ?? null
        const jobUuid = job.metadata.uuid ?? null
        if (lastJobUuid === jobUuid && lastJob.status === job.status) {
            lastJob.filament_used += job.filament_used
            lastJob.print_duration += job.print_duration
            lastJob.total_duration += job.total_duration
            lastJob.count += 1
            continue
        }

        if (jobs_.length >= maxLength.value) break

        jobs_.push({ ...job, count: 1 })
    }

    return jobs_
})
</script>

<style scoped>
.history-list .history-list-entry + .history-list-entry {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.theme--light .history-list > .history-list-entry + .history-list-entry {
    border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
