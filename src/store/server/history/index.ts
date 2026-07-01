import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type { ServerHistoryState, ServerHistoryStateJob } from '@/store/server/history/types'
import { resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'
import { useServerStore } from '@/store/server'
import { useGuiStore } from '@/store/gui'

export const getDefaultState = (): ServerHistoryState => ({
    jobs: [],
    job_totals: {
        total_jobs: 0,
        total_time: 0,
        total_print_time: 0,
        total_filament_used: 0,
        longest_job: 0,
        longest_print: 0,
    },
    auxiliary_totals: [],
    all_loaded: false,
})

export const useServerHistoryStore = defineStore('serverHistory', () => {
    const state = reactive<ServerHistoryState>(getDefaultState())

    // --- getters ---
    const getTotalPrintTime = computed(() => state.jobs.reduce((sum, job) => sum + job.print_duration, 0))

    const getTotalCompletedPrintTime = computed(() =>
        state.jobs.reduce((sum, job) => (job.status === 'completed' ? sum + job.print_duration : sum), 0)
    )

    const getLongestPrintTime = computed(() =>
        state.jobs.reduce((max, job) => (job.print_duration > max ? job.print_duration : max), 0)
    )

    const getTotalFilamentUsed = computed(() => state.jobs.reduce((sum, job) => sum + job.filament_used, 0))

    const getTotalJobsCount = computed(() => state.jobs.length)

    const getTotalCompletedJobsCount = computed(() => state.jobs.filter((job) => job.status === 'completed').length)

    const getAvgPrintTime = computed(() => {
        const totalCompletedPrintTime = getTotalCompletedPrintTime.value
        const totalCompletedJobsCount = getTotalCompletedJobsCount.value

        return totalCompletedPrintTime > 0 && totalCompletedJobsCount > 0
            ? Math.round(totalCompletedPrintTime / totalCompletedJobsCount)
            : 0
    })

    const getPrintStatus = (jobId: string) => {
        if (!state.jobs.length) return ''
        return state.jobs.find((job) => job.job_id === jobId)?.status ?? ''
    }

    const getPrintJobById = (job_id: string) => {
        if (state.jobs.length === 0) return
        return state.jobs.find((job) => job.job_id === job_id)
    }

    const getPrintJobsForGcodes = (
        filename: string,
        modified: number,
        filesize: number,
        uuid: string | null,
        job_id: string | null
    ): ServerHistoryStateJob[] => {
        if (state.jobs.length === 0) return []

        if (uuid) return state.jobs.filter((job) => job.metadata?.uuid === uuid)

        const jobs = state.jobs.filter((job) => {
            return job.metadata?.size === filesize && Math.round((job.metadata?.modified ?? 0) * 1000) === modified
        })
        if (jobs.length) return jobs
        if (job_id) return jobs.filter((job) => job.job_id === job_id)

        return []
    }

    const getPrintStatusByFilename = (filename: string, modified: number) => {
        if (!state.jobs.length) return ''

        const job = state.jobs.find((job) => {
            return job.filename === filename && Math.round((job.metadata?.modified ?? 0) * 1000) === modified
        })

        return job?.status ?? ''
    }

    const getFilteredJobList = computed(() => {
        const hideStatus = useGuiStore().view?.history?.hidePrintStatus ?? []
        return state.jobs.filter((job: ServerHistoryStateJob) => !hideStatus.includes(job.status))
    })

    // --- actions ---
    const reset = () => resetState(state, getDefaultState)

    const init = () => {
        webSocketClient.emit(
            'server.history.list',
            { start: 0, limit: 50, max: 100 },
            { action: 'server/history/getHistory' }
        )
        webSocketClient.emit('server.history.totals', {}, { action: 'server/history/getTotals' })
    }

    const getTotals = (payload: {
        job_totals: ServerHistoryState['job_totals']
        auxiliary_totals?: ServerHistoryState['auxiliary_totals']
    }) => {
        state.job_totals = payload.job_totals
        if (payload.auxiliary_totals?.length) state.auxiliary_totals = payload.auxiliary_totals
    }

    const loadHistoryNotes = () => {
        if (useServerStore().dbNamespaces.includes('history_notes')) {
            webSocketClient.emit(
                'server.database.get_item',
                { namespace: 'history_notes' },
                { action: 'server/history/initHistoryNotes' }
            )
        } else {
            useSocketStore().removeInitModule('server/history/init')
        }
    }

    const getHistory = (payload: {
        requestParams?: { start?: number; limit?: number; max?: number | null }
        jobs?: ServerHistoryStateJob[]
    }) => {
        if ('requestParams' in payload && (payload.requestParams?.start ?? 0) === 0) state.jobs = []

        payload.jobs?.forEach((job) => {
            if (state.jobs.findIndex((stateJob) => stateJob.job_id === job.job_id) === -1) state.jobs.push(job)
        })

        const start = payload.requestParams?.start ?? 0
        const limit = payload.requestParams?.limit ?? 50
        const max = payload.requestParams?.max ?? null

        if (limit > 0 && (max === null || max > start + limit) && payload.jobs?.length === limit) {
            webSocketClient.emit(
                'server.history.list',
                { start: start + limit, limit, max },
                { action: 'server/history/getHistory' }
            )
            return
        }

        if ((payload.jobs?.length ?? 0) < limit) {
            useSocketStore().removeLoading('historyLoadAll')
            state.all_loaded = true
        }

        loadHistoryNotes()
    }

    const initHistoryNotes = (payload: { value: Record<string, { text: string }> }) => {
        const job_ids = Object.keys(payload.value)

        for (const job_id of job_ids) {
            const noteObject = payload.value[job_id]
            const job = state.jobs.find((job) => job.job_id === job_id)
            if (job) job.note = noteObject.text
        }

        useSocketStore().removeInitModule('server/history/init')
    }

    const getChanged = (payload: { action: string; job: ServerHistoryStateJob }) => {
        if (payload.action === 'added') state.jobs.push(payload.job)
        else if (payload.action === 'finished') {
            const index = state.jobs.findIndex((job) => job.job_id === payload.job.job_id)
            if (index !== -1) state.jobs[index] = payload.job
        }

        webSocketClient.emit('server.history.totals', {}, { action: 'server/history/getTotals' })
    }

    const getDeletedJobs = (payload: { deleted_jobs?: string[] }) => {
        if ('deleted_jobs' in payload && Array.isArray(payload.deleted_jobs)) {
            payload.deleted_jobs.forEach((jobId) => {
                const index = state.jobs.findIndex((job) => job.job_id === jobId)
                if (index !== -1) state.jobs.splice(index, 1)
            })
        }
    }

    const saveHistoryNote = (payload: { job_id: string; note: string }) => {
        webSocketClient.emit('server.database.post_item', {
            namespace: 'history_notes',
            key: payload.job_id,
            value: { text: payload.note },
        })

        const job = state.jobs.find((job) => job.job_id === payload.job_id)
        if (job) job.note = payload.note
    }

    return {
        ...toRefs(state),
        getTotalPrintTime,
        getTotalCompletedPrintTime,
        getLongestPrintTime,
        getTotalFilamentUsed,
        getTotalJobsCount,
        getTotalCompletedJobsCount,
        getAvgPrintTime,
        getPrintStatus,
        getPrintJobById,
        getPrintJobsForGcodes,
        getPrintStatusByFilename,
        getFilteredJobList,
        reset,
        init,
        getTotals,
        loadHistoryNotes,
        getHistory,
        initHistoryNotes,
        getChanged,
        getDeletedJobs,
        saveHistoryNote,
    }
})
