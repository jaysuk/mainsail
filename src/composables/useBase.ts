import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useSocketStore } from '@/store/socket'
import { useServerStore } from '@/store/server'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'
import { useServerPowerStore } from '@/store/server/power'
import { useRootStore } from '@/store'
import { klipperRepos } from '@/store/variables'

/**
 * Replaces the Vue 2 `BaseMixin` class component. Ported near-verbatim;
 * see the original at src/components/mixins/base.ts in git history.
 */
export function useBase() {
    const socketStore = useSocketStore()
    const serverStore = useServerStore()
    const printerStore = usePrinterStore()
    const guiStore = useGuiStore()
    const rootStore = useRootStore()
    const powerStore = useServerPowerStore()
    const display = useDisplay()

    const isMobile = computed(() => display.mobile.value)
    const isTablet = computed(() => display.smAndUp.value && !isDesktop.value && !isWidescreen.value)
    const isDesktop = computed(() => display.lgAndUp.value && !isWidescreen.value)
    const isWidescreen = computed(() => display.xl.value)
    const viewport = computed(() => {
        if (isMobile.value) return 'mobile'
        else if (isTablet.value) return 'tablet'
        else if (isDesktop.value) return 'desktop'
        else return 'widescreen'
    })

    const isTouchDevice = computed(
        () => 'ontouchstart' in window || (navigator.maxTouchPoints > 0 && navigator.maxTouchPoints !== 256)
    )

    const isIOS = computed(
        () =>
            !!(
                navigator.userAgent.match(/(iPad|iPhone|iPod)/) ||
                (navigator.platform === 'MacIntel' && 'standalone' in navigator)
            )
    )

    const apiUrl = computed(() => socketStore.getUrl)
    const hostUrl = computed(() => socketStore.getHostUrl)
    const hostPort = computed(() => parseInt(String(socketStore.port ?? 80)))
    const instancesDB = computed(() => rootStore.instancesDB ?? 'moonraker')
    const socketIsConnected = computed(() => socketStore.isConnected ?? false)
    const guiIsReady = computed(() => socketStore.initializationList.length === 0)
    const klippyIsConnected = computed(() => serverStore.klippy_connected ?? false)
    const klipperState = computed(() => (!klippyIsConnected.value ? 'disconnected' : (serverStore.klippy_state ?? '')))
    const klipperReadyForGui = computed(() => socketIsConnected.value && klipperState.value === 'ready')
    const klipperAppName = computed(() => printerStore.app_name ?? 'Klipper')

    const klipperConfigReference = computed(() => {
        const currentLanguage = guiStore.general.language ?? 'en'
        const klipperRepo = klipperRepos[klipperAppName.value] ?? klipperRepos.Klipper

        let url = klipperRepo.url
        if (klipperRepo.docsLanguages?.includes(currentLanguage)) {
            url += `${currentLanguage}/`
        }

        url += 'Config_Reference.html'

        return url
    })

    const printer_state = computed<string>(() => {
        const state = printerStore.print_stats?.state ?? printerStore.idle_timeout?.state ?? ''
        const timelapse_pause = printerStore['gcode_macro TIMELAPSE_TAKE_FRAME']?.is_paused ?? false
        return state === 'paused' && timelapse_pause ? 'printing' : state
    })

    const printerIsPrinting = computed(() => klipperReadyForGui.value && ['printing', 'paused'].includes(printer_state.value))
    const printerIsPrintingOnly = computed(() => klipperReadyForGui.value && printer_state.value === 'printing')

    const printerPowerDevice = computed<string>(() => {
        const deviceName = guiStore.uiSettings.powerDeviceName ?? null
        if (deviceName !== null) return deviceName

        const devices = powerStore.getDevices ?? []
        return devices.find((device) => device.device.toLowerCase() === 'printer')?.device ?? 'printer'
    })

    const isPrinterPowerOff = computed(() => {
        const devices = powerStore.getDevices ?? []
        if (devices.length === 0) return false

        const device = devices.find((device) => device.device === printerPowerDevice.value)
        if (!device) return false

        if (device.status !== 'off') return false

        return !klippyIsConnected.value
    })

    const loadings = computed(() => socketStore.loadings ?? [])
    const moonrakerComponents = computed(() => serverStore.components ?? [])

    const existGcodesRootDirectory = computed(() => {
        const roots = serverStore.registered_directories
        return roots.findIndex((root) => root === 'gcodes') >= 0
    })

    const spoolManagerUrl = computed<string | undefined>(() => {
        const baseurl = serverStore.config.config?.spoolman?.server ?? undefined
        if (!baseurl || typeof baseurl !== 'string') return undefined

        try {
            const url = new URL(baseurl)
            if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
                url.hostname = socketStore.hostname
            }

            return url.toString()
        } catch {
            window.console.warn('[Spoolman]: SpoolManager URL is invalid:', baseurl)
            return undefined
        }
    })

    const formatTimeOptions = computed<Intl.DateTimeFormatOptions>(() => {
        switch (guiStore.general.timeFormat) {
            case '24hours':
                return { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
            case '12hours':
                return { hour: '2-digit', minute: '2-digit', hourCycle: 'h12' }
            default:
                return { timeStyle: 'short' }
        }
    })

    const formatTimeWithSecondsOptions = computed<Intl.DateTimeFormatOptions>(() => {
        switch (guiStore.general.timeFormat) {
            case '24hours':
                return { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }
            case '12hours':
                return { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h12' }
            default:
                return { timeStyle: 'short' }
        }
    })

    const browserLocale = computed(() => navigator.language)
    const hours12Format = computed(() => guiStore.getHours12Format)

    const formatDate = (value: number | Date, format: string | null = null): string => {
        if (format === null) format = guiStore.general.dateFormat
        let tmp: Date | null = null

        try {
            tmp = value instanceof Date ? value : new Date(value)
        } catch {
            return 'UNKNOWN'
        }

        if (format === null) return tmp.toLocaleDateString(browserLocale.value, { dateStyle: 'medium' })
        if (format === 'iso') return tmp.toISOString().split('T')[0]
        if (format === 'short') return tmp.toLocaleDateString(browserLocale.value, { dateStyle: 'short' })

        let delimiter = '/'
        if (format.includes('-')) delimiter = '-'
        if (format.includes('.')) delimiter = '.'
        if (format.includes('. ')) delimiter = '. '

        const splits = format.split(delimiter)
        const output: string[] = []

        splits.forEach((part) => {
            // replace all dots is needed for kr-KO, because it ends only with a dot and not with '. '
            part = part.trim().toLowerCase().replaceAll('.', '')

            switch (part) {
                case 'dd':
                    output.push(tmp?.getDate().toString().padStart(2, '0') ?? '00')
                    break
                case 'd':
                    output.push(`${tmp?.getDate()}`)
                    break
                case 'mm':
                    output.push(((tmp?.getMonth() ?? 0) + 1).toString().padStart(2, '0'))
                    break
                case 'm':
                    output.push(`${(tmp?.getMonth() ?? 0) + 1}`)
                    break
                case 'yyyy':
                    output.push(`${tmp?.getFullYear()}`)
                    break
                case 'yy':
                    output.push(`${tmp?.getFullYear().toString().slice(-2)}`)
                    break
                default:
                    output.push(part)
            }
        })

        if (format.endsWith('.')) return output.join(delimiter) + '.'

        return output.join(delimiter)
    }

    const formatTime = (value: number | Date, boolSeconds = false): string => {
        let tmp

        try {
            tmp = value instanceof Date ? value : new Date(value)
        } catch {
            return 'UNKNOWN'
        }

        if (boolSeconds) return tmp.toLocaleTimeString(browserLocale.value, formatTimeWithSecondsOptions.value)

        return tmp.toLocaleTimeString(browserLocale.value, formatTimeOptions.value)
    }

    const formatDateTime = (value: number, boolSeconds = false): string => {
        return `${formatDate(value)} ${formatTime(value, boolSeconds)}`
    }

    return {
        apiUrl,
        hostUrl,
        hostPort,
        instancesDB,
        socketIsConnected,
        guiIsReady,
        isMobile,
        isTablet,
        isDesktop,
        isWidescreen,
        viewport,
        isTouchDevice,
        isIOS,
        klippyIsConnected,
        klipperState,
        klipperReadyForGui,
        klipperAppName,
        klipperConfigReference,
        printer_state,
        printerIsPrinting,
        printerIsPrintingOnly,
        printerPowerDevice,
        isPrinterPowerOff,
        loadings,
        moonrakerComponents,
        existGcodesRootDirectory,
        spoolManagerUrl,
        formatTimeOptions,
        formatTimeWithSecondsOptions,
        browserLocale,
        hours12Format,
        formatDate,
        formatTime,
        formatDateTime,
    }
}
