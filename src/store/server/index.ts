import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import router from '@/plugins/router'
import { useToast } from 'vue-toast-notification'
import type { ServerState, ServerStateEvent, ServerStateNetworkInterface } from '@/store/server/types'
import { camelize, formatConsoleMessage, formatFilesize } from '@/plugins/helpers'
import { initableServerComponents, maxEventHistory } from '@/store/variables'
import { resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'

// collaborator stores
import { useSocketStore } from '@/store/socket'
import { usePrinterStore } from '@/store/printer'
import { useFilesStore } from '@/store/files'
import { useGuiStore } from '@/store/gui'
import { useGuiConsoleStore } from '@/store/gui/console'
import { useGuiMaintenanceStore } from '@/store/gui/maintenance'
import { useGuiWebcamsStore } from '@/store/gui/webcams'
import { useServerPowerStore } from '@/store/server/power'
import { useServerUpdateManagerStore } from '@/store/server/updateManager'
import { useServerHistoryStore } from '@/store/server/history'
import { useServerTimelapseStore } from '@/store/server/timelapse'
import { useServerJobQueueStore } from '@/store/server/jobQueue'
import { useServerAnnouncementsStore } from '@/store/server/announcements'
import { useServerSpoolmanStore } from '@/store/server/spoolman'
import { useServerSensorStore } from '@/store/server/sensor'

export const getDefaultState = (): ServerState => ({
    klippy_connected: false,
    klippy_connected_timer: null,
    klippy_state: '',
    klippy_state_timer: null,
    klippy_message: '',
    components: [],
    failed_components: [],
    failed_init_components: [],
    warnings: [],
    registered_directories: [],
    events: [],
    config: {
        config: {},
        orig: {},
    },
    system_info: null,
    system_boot_at: null,
    cpu_temp: 0,
    moonraker_stats: null,
    throttled_state: {
        bits: 0,
        flags: [],
    },
    network_stats: {},
    system_cpu_usage: {},
    dbNamespaces: [],
    websocket_count: 0,
    moonraker_version: '',
    connection_id: null,
})

// Maps a server component name to its store's init() — replaces the legacy
// dynamic dispatch('server/<component>/init') call.
const serverComponentInit: Record<string, () => void> = {
    history: () => useServerHistoryStore().init(),
    power: () => useServerPowerStore().init(),
    updateManager: () => useServerUpdateManagerStore().init(),
    timelapse: () => useServerTimelapseStore().init(),
    jobQueue: () => useServerJobQueueStore().init(),
    announcements: () => useServerAnnouncementsStore().init(),
    spoolman: () => useServerSpoolmanStore().init(),
    sensor: () => useServerSensorStore().init(),
}

export const useServerStore = defineStore('server', () => {
    const state = reactive<ServerState>(getDefaultState())

    // --- getters ---
    const getConsoleEvents = (reverse = true, limit = 500): ServerStateEvent[] => {
        const events = [...state.events].slice(limit * -1) ?? []

        if (events.length < 20 && !state.console_cleared_this_session) {
            const date = events.length ? events[0].date : new Date()
            let message = ''
            message += '- Type <a class="command text--blue">HELP</a> to get a list of available commands.\n'
            message += '- Click on the "?" button to get a searchable list.\n'
            message += '- Commands in the console are clickable and will be placed into the input field.\n'
            message += '- Use the tab key to complete your inputs. If there are several options, a list is displayed.\n'
            message += '- Use the ⇵ arrow keys to navigate through the previous entries.\n'

            events.unshift({
                date,
                message,
                formatMessage: formatConsoleMessage(message),
                type: 'response',
            })
        }

        return reverse ? events.reverse() : events
    }

    const getConfig = (section: string, attribute: string) => {
        const config = state.config?.config ?? {}
        if (section in config && attribute in config[section]) return config[section][attribute]
        return null
    }

    const getHostStats = computed(() => {
        if (!('system_info' in state) || state.system_info === null) return null

        const printerStore = usePrinterStore()

        let version: null | string = null
        if (printerStore.software_version) {
            version = printerStore.software_version.split('-').slice(0, 4).join('-')
        }
        if (printerStore.app_name) {
            version = printerStore.app_name + ' ' + version
        }

        let pythonVersion: null | string = null
        if (state.system_info?.python?.version_string) {
            const firstSpace = state.system_info.python.version_string.indexOf(' ')
            pythonVersion = state.system_info.python.version_string.slice(0, firstSpace + 1)
        }

        const cpuCors = state.system_info?.cpu_info?.cpu_count ?? 1
        const load = Math.round((printerStore.system_stats?.sysload ?? 0) * 100) / 100
        const loadPercent = Math.round((load / cpuCors) * 100)

        let loadProgressColor = 'primary'
        if (loadPercent > 95) loadProgressColor = 'error'
        else if (loadPercent > 80) loadProgressColor = 'warning'

        let memoryFormat: null | string = null
        let memUsage: null | number = null
        const memAvail = (printerStore.system_stats?.memavail ?? 0) * 1024
        const memTotal = (state.system_info?.cpu_info?.total_memory ?? 0) * 1024

        if (memAvail > 0 && memTotal > 0) {
            memoryFormat = formatFilesize(memTotal - memAvail) + ' / ' + formatFilesize(memTotal)
            memUsage = Math.round(((memTotal - memAvail) / memTotal) * 100)
        } else if (memTotal) {
            memoryFormat = formatFilesize(memTotal)
        }

        let memUsageColor = 'primary'
        if (memUsage && memUsage > 95) memUsageColor = 'error'
        else if (memUsage && memUsage > 80) memUsageColor = 'warning'

        let tempSensor = printerStore.getHostTempSensor
        if (tempSensor === null && state.cpu_temp !== null) {
            tempSensor = {
                temperature: state.cpu_temp?.toFixed(0),
                measured_min_temp: null,
                measured_max_temp: null,
            }
        }

        return {
            cpuName: state.system_info?.cpu_info?.processor ?? null,
            cpuDesc: state.system_info?.cpu_info?.cpu_desc ?? null,
            bits: state.system_info?.cpu_info?.bits ?? null,
            version,
            pythonVersion,
            os: state.system_info?.distribution?.name ?? null,
            release_info: state.system_info?.distribution?.release_info ?? null,
            load,
            loadPercent: loadPercent < 100 ? loadPercent : 100,
            loadProgressColor,
            memoryFormat,
            memUsed: formatFilesize(memTotal - memAvail),
            memAvail: formatFilesize(memAvail),
            memTotal: formatFilesize(memTotal),
            memUsage,
            memUsageColor,
            tempSensor,
        }
    })

    const getCpuUsage = computed(() => {
        if ('cpu' in state.system_cpu_usage) return Math.round(state.system_cpu_usage.cpu)
        return null
    })

    const getNetworkInterfaces = computed(() => {
        const interfaces: { [key: string]: ServerStateNetworkInterface } = {}

        Object.keys(state.network_stats).forEach((interfaceName: string) => {
            if (interfaceName !== 'lo') {
                if (interfaceName in (state.system_info?.network ?? {}) || interfaceName.startsWith('can')) {
                    interfaces[interfaceName] = { ...state.network_stats[interfaceName] }

                    if (state.system_info?.network && interfaceName in (state.system_info?.network ?? {})) {
                        interfaces[interfaceName].details = { ...state.system_info.network[interfaceName] }
                    }
                }
            }
        })

        return interfaces
    })

    const getThrottledStateFlags = computed(() => {
        let flags = state.throttled_state.flags.filter((flag: string) => flag !== '?')
        flags = flags.map((flag) => {
            flag = flag.replace(/ /g, '').replace(/-/g, '')
            return flag.charAt(0).toUpperCase() + flag.slice(1)
        })
        return flags
    })

    // --- internal state setters (former mutations) ---
    const setData = (payload: Record<string, unknown>) => {
        if ('requestParams' in payload) delete payload.requestParams
        Object.assign(state, payload)
    }

    const addFailedInitComponentState = (component: string) => {
        if (!state.failed_init_components.includes(component)) state.failed_init_components.push(component)
    }

    const removeComponent = (component: string) => {
        const index = state.components.indexOf(component)
        if (index === -1) return
        state.components.splice(index, 1)
    }

    // --- interval helpers ---
    const startKlippyConnectedInterval = () => {
        if (state.klippy_connected_timer) return
        state.klippy_connected_timer = window.setInterval(() => {
            webSocketClient.emit('server.info', {}, { action: 'server/checkKlippyConnected' })
        }, 2000)
    }

    const stopKlippyConnectedInterval = () => {
        if (state.klippy_connected_timer === null) return
        clearInterval(state.klippy_connected_timer)
        state.klippy_connected_timer = null
    }

    const startKlippyStateInterval = () => {
        if (state.klippy_state_timer) return
        state.klippy_state_timer = window.setInterval(() => {
            webSocketClient.emit('printer.info', {}, { action: 'server/checkKlippyState' })
        }, 2000)
    }

    const stopKlippyStateInterval = () => {
        if (state.klippy_state_timer === null) return
        clearInterval(state.klippy_state_timer)
        state.klippy_state_timer = null
    }

    // --- klippy state actions ---
    const setKlippyConnected = () => {
        state.klippy_connected = true
    }

    const setKlippyDisconnected = () => {
        state.klippy_connected = false
        state.klippy_state = 'disconnected'
        state.klippy_message = 'Disconnected...'
        stopKlippyStateInterval()
        startKlippyConnectedInterval()
    }

    const setKlippyShutdown = () => {
        state.klippy_state = 'shutdown'
        state.klippy_message = 'Shutdown...'
        stopKlippyStateInterval()
        startKlippyConnectedInterval()
    }

    const setThrottledState = (payload: { bits?: number; flags?: string[] } | null) => {
        if (payload && 'bits' in payload && payload.bits !== undefined) state.throttled_state.bits = payload.bits
        if (payload && 'flags' in payload && payload.flags !== undefined) state.throttled_state.flags = payload.flags
    }

    const setKlippyReady = () => {
        stopKlippyConnectedInterval()
        stopKlippyStateInterval()
        usePrinterStore().reset()
        usePrinterStore().init()
    }

    const checkKlippyConnected = (payload: { klippy_connected: boolean; klippy_state: string }) => {
        if (!payload.klippy_connected) {
            startKlippyConnectedInterval()
            return
        }
        stopKlippyConnectedInterval()
        setKlippyConnected()
        usePrinterStore().initGcodes()
        checkKlippyState({ state: payload.klippy_state, state_message: null })
    }

    const checkKlippyState = (payload: { state: string; state_message: string | null }) => {
        state.klippy_state = payload.state
        state.klippy_message = payload.state_message ?? ''

        if (payload.state !== 'ready') {
            startKlippyStateInterval()
            return
        }
        stopKlippyConnectedInterval()
        stopKlippyStateInterval()
        usePrinterStore().init()
    }

    // --- init / lifecycle actions ---
    const reset = () => {
        stopKlippyConnectedInterval()
        stopKlippyStateInterval()
        resetState(state, getDefaultState)
        useServerPowerStore().reset()
        useServerUpdateManagerStore().reset()
    }

    const init = async () => {
        window.console.debug('init Server')
        const socketStore = useSocketStore()

        try {
            const connection = await webSocketClient.emitAndWait('server.connection.identify', {
                client_name: 'mainsail',
                version: (import.meta.env.PACKAGE_VERSION as string) || '0.0.0',
                type: 'web',
                url: 'https://github.com/mainsail-crew/mainsail',
            })
            state.connection_id = connection.connection_id
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e)
            if (message === 'Unauthorized') socketStore.setConnectionFailed(message)
            window.console.error('Error while identifying client: ' + message)
            return
        }

        socketStore.addInitModule('server/info')
        socketStore.addInitModule('server/config')
        socketStore.addInitModule('server/systemInfo')
        socketStore.addInitModule('server/procStats')
        socketStore.addInitModule('server/databaseList')

        webSocketClient.emit('server.info', {}, { action: 'server/initServerInfo' })
        webSocketClient.emit('server.config', {}, { action: 'server/initServerConfig' })
        webSocketClient.emit('machine.system_info', {}, { action: 'server/initSystemInfo' })
        webSocketClient.emit('machine.proc_stats', {}, { action: 'server/initProcStats' })
        webSocketClient.emit('server.database.list', { root: 'config' }, { action: 'server/checkDatabases' })

        socketStore.removeInitModule('server')
    }

    const checkDatabases = (payload: { namespaces?: string[] }) => {
        const socketStore = useSocketStore()

        if (payload.namespaces?.includes('mainsail')) {
            socketStore.addInitModule('gui/init')
            useGuiStore().init()
        } else useGuiStore().initDb()

        if (payload.namespaces?.includes('maintenance')) {
            socketStore.addInitModule('gui/maintenance/init')
            useGuiMaintenanceStore().init()
        } else useGuiMaintenanceStore().initDb()

        socketStore.addInitModule('gui/webcam/init')
        useGuiWebcamsStore().init()

        if (payload.namespaces) state.dbNamespaces = payload.namespaces

        webSocketClient.emit('server.info', {}, { action: 'server/checkKlippyConnected' })
        socketStore.removeInitModule('server/databaseList')
    }

    const initServerInfo = (payload: Record<string, unknown> & { components?: string[]; registered_directories?: string[] }) => {
        const socketStore = useSocketStore()

        if ('plugins' in payload) delete payload.plugins
        if ('failed_plugins' in payload) delete payload.failed_plugins

        if (payload.components?.length) {
            for (let component of payload.components) {
                component = camelize(component)
                if (initableServerComponents.includes(component)) {
                    window.console.debug('init server component: ' + component)
                    socketStore.addInitModule('server/' + component + '/init')
                    serverComponentInit[component]?.()
                }
            }
        }

        if (payload.registered_directories?.length) {
            useFilesStore().initRootDirs(payload.registered_directories)
        }

        setData(payload)
        socketStore.removeInitModule('server/info')
    }

    const initServerConfig = (payload: ServerState['config']) => {
        state.config = payload
        useSocketStore().removeInitModule('server/config')
    }

    const initSystemInfo = (payload: { system_info: ServerState['system_info'] }) => {
        state.system_info = payload.system_info
        useSocketStore().removeInitModule('server/systemInfo')
    }

    const initProcStats = (payload: { throttled_state: { bits: number; flags: string[] } | null; system_uptime?: number }) => {
        if (payload.throttled_state !== null) setThrottledState(payload.throttled_state)
        if (payload.system_uptime) {
            state.system_boot_at = new Date(new Date().getTime() - payload.system_uptime * 1000)
        }
        useSocketStore().removeInitModule('server/procStats')
    }

    const updateProcStats = (payload: Record<string, unknown>) => {
        if ('cpu_temp' in payload) state.cpu_temp = payload.cpu_temp as number
        if ('moonraker_stats' in payload) state.moonraker_stats = payload.moonraker_stats as ServerState['moonraker_stats']
        if ('network' in payload) state.network_stats = payload.network as ServerState['network_stats']
        if ('system_cpu_usage' in payload) state.system_cpu_usage = payload.system_cpu_usage as ServerState['system_cpu_usage']
    }

    const getData = (payload: Record<string, unknown>) => {
        setData(payload)
    }

    const getGcodeStore = (payload: { gcode_store: ServerStateEvent[] }) => {
        const consoleStore = useGuiConsoleStore()
        state.events = []

        let events: ServerStateEvent[] = payload.gcode_store
        const filters: string[] = consoleStore.getConsolefilterRules
        filters.forEach((filter) => {
            try {
                const regex = new RegExp(filter)
                events = events.filter((event) => !regex.test(event.message))
            } catch {
                window.console.error("Custom console filter '" + filter + "' doesn't work")
            }
        })

        const cleared_since: number = consoleStore.getConsoleClearedSince
        events = events.filter((event) => {
            if (!cleared_since) return true
            if (event.time && event.time * 1000 < cleared_since) return false
            return !(event.date && new Date(event.date).valueOf() < cleared_since)
        })

        events.forEach((event) => state.events.push(event))
        useSocketStore().removeInitModule('server/gcode_store')
    }

    const addRootDirectory = (data: { item: { root: string } }) => {
        if (!state.registered_directories.includes(data.item.root)) {
            state.registered_directories.push(data.item.root)
        }
    }

    const addEvent = (payload: { type?: string; message?: string; result?: string; send?: boolean; error?: { message?: string } } | string) => {
        const data = typeof payload === 'string' ? { message: payload } : payload

        let type = 'response'
        if (typeof data === 'object' && 'type' in data && data.type) type = data.type

        let message = ''
        if ('message' in data && data.message !== undefined) message = data.message
        else if ('result' in data && data.result !== undefined) message = data.result
        else if ('error' in data && data.error?.message) message = data.error.message

        let formatMessage = formatConsoleMessage(message)
        if (type === 'response') {
            if (message.startsWith('// action:')) type = 'action'
            else if (message.startsWith('// debug:')) type = 'debug'
        }

        const filters: string[] = useGuiConsoleStore().getConsolefilterRules
        let boolImport = true
        filters.every((filter) => {
            try {
                const regex = new RegExp(filter)
                if (regex.test(formatMessage)) boolImport = false
            } catch {
                window.console.error("Custom console filter '" + filter + "' doesn't work!")
            }
            return boolImport
        })

        if (!boolImport) return

        if (type === 'command') formatMessage = '<a class="command text--blue">' + formatMessage + '</a>'

        if (['command', 'autocomplete'].includes(type) && state.events[state.events.length - 1]?.type === 'autocomplete') {
            state.events.pop()
        }

        state.events.push({ date: new Date(), message, formatMessage, type })
        if (state.events.length >= maxEventHistory) state.events = state.events.slice(state.events.length - maxEventHistory)

        if (
            ['error', 'response'].includes(type) &&
            !['/', '/console'].includes(router.currentRoute.value.path) &&
            message.startsWith('!! ')
        ) {
            useToast().error(formatMessage)
        }
    }

    const serviceStateChanged = (payload: Record<string, { active_state: string; sub_state: string }>) => {
        const name = Object.keys(payload)[0]
        if (state.system_info?.service_state) state.system_info.service_state[name] = payload[name]
    }

    const addFailedInitComponent = (component: string) => {
        removeComponent(component)
        addFailedInitComponentState(component)
    }

    return {
        ...toRefs(state),
        getConsoleEvents,
        getConfig,
        getHostStats,
        getCpuUsage,
        getNetworkInterfaces,
        getThrottledStateFlags,
        reset,
        init,
        checkDatabases,
        initServerInfo,
        initServerConfig,
        initSystemInfo,
        initProcStats,
        updateProcStats,
        setData,
        setKlippyConnected,
        setKlippyDisconnected,
        setKlippyShutdown,
        setThrottledState,
        setKlippyReady,
        startKlippyConnectedInterval,
        stopKlippyConnectedInterval,
        startKlippyStateInterval,
        stopKlippyStateInterval,
        checkKlippyConnected,
        checkKlippyState,
        getData,
        getGcodeStore,
        addRootDirectory,
        addEvent,
        serviceStateChanged,
        addFailedInitComponent,
    }
})
