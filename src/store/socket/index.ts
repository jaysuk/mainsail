import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type { SocketState } from '@/store/socket/types'
import { resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'

// cross-store collaborators (the onMessage router fans out into these)
import { useServerStore } from '@/store/server'
import { useServerUpdateManagerStore } from '@/store/server/updateManager'
import { useServerPowerStore } from '@/store/server/power'
import { useServerHistoryStore } from '@/store/server/history'
import { useServerTimelapseStore } from '@/store/server/timelapse'
import { useServerJobQueueStore } from '@/store/server/jobQueue'
import { useServerAnnouncementsStore } from '@/store/server/announcements'
import { useServerSpoolmanStore } from '@/store/server/spoolman'
import { useServerSensorStore } from '@/store/server/sensor'
import { usePrinterStore } from '@/store/printer'
import { useFilesStore } from '@/store/files'
import { useGuiWebcamsStore } from '@/store/gui/webcams'

export const getDefaultState = (): SocketState => {
    const hostname = (import.meta.env.VUE_APP_HOSTNAME as string) || window.location.hostname
    const defaultPort = window.location.port || (window.location.protocol === 'https:' ? 443 : 80)
    const port = import.meta.env.VUE_APP_PORT ? Number(import.meta.env.VUE_APP_PORT) : Number(defaultPort)
    const path = (import.meta.env.VUE_APP_PATH as string) || ''

    return {
        hostname,
        port,
        path,
        protocol: document.location.protocol === 'https:' ? 'wss' : 'ws',
        reconnectInterval: Number(import.meta.env.VUE_APP_RECONNECT_INTERVAL || 2000),
        isConnected: false,
        isConnecting: false,
        connectingFailed: false,
        connectionFailedMessage: null,
        loadings: [],
        initializationList: ['server'],
        connection_id: null,
    }
}

type SocketMessage = { method?: string; params?: unknown[] }

export const useSocketStore = defineStore('socket', () => {
    const state = reactive<SocketState>(getDefaultState())

    // --- getters ---
    const getUrl = computed(() => {
        const port = state.port !== 80 ? ':' + state.port : ''
        let path = '/' + state.path.replace(/^\/|\/$/g, '')
        if (path.endsWith('/')) path = path.slice(0, -1)

        return `//${state.hostname}${port}${path}`
    })

    const getHostUrl = computed(() => {
        const protocol = state.protocol === 'wss' ? 'https' : 'http'
        return `${protocol}://${state.hostname}/`
    })

    const getWebsocketUrl = computed(() => state.protocol + ':' + getUrl.value + '/websocket')

    // --- internal state setters (former mutations) ---
    const setConnected = () => {
        state.isConnected = true
        state.isConnecting = false
        state.connectingFailed = false
    }

    const setDisconnected = (message?: string) => {
        state.isConnected = false
        state.isConnecting = false
        state.connectingFailed = true
        state.connection_id = null
        if (message) state.connectionFailedMessage = message
    }

    // --- actions ---
    const reset = () => {
        setDisconnected()
        state.loadings = []
        state.initializationList = getDefaultState().initializationList
    }

    const setData = (payload: Partial<SocketState> & { socket?: Partial<SocketState> }) => {
        const data = 'socket' in payload && payload.socket ? payload.socket : payload
        Object.assign(state, data)
    }

    const setSocket = async (payload: { hostname: string; port: number; path: string }) => {
        setData(payload)

        const normPath = payload.path.replaceAll(/(^\/*)|(\/*$)/g, '')
        const path = normPath.length > 0 ? `/${normPath}` : ''

        webSocketClient.close()
        webSocketClient.setUrl(state.protocol + '://' + payload.hostname + ':' + payload.port + path + '/websocket')
        await webSocketClient.connect()
    }

    const onOpen = () => {
        setConnected()

        const serverStore = useServerStore()
        serverStore.init()

        const updateManager = useServerUpdateManagerStore()
        if (!updateManager.updateResponse.complete) updateManager.setStatus({ busy: false })
    }

    const onClose = (_event?: CloseEvent) => {
        setDisconnected()
    }

    const onMessage = (payload: SocketMessage) => {
        const param = (payload.params?.[0] ?? null) as never

        switch (payload.method) {
            case 'notify_status_update':
                usePrinterStore().getData(param)
                break
            case 'notify_gcode_response':
                useServerStore().addEvent({ result: param, send: false })
                break
            case 'notify_klippy_ready':
                useServerStore().setKlippyConnected()
                useServerStore().stopKlippyConnectedInterval()
                useServerStore().stopKlippyStateInterval()
                usePrinterStore().init()
                break
            case 'notify_klippy_disconnected':
                useServerStore().setKlippyDisconnected()
                break
            case 'notify_klippy_shutdown':
                useServerStore().setKlippyShutdown()
                break
            case 'notify_proc_stat_update':
                useServerStore().updateProcStats(param)
                break
            case 'notify_cpu_throttled':
                useServerStore().setThrottledState(param)
                break
            case 'notify_filelist_changed':
                useFilesStore().filelistChanged(param)
                break
            case 'notify_power_changed':
                useServerPowerStore().setStatus(param)
                break
            case 'notify_update_response':
                useServerUpdateManagerStore().addUpdateResponse(param)
                break
            case 'notify_update_refreshed':
                useServerUpdateManagerStore().onUpdateStatus(param)
                break
            case 'notify_history_changed':
                useServerHistoryStore().getChanged(param)
                break
            case 'notify_service_state_changed':
                useServerStore().serviceStateChanged(param)
                break
            case 'notify_timelapse_event':
                useServerTimelapseStore().getEvent(param)
                break
            case 'notify_job_queue_changed':
                useServerJobQueueStore().getEvent(param)
                break
            case 'notify_announcement_update':
                useServerAnnouncementsStore().getList(param)
                break
            case 'notify_announcement_dismissed':
                useServerAnnouncementsStore().getDismissed(param)
                break
            case 'notify_announcement_wake':
                useServerAnnouncementsStore().getWaked(param)
                break
            case 'notify_webcams_changed':
                useGuiWebcamsStore().initStore(param)
                break
            case 'notify_active_spool_set':
                useServerSpoolmanStore().getActiveSpoolId(param)
                break
            case 'notify_sensor_update':
                useServerSensorStore().updateSensors(param)
                break
            default:
                window.console.debug(payload)
        }
    }

    const addLoading = (name: string) => {
        state.loadings.push(name)
    }

    const removeLoading = (name: string) => {
        const index = state.loadings.indexOf(name)
        if (index > -1) state.loadings.splice(index, 1)
    }

    const clearLoadings = () => {
        if (state.loadings.length) state.loadings = []
    }

    const addInitModule = (name: string) => {
        if (state.initializationList.includes(name)) return
        state.initializationList.push(name)
    }

    const removeInitModule = (name: string) => {
        const index = state.initializationList.indexOf(name)
        if (index === -1) return
        state.initializationList.splice(index, 1)
    }

    // remove a complete init component like 'server/spoolman'
    const removeInitComponent = (prefix: string) => {
        state.initializationList = state.initializationList.filter((item) => !item.startsWith(prefix))
    }

    const reportDebug = (payload: unknown) => {
        window.console.log(payload)
    }

    const setConnectionFailed = (message?: string) => {
        setDisconnected(message)
    }

    return {
        ...toRefs(state),
        getUrl,
        getHostUrl,
        getWebsocketUrl,
        reset,
        setData,
        setSocket,
        onOpen,
        onClose,
        onMessage,
        addLoading,
        removeLoading,
        clearLoadings,
        addInitModule,
        removeInitModule,
        removeInitComponent,
        reportDebug,
        setConnectionFailed,
    }
})
