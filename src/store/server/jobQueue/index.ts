import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type { ServerJobQueueState, ServerJobQueueStateJob } from '@/store/server/jobQueue/types'
import { resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'
import { useFilesStore } from '@/store/files'

export const getDefaultState = (): ServerJobQueueState => ({
    queued_jobs: [],
    queue_state: '',
})

export const useServerJobQueueStore = defineStore('serverJobQueue', () => {
    const state = reactive<ServerJobQueueState>(getDefaultState())

    const getJobs = computed<ServerJobQueueStateJob[]>(() => {
        const filesStore = useFilesStore()
        const jobs: ServerJobQueueStateJob[] = []

        state.queued_jobs.forEach((queuedJob) => {
            const job = { ...queuedJob }

            if (jobs.length && jobs[jobs.length - 1].filename === job.filename) {
                jobs[jobs.length - 1].combinedIds?.push(job.job_id)
                return
            }

            const file = filesStore.getFile('gcodes/' + job.filename)
            if (!file?.metadataPulled)
                webSocketClient.emit(
                    'server.files.metadata',
                    { filename: job.filename },
                    { action: 'files/getMetadata' }
                )
            job.metadata = file
            job.combinedIds = []

            jobs.push(job)
        })

        return jobs
    })

    const getJobsCount = computed(() => state.queued_jobs.length)

    const reset = () => resetState(state, getDefaultState)

    const init = () => {
        webSocketClient.emit('server.job_queue.status', {}, { action: 'server/jobQueue/getStatus' })
    }

    const getEvent = (payload: { updated_queue?: ServerJobQueueStateJob[] | null; queue_state?: string }) => {
        if ('updated_queue' in payload && payload.updated_queue !== null && payload.updated_queue)
            state.queued_jobs = payload.updated_queue
        if ('queue_state' in payload && payload.queue_state !== undefined) state.queue_state = payload.queue_state
    }

    const getStatus = (payload: { queued_jobs?: ServerJobQueueStateJob[]; queue_state?: string }) => {
        if (payload.queued_jobs) state.queued_jobs = payload.queued_jobs
        if (payload.queue_state !== undefined) state.queue_state = payload.queue_state

        useSocketStore().removeInitModule('server/jobQueue/init')
    }

    const addToQueue = (filenames: string[]) => {
        webSocketClient.emit('server.job_queue.post_job', { filenames })
    }

    const sendNewQueueList = (payload: { jobs: ServerJobQueueStateJob[]; printStart?: boolean }) => {
        const filenames = payload.jobs
            .map((job) => {
                const numJobs = (job.combinedIds?.length ?? 0) + 1
                if (numJobs === 1) return job.filename
                return Array(numJobs).fill(job.filename)
            })
            .flat()

        const emitOptions: { action?: string } = {}
        if (payload.printStart) emitOptions.action = 'server/jobQueue/start'

        webSocketClient.emit('server.job_queue.post_job', { filenames, reset: true }, emitOptions)
    }

    const changeCount = (payload: { job_id: string; count: number }) => {
        const jobs = [...getJobs.value]
        const index = jobs.findIndex((job) => job.job_id === payload.job_id)
        if (index === -1) return

        jobs[index].combinedIds = Array(payload.count - 1).fill(payload.job_id)
        sendNewQueueList({ jobs })
    }

    const changePosition = (payload: { oldIndex: number; newIndex: number }) => {
        const jobs = [...getJobs.value]
        const job = jobs.splice(payload.oldIndex, 1)[0]
        jobs.splice(payload.newIndex, 0, job)

        sendNewQueueList({ jobs })
    }

    const startByJobId = (job_id: string) => {
        const jobs = [...getJobs.value]
        const index = jobs.findIndex((job) => job.job_id === job_id)
        if (index === -1) return

        const job = jobs.splice(index, 1)[0]
        jobs.splice(0, 0, job)

        sendNewQueueList({ jobs, printStart: true })
    }

    const deleteFromQueue = (job_ids: string[]) => {
        webSocketClient.emit('server.job_queue.delete_job', { job_ids })
    }

    const clearQueue = () => {
        webSocketClient.emit('server.job_queue.delete_job', { all: true })
    }

    const start = () => {
        webSocketClient.emit('server.job_queue.start', {}, { loading: 'startJobqueue' })
    }

    const pause = () => {
        webSocketClient.emit('server.job_queue.pause', {}, { loading: 'pauseJobqueue' })
    }

    return {
        ...toRefs(state),
        getJobs,
        getJobsCount,
        reset,
        init,
        getEvent,
        getStatus,
        addToQueue,
        sendNewQueueList,
        changeCount,
        changePosition,
        startByJobId,
        deleteFromQueue,
        clearQueue,
        start,
        pause,
    }
})
