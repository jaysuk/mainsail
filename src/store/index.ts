import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import i18n from '@/plugins/i18n'
import router from '@/plugins/router'
import semver from 'semver'
import type { ConfigJson, ConfigJsonInstance, RootState, RootStateDependency } from '@/store/types'
import { minKlipperVersion, minMoonrakerVersion } from '@/store/variables'
import { useSocketStore } from '@/store/socket'
import { useServerStore } from '@/store/server'
import { usePrinterStore } from '@/store/printer'
import { useFilesStore } from '@/store/files'
import { useGuiStore } from '@/store/gui'
import { useFarmStore } from '@/store/farm'

const t = i18n.global.t

export const getDefaultState = (): RootState => ({
    packageVersion: (import.meta.env.PACKAGE_VERSION as string) || '0.0.0',
    debugMode: (import.meta.env.VUE_APP_DEBUG_MODE as boolean) || false,
    naviDrawer: null,
    instancesDB: 'moonraker',
    configInstances: [],
})

export const useRootStore = defineStore('root', () => {
    const state = reactive<RootState>(getDefaultState())

    // --- getters ---
    const getVersion = computed(() => state.packageVersion)

    const getTitle = computed<string>(() => {
        const socketStore = useSocketStore()
        const serverStore = useServerStore()
        const printerStore = usePrinterStore()
        const guiStore = useGuiStore()

        if (!socketStore.isConnected) return 'Mainsail'
        if (serverStore.klippy_state !== 'ready') return t('App.Titles.Error')

        let printer_state = (printerStore.print_stats?.state ?? '') as string
        if (printerStore['gcode_macro TIMELAPSE_TAKE_FRAME']?.is_paused && printer_state === 'paused') printer_state = 'printing'

        if (printer_state === 'paused') return t('App.Titles.Pause')

        if (printerStore.print_stats?.state === 'complete') {
            let output = t('App.Titles.Complete', { filename: printerStore.print_stats.filename })
            if (guiStore.general.printername) output += `- ${guiStore.general.printername}`
            return output
        }

        if (printer_state === 'printing') {
            const eta = printerStore.getEstimatedTimeETAFormat
            const percent = Math.floor(printerStore.getPrintPercent * 100)

            if (eta !== '--') {
                let output = t('App.Titles.PrintingETA', { percent, filename: printerStore.print_stats?.filename, eta })
                if (guiStore.general.printername) output += `- ${guiStore.general.printername}`
                return output
            }

            let output = t('App.Titles.Printing', { percent, filename: printerStore.print_stats?.filename })
            if (guiStore.general.printername) output += `- ${guiStore.general.printername}`
            return output
        }

        return guiStore.general.printername || printerStore.hostname || 'Mainsail'
    })

    const getDependencies = computed<RootStateDependency[]>(() => {
        const printerStore = usePrinterStore()
        const serverStore = useServerStore()
        const dependencies: RootStateDependency[] = []

        const klipperVersion = printerStore.software_version ?? ''
        const klipperVersionSplits = klipperVersion.split('-')
        const klipperVersionRelease = klipperVersionSplits[0] ?? ''
        const klipperVersionBuild = parseInt(klipperVersionSplits[1] ?? 0)

        const minKlipperVersionSplits = minKlipperVersion.split('-')
        const minKlipperVersionRelease = minKlipperVersionSplits[0] ?? ''
        const minKlipperVersionBuild = parseInt(minKlipperVersionSplits[1] ?? 0)

        if (
            semver.valid(klipperVersionRelease) &&
            (semver.gt(minKlipperVersionRelease, klipperVersionRelease) ||
                (semver.eq(minKlipperVersionRelease, klipperVersionRelease) && klipperVersionBuild < minKlipperVersionBuild))
        ) {
            dependencies.push({ serviceName: 'Klipper', installedVersion: klipperVersion, neededVersion: minKlipperVersion })
        }

        const moonrakerVersion = serverStore.moonraker_version ?? ''
        const moonrakerVersionSplits = moonrakerVersion.split('-')
        const moonrakerVersionRelease = moonrakerVersionSplits[0] ?? ''
        const moonrakerVersionBuild = parseInt(moonrakerVersionSplits[1] ?? 0)

        const minMoonrakerVersionSplits = minMoonrakerVersion.split('-')
        const minMoonrakerVersionRelease = minMoonrakerVersionSplits[0] ?? ''
        const minMoonrakerVersionBuild = parseInt(minMoonrakerVersionSplits[1] ?? 0)

        if (
            semver.valid(moonrakerVersionRelease) &&
            (semver.gt(minMoonrakerVersionRelease, moonrakerVersionRelease) ||
                (semver.eq(minMoonrakerVersionRelease, moonrakerVersionRelease) && moonrakerVersionBuild < minMoonrakerVersionBuild))
        ) {
            dependencies.push({ serviceName: 'Moonraker', installedVersion: moonrakerVersion, neededVersion: minMoonrakerVersion })
        }

        return dependencies
    })

    // --- actions ---
    const setNaviDrawer = (payload: boolean | null) => {
        state.naviDrawer = payload
        localStorage.setItem('naviDrawer', String(payload))
    }

    const setInstancesDB = (payload: RootState['instancesDB']) => {
        state.instancesDB = payload
    }

    const setConfigInstances = (payload: ConfigJsonInstance[]) => {
        state.configInstances = payload
    }

    const switchToDashboard = () => {
        if (router.currentRoute.value.fullPath !== '/') router.push('/')
    }

    const changePrinter = (payload: { printer: string }) => {
        useFilesStore().reset()
        useGuiStore().reset()
        usePrinterStore().reset()
        useServerStore().reset()
        useSocketStore().reset()

        const printerSocket = useFarmStore().getPrinterSocketState(payload.printer)

        useSocketStore().setSocket({
            hostname: printerSocket.hostname,
            port: printerSocket.port,
            path: printerSocket.path,
        })
    }

    // NOTE: preserves the original Vuex behavior exactly, including a likely
    // pre-existing bug -- the last branch sets `route_prefix` on the socket
    // store, but SocketState's actual URL-building field is `path`, so a
    // custom `path` in config.json may never reach the getUrl()/websocket-URL
    // getters. Flagged rather than silently changed since it affects a real,
    // user-facing configuration setting (reverse-proxy path prefixes).
    const importConfigJson = async (payload: ConfigJson) => {
        type RootStateInstancesDbType = 'moonraker' | 'browser' | 'json'
        let instancesDB: RootStateInstancesDbType = payload.instancesDB ?? 'moonraker'
        if (import.meta.env.VUE_APP_INSTANCES_DB) instancesDB = import.meta.env.VUE_APP_INSTANCES_DB as RootStateInstancesDbType

        if (instancesDB !== 'moonraker') {
            setInstancesDB(instancesDB)

            if (instancesDB === 'json' && 'instances' in payload && Array.isArray(payload.instances) && payload.instances.length) {
                setConfigInstances(payload.instances)
            }

            return
        }

        const socketStore = useSocketStore()
        if (payload.hostname) socketStore.setData({ hostname: payload.hostname })
        if (payload.port) socketStore.setData({ port: parseInt(payload.port.toString()) })
        if (payload.path) socketStore.setData({ route_prefix: payload.path } as never)
    }

    return {
        ...toRefs(state),
        getVersion,
        getTitle,
        getDependencies,
        setNaviDrawer,
        setInstancesDB,
        setConfigInstances,
        switchToDashboard,
        changePrinter,
        importConfigJson,
    }
})
