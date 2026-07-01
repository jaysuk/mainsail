import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import { useToast } from 'vue-toast-notification'
import type { ServerSpoolmanState, ServerSpoolmanStateSpool, ServerSpoolmanStateVendor } from '@/store/server/spoolman/types'
import { resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'

export const getDefaultState = (): ServerSpoolmanState => ({
    health: '',
    info: {
        automatic_backups: false,
        backups_dir: '',
        data_dir: '',
        debug_mode: false,
        version: '',
    },
    active_spool_id: null,
    active_spool: null,
    vendors: [],
    feeds: [],
    spools: [],
})

function convertV2response<T>(payload: { error?: { message: string } | null; response?: T } & Record<string, unknown>): T | null {
    if ((payload.error?.message ?? null) !== null) {
        useToast().error(payload.error?.message ?? 'unknown spoolman error')
        return null
    }

    // if the response is v2, we need to get the response into the payload
    if ('response' in payload) return payload.response as T

    return payload as unknown as T
}

export const useServerSpoolmanStore = defineStore('serverSpoolman', () => {
    const state = reactive<ServerSpoolmanState>(getDefaultState())

    const reset = () => resetState(state, getDefaultState)

    const refreshSpools = () => {
        webSocketClient.emit(
            'server.spoolman.proxy',
            { request_method: 'GET', path: '/v1/spool' },
            { action: 'server/spoolman/getSpools' }
        )
        useSocketStore().addLoading('refreshSpools')
    }

    const init = () => {
        const socketStore = useSocketStore()

        webSocketClient.emit('server.spoolman.get_spool_id', {}, { action: 'server/spoolman/getActiveSpoolId' })
        webSocketClient.emit(
            'server.spoolman.proxy',
            { request_method: 'GET', path: '/v1/info', use_v2_response: true },
            { action: 'server/spoolman/getInfo' }
        )
        webSocketClient.emit(
            'server.spoolman.proxy',
            { request_method: 'GET', path: '/v1/health', use_v2_response: true },
            { action: 'server/spoolman/getHealth' }
        )
        webSocketClient.emit(
            'server.spoolman.proxy',
            { request_method: 'GET', path: '/v1/vendor', use_v2_response: true },
            { action: 'server/spoolman/getVendors' }
        )

        socketStore.addInitModule('server/spoolman/getActiveSpoolId')
        socketStore.addInitModule('server/spoolman/getHealth')
        socketStore.addInitModule('server/spoolman/getInfo')
        socketStore.addInitModule('server/spoolman/getVendors')

        socketStore.removeInitModule('server/spoolman/init')

        // init load spools, but don't wait for it to finish
        // this is needed because HappyHare or AFC need this data to display all spool data
        refreshSpools()
    }

    const getActiveSpoolId = (payload: { spool_id: number | null }) => {
        state.active_spool_id = payload.spool_id
        useSocketStore().removeInitModule('server/spoolman/getActiveSpoolId')

        // also set active spool to null, if spool_id is 0 or null
        if ([null, 0].includes(payload.spool_id)) {
            state.active_spool = null
            return
        }

        webSocketClient.emit(
            'server.spoolman.proxy',
            { request_method: 'GET', use_v2_response: true, path: `/v1/spool/${payload.spool_id}` },
            { action: 'server/spoolman/getActiveSpool' }
        )
    }

    const getActiveSpool = (payload: { requestParams?: unknown } & Record<string, unknown>) => {
        if ('requestParams' in payload) delete payload.requestParams
        const response = convertV2response<ServerSpoolmanStateSpool>(payload)
        if (response === null) return

        state.active_spool = response
    }

    const getHealth = (payload: { requestParams?: unknown } & Record<string, unknown>) => {
        delete payload.requestParams
        useSocketStore().removeInitModule('server/spoolman/getHealth')

        const response = convertV2response<{ status: string }>(payload)
        if (response === null) return

        state.health = response.status
    }

    const getInfo = (payload: { requestParams?: unknown } & Record<string, unknown>) => {
        delete payload.requestParams
        useSocketStore().removeInitModule('server/spoolman/getInfo')

        const response = convertV2response<ServerSpoolmanState['info']>(payload)
        if (response === null) return

        state.info = response
    }

    const getVendors = (payload: { requestParams?: unknown } & Record<string, unknown>) => {
        delete payload.requestParams
        useSocketStore().removeInitModule('server/spoolman/getVendors')

        const response = convertV2response<Record<string, ServerSpoolmanStateVendor>>(payload)
        if (response === null) return

        state.vendors = Object.values(response)
    }

    const getSpools = (payload: { requestParams?: unknown } & Record<string, unknown>) => {
        if ('requestParams' in payload) delete payload.requestParams
        useSocketStore().removeLoading('refreshSpools')

        const response = convertV2response<Record<string, ServerSpoolmanStateSpool>>(payload)
        if (response === null) return

        state.spools = Object.values(response)
    }

    const setActiveSpool = (id: number | null) => {
        const params: { spool_id?: number } = {}
        if (id !== null) params.spool_id = id

        webSocketClient.emit('server.spoolman.post_spool_id', params)
    }

    const refreshActiveSpool = () => {
        if (state.active_spool_id === null) return

        webSocketClient.emit(
            'server.spoolman.proxy',
            { request_method: 'GET', path: `/v1/spool/${state.active_spool_id}` },
            { action: 'server/spoolman/getActiveSpool' }
        )
    }

    return {
        ...toRefs(state),
        reset,
        init,
        getActiveSpoolId,
        getActiveSpool,
        getHealth,
        getInfo,
        getVendors,
        refreshSpools,
        getSpools,
        setActiveSpool,
        refreshActiveSpool,
    }
})
