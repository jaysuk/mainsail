import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type { FarmPrinterState, FarmPrinterWsDataEntry } from '@/store/farm/printer/types'
import { getDefaultState as getGuiDefaultState, useGuiStore } from '@/store/gui'
import { defaultLogoColor, themeDir, thumbnailBigMin } from '@/store/variables'
import { convertName, escapePath } from '@/plugins/helpers'
import { resetState, deepMerge } from '@/store/helpers'
import { useSocketStore } from '@/store/socket'
import { useGuiRemoteprintersStore } from '@/store/gui/remoteprinters'

export const getDefaultState = (): FarmPrinterState => ({
    _namespace: '',
    socket: {
        instance: null,
        hostname: '',
        port: 7125,
        path: '',
        webPort: 80,
        protocol: document.location.protocol === 'https:' ? 'wss' : 'ws',
        isConnected: false,
        isConnecting: false,
        reconnects: 0,
        maxReconnects: 2,
        reconnectInterval: 1000,
        wsData: [],
    },
    server: {
        klippy_connected: false,
    },
    data: {
        gui: getGuiDefaultState(),
        webcams: [],
    },
    settings: {},
    databases: [],
    current_file: {
        isDirectory: false,
        filename: '',
        modified: new Date(),
        permissions: '',
    },
    theme_files: [],
})

// Vuex dynamically registered a fresh module per remote printer
// (`this.registerModule(['farm', id], printer)`); Pinia has no direct
// equivalent, but `defineStore` already supports a dynamic string id, so each
// printer gets its own store instance keyed by id, created on demand. The
// `farm` registry store (farm/index.ts) tracks which ids are currently live
// and owns registerPrinter/unregisterPrinter.
export function useFarmPrinterStore(id: string) {
    return defineStore(`farmPrinter-${id}`, () => {
        const state = reactive<FarmPrinterState>(getDefaultState())

        // --- getters ---
        const getSocketUrl = computed(() => {
            const normPath = state.socket.path.replaceAll(/(^\/*)|(\/*$)/g, '')
            const path = normPath.length > 0 ? `/${normPath}` : ''
            return state.socket.protocol + '://' + state.socket.hostname + ':' + state.socket.port + path + '/websocket'
        })

        const getSocketData = computed(() => state.socket)
        const getPrinterSocketState = computed(() => state.socket)

        const isCurrentPrinter = computed(() => {
            const socketStore = useSocketStore()
            return socketStore.hostname === state.socket.hostname && socketStore.port === state.socket.port
        })

        const getSetting = <T>(name: string, fallback: T): T => (state.settings[name] as T | undefined) ?? fallback

        const getPrinterName = computed(() => {
            if (state.data.gui.general?.printername) return state.data.gui.general.printername
            return state.socket.hostname + (state.socket.port != 80 ? ':' + state.socket.port : '') + state.socket.path
        })

        const getLogoColor = computed(() => state.data.gui?.uiSettings?.logo ?? defaultLogoColor)

        const getPrintPercentByFilepositionRelative = computed(() => {
            if (
                state.current_file?.filename &&
                state.current_file?.gcode_start_byte &&
                state.current_file?.gcode_end_byte &&
                state.current_file.filename === state.data.print_stats?.filename
            ) {
                if (state.data.virtual_sdcard.file_position <= state.current_file.gcode_start_byte) return 0
                if (state.data.virtual_sdcard.file_position >= state.current_file?.gcode_end_byte) return 1

                const currentPosition = state.data.virtual_sdcard.file_position - state.current_file.gcode_start_byte
                const maxPosition = state.current_file.gcode_end_byte - state.current_file.gcode_start_byte

                if (currentPosition > 0 && maxPosition > 0) return (1 / maxPosition) * currentPosition
            }

            return state.data.virtual_sdcard?.progress ?? 0
        })

        const getPrintPercentByFilepositionAbsolute = computed(() => state.data.virtual_sdcard?.progress ?? 0)
        const getPrintPercentBySlicer = computed(() => state.data.display_status?.progress ?? 0)

        const getPrintPercentByFilament = computed(() => {
            const filament_used = state.data.print_stats?.filament_used ?? null
            const filament_total = state.current_file?.filament_total ?? null

            if (filament_used !== null && filament_total !== null) {
                if (filament_total == 0) return 0
                return filament_used / filament_total
            }

            return state.data.virtual_sdcard?.progress ?? 0
        })

        const getPrintPercent = computed<number>(() => {
            const type = state.data.gui?.general?.calcPrintProgress ?? 'file-relative'
            switch (type) {
                case 'file-relative':
                    return getPrintPercentByFilepositionRelative.value
                case 'file-absolute':
                    return getPrintPercentByFilepositionAbsolute.value
                case 'slicer':
                    return getPrintPercentBySlicer.value
                case 'filament':
                    return getPrintPercentByFilament.value
                default:
                    return getPrintPercentByFilepositionRelative.value
            }
        })

        const getStatus = computed(() => {
            if (!state.socket.isConnected) {
                return state.socket.isConnecting ? 'Connecting...' : 'Disconnected'
            } else if (!state.server.klippy_connected) {
                return 'ERROR'
            } else if (state.data?.print_stats?.state) {
                if (state.data.print_stats.state === 'printing') {
                    return Math.floor(getPrintPercent.value * 100) + '% Printing'
                }

                return state.data.print_stats.state.charAt(0).toUpperCase() + state.data.print_stats.state.slice(1)
            }

            return 'Unknown'
        })

        const getCurrentFilename = computed(() => state.data.print_stats?.filename ?? '')

        const getImage = computed(() => {
            if (state.current_file.filename && state.current_file.thumbnails?.length) {
                const indexLastDir = state.current_file.filename.lastIndexOf('/')
                const dir = indexLastDir !== -1 ? state.current_file.filename.substring(0, indexLastDir) + '/' : ''
                const thumbnail = state.current_file.thumbnails.find((thumb) => thumb.width >= thumbnailBigMin)

                const normPath = state.socket.path.replaceAll(/(^\/*)|(\/*$)/g, '')
                const path = normPath.length > 0 ? `/${normPath}` : ''
                if (thumbnail && 'relative_path' in thumbnail)
                    return (
                        '//' +
                        state.socket.hostname +
                        ':' +
                        state.socket.port +
                        path +
                        '/server/files/gcodes/' +
                        escapePath(dir) +
                        escapePath(thumbnail.relative_path)
                    )
            }

            return null
        })

        const getThemeFileUrl = (acceptName: string, acceptExtensions: string[]) => {
            const file = state.theme_files.find(
                (element: string) =>
                    element.substr(0, element.lastIndexOf('.')) === themeDir + '/' + acceptName &&
                    acceptExtensions.includes(element.substr(element.lastIndexOf('.') + 1))
            )

            const normPath = state.socket.path.replaceAll(/(^\/*)|(\/*$)/g, '')
            const path = normPath.length > 0 ? `/${normPath}` : ''

            return file ? '//' + state.socket.hostname + ':' + state.socket.port + path + '/server/files/config/' + file : null
        }

        const getLogo = computed(() => getThemeFileUrl('sidebar-logo', ['gif', 'jpg', 'png', 'gif', 'svg']))

        const getPosition = computed(() => {
            if ('toolhead' in state.data && state.data.toolhead && 'position' in state.data.toolhead) return state.data.toolhead.position
            return []
        })

        const estimated_time_file = computed<number>(() => {
            if (state.data.print_stats?.print_duration > 0 && getPrintPercent.value > 0) {
                return Number((state.data.print_stats.print_duration / getPrintPercent.value - state.data.print_stats.print_duration).toFixed(0))
            }
            return 0
        })

        const estimated_time_filament = computed<number>(() => {
            if (
                state.data.print_stats?.print_duration &&
                state.data.print_stats?.filament_used &&
                state.current_file.filament_total &&
                state.data.print_stats.filament_used > 0 &&
                state.current_file.filament_total > state.data.print_stats.filament_used
            ) {
                return Number(
                    (
                        state.data.print_stats.print_duration / (state.data.print_stats.filament_used / state.current_file.filament_total) -
                        state.data.print_stats.print_duration
                    ).toFixed(0)
                )
            }
            return 0
        })

        const estimated_time_slicer = computed<number>(() => {
            if (
                state.data.print_stats &&
                state.data.print_stats?.print_duration &&
                state.current_file?.estimated_time &&
                state.current_file?.estimated_time > state.data.print_stats.print_duration
            ) {
                return Number((state.current_file.estimated_time - state.data.print_stats.print_duration).toFixed(0))
            }
            return 0
        })

        const estimated_time_eta = computed<number>(() => {
            let time = 0
            let timeCount = 0
            const boolFileCalc = state.data.gui?.general?.calcEtaTime?.includes('file') ?? true
            const boolFilamentCalc = state.data.gui?.general?.calcEtaTime?.includes('filament') ?? true
            const boolSlicerCalc = state.data.gui?.general?.calcEtaTime?.includes('slicer') ?? true

            if (boolFileCalc && estimated_time_file.value > 0) {
                time += estimated_time_file.value
                timeCount++
            }
            if (boolFilamentCalc && estimated_time_filament.value > 0) {
                time += estimated_time_filament.value
                timeCount++
            }
            if (boolSlicerCalc && estimated_time_slicer.value > 0) {
                time += estimated_time_slicer.value
                timeCount++
            }

            if (time && timeCount) return Date.now() + (time / timeCount) * 1000

            return 0
        })

        const getPrinterPreview = computed(() => {
            if (!state.server.klippy_connected) return []

            const output: { name: string; value: string; file?: number; filament?: number; slicer?: number; eta?: number }[] = []

            Object.keys(state.data)
                .filter((key) => key.startsWith('extruder'))
                .forEach((key) => {
                    const obj = state.data[key] as { temperature?: number; target?: number } | undefined
                    if (obj?.temperature !== undefined && obj?.target !== undefined) {
                        output.push({
                            name: convertName(key),
                            value: obj.temperature.toFixed(0) + '° / ' + obj.target.toFixed(0) + '°',
                        })
                    }
                })

            const heaterBed = state.data.heater_bed as { temperature?: number; target?: number } | undefined
            if (heaterBed?.temperature !== undefined && heaterBed?.target !== undefined) {
                output.push({
                    name: convertName('heater_bed'),
                    value: heaterBed.temperature.toFixed(0) + '° / ' + heaterBed.target.toFixed(0) + '°',
                })
            }

            const chamberFan = state.data['temperature_fan chamber'] as { temperature?: number; target?: number } | undefined
            if (chamberFan?.temperature !== undefined && chamberFan?.target !== undefined) {
                output.push({
                    name: convertName('chamber'),
                    value: chamberFan.temperature.toFixed(0) + '° / ' + chamberFan.target.toFixed(0) + '°',
                })
            }

            if ('temperature_sensor chamber' in state.data) {
                const chamberSensor = state.data['temperature_sensor chamber'] as { temperature: number }
                output.push({ name: convertName('chamber'), value: chamberSensor.temperature.toFixed(0) + '°' })
            }

            if ((state.data?.print_stats?.state ?? '') === 'printing' && getPrintPercent.value > 0) {
                const hours12Format = useGuiStore().getHours12Format ?? false
                const eta = estimated_time_eta.value

                const date = new Date(eta)
                let am = true
                let h: string | number = date.getHours()

                if (hours12Format && h > 11) am = false
                if (hours12Format && h > 12) h -= 12
                if (h < 10) h = '0' + h

                const m = date.getMinutes() >= 10 ? date.getMinutes() : '0' + date.getMinutes()

                const diff = date.getTime() - new Date().getTime()
                let outputOutput = h + ':' + m
                if (hours12Format) outputOutput += ` ${am ? 'AM' : 'PM'}`
                if (diff > 60 * 60 * 24 * 1000) outputOutput += `+${Math.trunc(diff / (60 * 60 * 24 * 1000))}`

                output.push({
                    name: 'ETA',
                    value: eta > 0 ? outputOutput : '--',
                    file: estimated_time_file.value,
                    filament: estimated_time_filament.value,
                    slicer: estimated_time_slicer.value,
                    eta,
                })
            }

            return output
        })

        const getPrinterWebcams = computed(() => state.data.webcams.filter((webcam) => webcam.enabled))

        // --- internal state setters (former mutations) ---
        const setSocketData = (payload: Record<string, unknown> & { _namespace?: string; status?: Record<string, unknown>; requestParams?: unknown }) => {
            let data = 'status' in payload && payload.status ? payload.status : payload
            if ('requestParams' in data) delete data.requestParams
            if ('_namespace' in data && data._namespace) {
                state._namespace = data._namespace as string
                delete data._namespace
            }

            Object.assign(state.socket, data)
        }

        const setData = (payload: Record<string, unknown> & { requestParams?: unknown }) => {
            if ('requestParams' in payload) delete payload.requestParams

            Object.entries(payload).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    state.data[key] = { ...(state.data[key] as object), ...value }
                } else {
                    state.data[key] = value
                }
            })
        }

        const setSettingsState = (payload: Record<string, unknown>) => {
            Object.assign(state.settings, payload)
        }

        const addWsData = (payload: FarmPrinterWsDataEntry) => {
            state.socket.wsData.push(payload)
        }

        const removeWsData = (index: number) => {
            state.socket.wsData.splice(index, 1)
        }

        const setKlippyConnected = (payload: boolean) => {
            state.server.klippy_connected = payload
        }

        const setCurrentFile = (payload: Record<string, unknown> & { requestParams?: unknown }) => {
            if ('requestParams' in payload) delete payload.requestParams
            state.current_file = payload as never
        }

        const setConfigDir = (payload: Record<string, { path?: string }>) => {
            Object.values(payload).forEach((file) => {
                if (file.path?.startsWith('.theme/')) {
                    state.theme_files.push(file.path)
                }
            })
        }

        const setDatabases = (payload: string[]) => {
            state.databases = payload
        }

        const setMainsailData = (payload: Record<string, unknown>) => {
            deepMerge(state.data.gui, payload)
        }

        const setWebcamsData = (payload: FarmPrinterState['data']['webcams']) => {
            state.data.webcams = payload
        }

        // --- actions ---
        const reset = () => resetState(state, getDefaultState)

        const resetData = () => {
            Object.assign(state.data, getDefaultState().data)
        }

        const sendObj = (payload: { method: string; params?: Record<string, unknown>; action?: string; actionPreload?: Record<string, unknown> | null }) => {
            if (state.socket.instance && state.socket.instance.readyState === WebSocket.OPEN) {
                const id = Math.floor(Math.random() * 10000) + 1

                addWsData({
                    id,
                    action: payload.action,
                    params: payload.params || {},
                    actionPreload: payload.actionPreload || null,
                })

                state.socket.instance.send(
                    JSON.stringify({ jsonrpc: '2.0', method: payload.method, params: payload.params || {}, id })
                )
            }
        }

        const getObjectsList = (payload: { objects?: string[] }) => {
            const allowed = [
                'webhooks',
                'print_stats',
                'virtual_sdcard',
                'display_status',
                'heaters',
                'heater_bed',
                'heater_fan',
                'fan',
                'temperature_fan',
                'temperature_sensor',
                'idle_timeout',
                'toolhead',
            ]

            let subscripts: Record<string, null> = {}
            payload.objects?.forEach((object: string) => {
                const splits = object.split(' ')
                const objectName = splits[0]

                if (allowed.includes(objectName) || objectName.startsWith('extruder')) {
                    subscripts = { ...subscripts, [object]: null }
                }
            })

            if (Object.keys(subscripts).length > 0) {
                sendObj({ method: 'printer.objects.subscribe', params: { objects: subscripts }, action: 'getData' })
            }
        }

        const getData = (payload: Record<string, unknown> & { status?: Record<string, unknown> }) => {
            const data = 'status' in payload && payload.status ? { ...payload.status } : { ...payload }
            setData(data)

            const printStats = data.print_stats as { filename?: string } | undefined
            if ((printStats?.filename ?? '') !== '') {
                sendObj({ method: 'server.files.metadata', params: { filename: printStats?.filename }, action: 'getMetadataCurrentFile' })
            }
        }

        const getMetadataCurrentFile = (payload: Record<string, unknown>) => {
            setCurrentFile(payload)
        }

        const getConfigDir = (payload: Record<string, { path?: string }>) => {
            setConfigDir(payload)
        }

        const getMainsailData = (payload: { value: Record<string, unknown> }) => {
            setMainsailData(payload.value)
        }

        const getWebcamsData = (payload: { webcams: FarmPrinterState['data']['webcams'] }) => {
            setWebcamsData(payload.webcams)
        }

        const getDatabases = (payload: { namespaces: string[] }) => {
            setDatabases(payload.namespaces)

            if (payload.namespaces.includes('mainsail')) {
                sendObj({ method: 'server.database.get_item', params: { namespace: 'mainsail' }, action: 'getMainsailData' })
            }

            sendObj({ method: 'server.webcams.list', action: 'getWebcamsData' })
        }

        const initPrinter = () => {
            resetData()

            if (state.server.klippy_connected) {
                sendObj({ method: 'printer.objects.list', action: 'getObjectsList' })
            }

            sendObj({ method: 'server.files.list', action: 'getConfigDir', params: { root: 'config' } })
            sendObj({ method: 'server.database.list', action: 'getDatabases' })
        }

        const connectKlippy = () => {
            setKlippyConnected(true)
            initPrinter()
        }

        const disconnectKlippy = () => {
            setKlippyConnected(false)
        }

        const getServerInfo = (payload: { klippy_connected: boolean }) => {
            setKlippyConnected(payload.klippy_connected)
            initPrinter()
        }

        const setSettings = (payload: Record<string, unknown>) => {
            setSettingsState(payload)
            useGuiRemoteprintersStore().updateSettings({ id: state._namespace, values: state.settings })
        }

        // handles the dynamic RPC-result actions this printer's own websocket
        // routes into (getServerInfo/getObjectsList/getData/getMetadataCurrentFile/
        // getConfigDir/getDatabases/getMainsailData/getWebcamsData)
        const handleAction = (action: string, payload: Record<string, unknown>) => {
            switch (action) {
                case 'getServerInfo':
                    return getServerInfo(payload as never)
                case 'getObjectsList':
                    return getObjectsList(payload as never)
                case 'getData':
                    return getData(payload)
                case 'getMetadataCurrentFile':
                    return getMetadataCurrentFile(payload)
                case 'getConfigDir':
                    return getConfigDir(payload as never)
                case 'getDatabases':
                    return getDatabases(payload as never)
                case 'getMainsailData':
                    return getMainsailData(payload as never)
                case 'getWebcamsData':
                    return getWebcamsData(payload as never)
                default:
                    window.console.debug(`[farm] no handler for action "${action}"`, payload)
            }
        }

        const connect = () => {
            setSocketData({ isConnecting: true })
            const socket = new WebSocket(getSocketUrl.value)

            socket.onopen = () => {
                setSocketData({ instance: socket, reconnects: 0, isConnecting: false, isConnected: true })
                sendObj({ method: 'server.info', action: 'getServerInfo' })
            }

            socket.onclose = (e) => {
                if (!e.wasClean && state.socket.reconnects < state.socket.maxReconnects) {
                    setSocketData({ reconnects: state.socket.reconnects + 1 })

                    setTimeout(() => {
                        connect()
                    }, state.socket.reconnectInterval)
                } else {
                    setSocketData({ isConnecting: false, isConnected: false, reconnects: 0 })
                }
            }

            socket.onerror = () => {
                window.console.error('Farm Printer WebSocket Error')
            }

            socket.onmessage = (msg) => {
                const data = JSON.parse(msg.data)
                if (data && data.method) {
                    switch (data.method) {
                        case 'notify_status_update':
                            getData(data.params[0])
                            break
                        case 'notify_klippy_disconnected':
                            disconnectKlippy()
                            break
                        case 'notify_klippy_ready':
                            connectKlippy()
                            break
                    }
                } else if ('result' in data) {
                    const requestIndex = state.socket.wsData.findIndex((item) => item.id === data.id)

                    if (
                        requestIndex !== -1 &&
                        state.socket.wsData[requestIndex].action !== undefined &&
                        state.socket.wsData[requestIndex].action !== ''
                    ) {
                        let result = data.result
                        if (result === 'ok') result = { result: result }
                        if (typeof result === 'string') result = { result: result }

                        const preload: Record<string, unknown> = {}
                        const wsData = state.socket.wsData[requestIndex]
                        if (wsData.actionPreload) Object.assign(preload, wsData.actionPreload)
                        Object.assign(preload, { requestParams: wsData.params })
                        Object.assign(preload, result)

                        if (wsData.action) handleAction(wsData.action, preload)
                    }

                    if (requestIndex !== -1) removeWsData(requestIndex)
                }
            }
        }

        const reconnect = () => {
            if (state.socket.instance) state.socket.instance.close()
            connect()
        }

        return {
            ...toRefs(state),
            getSocketUrl,
            getSocketData,
            getPrinterSocketState,
            isCurrentPrinter,
            getSetting,
            getPrinterName,
            getLogoColor,
            getStatus,
            getCurrentFilename,
            getPrintPercent,
            getPrintPercentByFilepositionRelative,
            getPrintPercentByFilepositionAbsolute,
            getPrintPercentBySlicer,
            getPrintPercentByFilament,
            getImage,
            getThemeFileUrl,
            getLogo,
            getPosition,
            getPrinterPreview,
            estimated_time_file,
            estimated_time_filament,
            estimated_time_slicer,
            estimated_time_eta,
            getPrinterWebcams,
            reset,
            resetData,
            setSocketData,
            setData,
            setSettings,
            connect,
            reconnect,
            sendObj,
        }
    })()
}
