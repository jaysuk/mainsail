<template>
    <panel :icon="mdiTrayFull" :title="t('JobQueue.JobQueue')" card-class="jobqueue-panel">
        <template #buttons>
            <v-btn v-if="queueState === 'paused'" color="success" :loading="loadings.includes('startJobqueue')" icon="" variant="text" :disabled="!klipperReadyForGui" @click="startJobqueue">
                <v-tooltip location="top">
                    <template #activator="{ props: activatorProps }">
                        <v-icon v-bind="activatorProps">{{ mdiPlay }}</v-icon>
                    </template>
                    <span>{{ t('JobQueue.Start') }}</span>
                </v-tooltip>
            </v-btn>
            <v-btn v-if="['ready', 'loading'].includes(queueState)" color="warning" :loading="loadings.includes('pauseJobqueue')" icon="" variant="text" @click="pauseJobqueue">
                <v-tooltip location="top">
                    <template #activator="{ props: activatorProps }">
                        <v-icon v-bind="activatorProps">{{ mdiPause }}</v-icon>
                    </template>
                    <span>{{ t('JobQueue.Pause') }}</span>
                </v-tooltip>
            </v-btn>
        </template>
        <v-row v-if="jobs.length" class="mx-0 mt-0">
            <v-col>
                <draggable v-model="joblist" handle=".handle" class="jobqueue-list mb-3" ghost-class="ghost" group="jobs" :force-fallback="true" @end="updateOrder">
                    <template #item="{ element: job }">
                        <jobqueue-entry :key="job.job_id" :job="job" :show-handle="true" />
                    </template>
                </draggable>
                <jobqueue-entry-sum :jobs="jobs" />
            </v-col>
        </v-row>
        <v-card-text v-else>
            <p>{{ t('JobQueue.Empty') }}</p>
        </v-card-text>
    </panel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiPlay, mdiPause, mdiTrayFull } from '@mdi/js'
import JobqueueEntry from '@/components/panels/Status/JobqueueEntry.vue'
import draggable from 'vuedraggable'
import JobqueueEntrySum from '@/components/panels/Status/JobqueueEntrySum.vue'
import type { DraggableEndEvent } from '@/types/vuedraggable'
import { useBase } from '@/composables/useBase'
import { useServerJobQueueStore } from '@/store/server/jobQueue'

const { t } = useI18n()
const { loadings, klipperReadyForGui } = useBase()
const jobQueueStore = useServerJobQueueStore()

const joblist = ref([])

const jobs = computed(() => jobQueueStore.getJobs)

const queueState = computed(() => jobQueueStore.queue_state ?? '')

function startJobqueue() {
    jobQueueStore.start()
}

function pauseJobqueue() {
    jobQueueStore.pause()
}

function updateOrder(event: DraggableEndEvent) {
    jobQueueStore.changePosition({
        newIndex: event.newIndex,
        oldIndex: event.oldIndex,
    })
}
</script>

<style>
.jobqueue-list > .jobqueue-list-entry + .jobqueue-list-entry {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.jobqueue-list > div.ghost {
    background-color: rgba(255, 255, 255, 0.12);
}

.theme--light .jobqueue-list > .jobqueue-list-entry + .jobqueue-list-entry {
    border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
