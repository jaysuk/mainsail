import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type {
    ServerUpdateManagerState,
    ServerUpdateManagerStateGitRepo,
    ServerUpdateManagerStateGuiList,
} from '@/store/server/updateManager/types'
import { caseInsensitiveSort } from '@/plugins/helpers'
import { resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'

export const getDefaultState = (): ServerUpdateManagerState => ({
    busy: false,
    github_rate_limit: null,
    github_requests_remaining: null,
    github_limit_reset_time: null,
    git_repos: [],
    web_repos: [],
    system: {
        package_count: 0,
        package_list: [],
    },
    updateResponse: {
        application: '',
        complete: true,
        messages: [],
    },
})

export const useServerUpdateManagerStore = defineStore('serverUpdateManager', () => {
    const state = reactive<ServerUpdateManagerState>(getDefaultState())

    const getUpdateManagerList = computed<ServerUpdateManagerStateGuiList[]>(() => {
        const output: ServerUpdateManagerStateGuiList[] = []

        state.git_repos.forEach((repo) => output.push({ name: repo.name, type: 'git', data: { ...repo } }))
        state.web_repos.forEach((repo) => output.push({ name: repo.name, type: 'web', data: { ...repo } }))

        return caseInsensitiveSort(output, 'name')
    })

    const reset = () => resetState(state, getDefaultState)

    const init = () => {
        webSocketClient.emit('machine.update.status', {}, { action: 'server/updateManager/onUpdateStatus' })
    }

    const resetRepos = () => {
        state.git_repos = []
        state.web_repos = []
        state.system = { package_count: 0, package_list: [] }
    }

    const onUpdateStatus = (payload: { version_info: Record<string, ServerUpdateManagerStateGitRepo & { configured_type?: string }> }) => {
        resetRepos()

        for (const key of Object.keys(payload.version_info)) {
            const module = payload.version_info[key] ?? {}
            const configured_type = module.configured_type ?? null

            if (configured_type && ['git_repo', 'zip'].includes(configured_type)) {
                state.git_repos.push({ ...module, name: key })
                continue
            }

            if (configured_type && ['web', 'web_beta', 'python', 'executable'].includes(configured_type)) {
                state.web_repos.push({ ...module, name: key })
                continue
            }

            if (key === 'system') {
                const system = module as unknown as { package_count: number; package_list: string[] }
                state.system.package_count = system.package_count
                state.system.package_list = system.package_list
            }
        }

        useSocketStore().removeInitModule('server/updateManager/init')
    }

    const addUpdateResponse = (payload: { application: string; complete: boolean; message: string }) => {
        if (state.updateResponse.application !== payload.application) state.updateResponse.application = payload.application
        if (state.updateResponse.complete !== payload.complete) state.updateResponse.complete = payload.complete

        if ('complete' in payload && payload.complete) {
            webSocketClient.emit('machine.update.status', { refresh: false }, { action: 'server/updateManager/onUpdateStatus' })
        }

        state.updateResponse.messages.push({ date: new Date(), message: payload.message })
    }

    const resetUpdateResponse = () => {
        state.updateResponse = { application: '', complete: true, messages: [] }
    }

    // referenced by the socket store's onOpen to mark the panel busy while a
    // pending update response has not completed yet.
    const setStatus = (payload: { busy: boolean }) => {
        state.busy = payload.busy
    }

    return {
        ...toRefs(state),
        getUpdateManagerList,
        reset,
        init,
        resetRepos,
        onUpdateStatus,
        addUpdateResponse,
        resetUpdateResponse,
        setStatus,
    }
})
