import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type { GuiState, GuiStateDashboard, GuiStateDashboardLayoutKey, GuiStateLayoutoption } from '@/store/gui/types'
import type { GuiMacrosStateMacrogroup } from '@/store/gui/macros/types'
import type { GuiPresetsStatePreset } from '@/store/gui/presets/types'
import {
    defaultTheme,
    defaultLogoColor,
    defaultPrimaryColor,
    defaultBigThumbnailBackground,
    defaultMode,
    excludeKeys,
    themeDir,
    allDashboardPanels,
    themes,
} from '@/store/variables'
import type { Theme } from '@/store/types'
import { deletePath, isRecord } from '@/plugins/helpers'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'
import { useServerStore } from '@/store/server'
import { usePrinterStore } from '@/store/printer'
import { useRootStore } from '@/store'
import { loadPlugins } from '@/plugins/mainsail/pluginLoader'

// gui submodules (each is its own Pinia store). In Vuex these were nested
// child modules physically sharing the parent's state tree, so the parent's
// generic setData/saveSetting mutations transparently hydrated/persisted all
// of them from one 'mainsail' DB blob. Now that each is an independent store,
// initStore/saveSetting explicitly route slices to the right store below.
import { useGuiConsoleStore } from '@/store/gui/console'
import { useGuiGcodehistoryStore } from '@/store/gui/gcodehistory'
import { useGuiHeightmapStore } from '@/store/gui/heightmap'
import { useGuiMacrosStore } from '@/store/gui/macros'
import { useGuiMaintenanceStore } from '@/store/gui/maintenance'
import { useGuiMiscellaneousStore } from '@/store/gui/miscellaneous'
import { useGuiNavigationStore } from '@/store/gui/navigation'
import { useGuiNotificationsStore } from '@/store/gui/notifications'
import { useGuiPluginsStore } from '@/store/gui/plugins'
import { useGuiPresetsStore } from '@/store/gui/presets'
import { useGuiRemoteprintersStore } from '@/store/gui/remoteprinters'
import { useGuiWebcamsStore } from '@/store/gui/webcams'

const submoduleStores = {
    console: () => useGuiConsoleStore(),
    gcodehistory: () => useGuiGcodehistoryStore(),
    heightmap: () => useGuiHeightmapStore(),
    macros: () => useGuiMacrosStore(),
    maintenance: () => useGuiMaintenanceStore(),
    miscellaneous: () => useGuiMiscellaneousStore(),
    navigation: () => useGuiNavigationStore(),
    notifications: () => useGuiNotificationsStore(),
    plugins: () => useGuiPluginsStore(),
    presets: () => useGuiPresetsStore(),
    remoteprinters: () => useGuiRemoteprintersStore(),
    webcams: () => useGuiWebcamsStore(),
} as const

type SubmoduleKey = keyof typeof submoduleStores

const isSubmoduleKey = (key: string): key is SubmoduleKey => key in submoduleStores

export const getDefaultState = (): GuiState => ({
    general: {
        printername: '',
        language: 'en',
        dateFormat: null,
        timeFormat: null,
        calcPrintProgress: 'file-relative',
        calcEstimateTime: ['file', 'filament'],
        calcEtaTime: ['file', 'filament', 'slicer'],
    },
    control: {
        style: 'bars',
        actionButton: null,
        hideDuringPrint: false,
        enableXYHoming: false,
        feedrateXY: 100,
        stepsXY: [100, 10, 1],
        feedrateZ: 25,
        offsetsZ: [0.005, 0.01, 0.025, 0.05],
        offsetZSaveOption: null,
        stepsZ: [25, 1, 0.1],
        stepsAll: [0.1, 1, 10, 25, 50, 100],
        stepsCircleXY: [1, 10, 50, 100],
        stepsCircleZ: [0.1, 1, 10, 50],
        selectedCrossStep: null,
        reverseX: false,
        reverseY: false,
        reverseZ: false,
        extruder: {
            feedamount: 25,
            feedamounts: [50, 25, 10, 5, 1],
            feedrate: 5,
            feedrates: [10, 5, 2, 1],
            showEstimatedExtrusionInfo: true,
        },
    },
    dashboard: {
        nonExpandPanels: {
            mobile: [],
            tablet: [],
            desktop: [],
            widescreen: [],
        },
        mobileLayout: [
            { name: 'webcam', visible: false },
            { name: 'toolhead-control', visible: true },
            { name: 'extruder-control', visible: true },
            { name: 'macros', visible: true },
            { name: 'machine-settings', visible: true },
            { name: 'miscellaneous', visible: true },
            { name: 'temperature', visible: true },
            { name: 'miniconsole', visible: false },
        ],
        tabletLayout1: [
            { name: 'webcam', visible: true },
            { name: 'toolhead-control', visible: true },
            { name: 'extruder-control', visible: true },
            { name: 'macros', visible: true },
            { name: 'machine-settings', visible: true },
            { name: 'miscellaneous', visible: true },
        ],
        tabletLayout2: [
            { name: 'temperature', visible: true },
            { name: 'miniconsole', visible: true },
        ],
        desktopLayout1: [
            { name: 'webcam', visible: true },
            { name: 'toolhead-control', visible: true },
            { name: 'extruder-control', visible: true },
            { name: 'macros', visible: true },
            { name: 'machine-settings', visible: true },
            { name: 'miscellaneous', visible: true },
        ],
        desktopLayout2: [
            { name: 'temperature', visible: true },
            { name: 'miniconsole', visible: true },
        ],
        widescreenLayout1: [
            { name: 'toolhead-control', visible: true },
            { name: 'extruder-control', visible: true },
            { name: 'macros', visible: true },
            { name: 'miscellaneous', visible: true },
        ],
        widescreenLayout2: [
            { name: 'temperature', visible: true },
            { name: 'machine-settings', visible: true },
        ],
        widescreenLayout3: [
            { name: 'webcam', visible: true },
            { name: 'miniconsole', visible: true },
        ],
    },
    editor: {
        escToClose: true,
        confirmUnsavedChanges: true,
        klipperDocsTooltips: true,
        klipperRestartMethod: 'FIRMWARE_RESTART',
        tabSize: 2,
        fileStructureSidebar: true,
    },
    gcodeViewer: {
        extruderColors: ['#E76F51FF', '#F4A261FF', '#E9C46AFF', '#2A9D8FFF', '#264653FF'],
        gridColor: '#B3B3B3',
        backgroundColor: '#121212',
        colorMode: 2,
        showAxes: true,
        minFeed: 20,
        maxFeed: 100,
        minFeedColor: '#2196f3',
        maxFeedColor: '#D41216',
        progressColor: '#ECECEC',
        showCursor: true,
        showTravelMoves: false,
        showObjectSelection: false,
        hdRendering: false,
        forceLineRendering: false,
        transparency: false,
        voxelMode: false,
        voxelWidth: 1,
        voxelHeight: 1,
        specularLighting: false,
        klipperCache: {
            kinematics: null,
            axis_minimum: null,
            axis_maximum: null,
        },
        showGCode: false,
        cncMode: false,
    },
    uiSettings: {
        mode: defaultMode,
        theme: defaultTheme,
        logo: defaultLogoColor,
        primary: defaultPrimaryColor,
        displayCancelPrint: false,
        lockSlidersOnTouchDevices: true,
        lockSlidersDelay: 1.5,
        confirmOnEmergencyStop: false,
        confirmOnCoolDown: false,
        confirmOnPowerDeviceChange: false,
        confirmOnCancelJob: false,
        boolBigThumbnail: true,
        bigThumbnailBackground: defaultBigThumbnailBackground,
        boolWideNavDrawer: false,
        boolHideUploadAndPrintButton: false,
        navigationStyle: 'iconsAndText',
        defaultNavigationStateSetting: 'alwaysOpen',
        powerDeviceName: null,
        progressAsFavicon: true,
        hideSaveConfigForBedMash: false,
        disableFanAnimation: false,
        boolManualProbeDialog: true,
        boolBedScrewsDialog: true,
        boolScrewsTiltAdjustDialog: true,
        tempchartHeight: 250,
        hideUpdateWarnings: false,
        printstatusThumbnailZoom: true,
        dashboardFilesLimit: 5,
        dashboardFilesFilter: ['new', 'failed', 'completed'],
        dashboardHistoryLimit: 5,
        hideOtherInstances: false,
    },
    view: {
        afc: {
            hiddenExtruders: [],
            hiddenUnits: [],
            showFilamentName: false,
            showLaneInfinite: true,
            showUnitIcons: true,
            showTd1Color: true,
        },
        blockFileUpload: false,
        configfiles: {
            countPerPage: 10,
            sortBy: 'filename',
            sortDesc: false,
            showHiddenFiles: false,
            hideBackupFiles: false,
            currentPath: '',
            rootPath: 'config',
            selectedFiles: [],
        },
        extruder: {
            showTools: true,
            showExtrusionFactor: true,
            showPressureAdvance: true,
            showFirmwareRetraction: true,
            showExtruderControl: true,
        },
        gcodefiles: {
            countPerPage: 10,
            search: '',
            sortBy: 'modified',
            sortDesc: true,
            showHiddenFiles: false,
            showPrintedFiles: true,
            hideMetadataColumns: ['filament_name', 'filament_type', 'filament_weight_total'],
            orderMetadataColumns: [
                'size',
                'modified',
                'object_height',
                'layer_height',
                'nozzle_diameter',
                'filaments',
                'filament_name',
                'filament_type',
                'filament_total',
                'filament_weight_total',
                'estimated_time',
                'last_print_duration',
                'slicer',
            ],
            currentPath: '',
            selectedFiles: [],
        },
        heightmap: {
            probed: true,
            mesh: false,
            flat: false,
            wireframe: true,
            scaleGradient: false,
            scaleZMax: 0.5,
        },
        history: {
            countPerPage: 10,
            toggleChartCol2: 'chart',
            toggleChartCol3: 'filament_usage',
            hidePrintStatus: [],
            hideColums: [
                'size',
                'modified',
                'end_time',
                'total_duration',
                'filament_total',
                'first_layer_extr_temp',
                'first_layer_bed_temp',
                'first_layer_height',
                'layer_height',
                'object_height',
            ],
            selectedJobs: [],
            showMaintenanceEntries: true,
            showPrintJobs: true,
        },
        jobqueue: {
            countPerPage: 10,
        },
        lockedSliders: [],
        mmu: {
            showClogDetection: true,
            showTtgMap: true,
            showDetails: true,
            largeFilamentStatus: false,
            showLogos: true,
            showName: true,
            showClimate: true,
            showUnavailableSpoolColor: false,
        },
        tempchart: {
            boolTempchart: true,
            hiddenDataset: [],
            hideMcuHostSensors: false,
            hideMonitors: false,
            autoscale: false,
            datasetSettings: {},
        },
        timelapse: {
            countPerPage: 10,
            sortBy: 'modified',
            sortDesc: true,
            showHiddenFiles: false,
            currentPath: 'timelapse',
            selectedFiles: [],
        },
        toolhead: {
            showPosition: true,
            showCoordinates: true,
            showControl: true,
            showZOffset: true,
            showSpeedFactor: true,
        },
        webcam: {
            currentCam: {
                dashboard: 'all',
                page: 'all',
            },
        },
    },
})

export const useGuiStore = defineStore('gui', () => {
    const state = reactive<GuiState>(getDefaultState())

    // --- getters ---
    const theme = computed<string>(() => {
        const themeName = state.uiSettings.theme
        if (themes.findIndex((tmp: Theme) => tmp.name === themeName) === -1) return defaultTheme
        return themeName
    })

    const getTheme = computed<Theme>(() => themes.find((t: Theme) => t.name === theme.value) ?? themes[0])

    const getDatasetValue = (payload: { name: string; type: string }) => {
        if (
            payload.name in state.view.tempchart.datasetSettings &&
            payload.type in state.view.tempchart.datasetSettings[payload.name]
        )
            return state.view.tempchart.datasetSettings[payload.name][payload.type]

        return ['temperature', 'target'].includes(payload.type)
    }

    const getDatasetAdditionalSensorValue = (payload: { name: string; sensor: string }) => {
        const entry = state.view.tempchart.datasetSettings[payload.name] ?? null
        if (entry === null || typeof entry !== 'object' || !('additionalSensors' in entry)) return true

        const sensors = entry.additionalSensors as Record<string, unknown>
        return (sensors[payload.sensor] ?? true) as boolean
    }

    const getPanelExpand = (name: string, viewport: string) => {
        if (viewport in state.dashboard.nonExpandPanels) {
            return !state.dashboard.nonExpandPanels[viewport].includes(name)
        }

        return true
    }

    const getAllPossiblePanels = computed<string[]>(() => {
        let allPanels = [...allDashboardPanels]
        const macrosStore = useGuiMacrosStore()
        const printerStore = usePrinterStore()
        const serverStore = useServerStore()

        if (macrosStore.mode === 'expert') {
            macrosStore.getAllMacrogroups.forEach((group: GuiMacrosStateMacrogroup) => {
                allPanels.push('macrogroup_' + group.id)
            })

            allPanels = allPanels.filter((name) => name !== 'macros')
        }

        if (printerStore.getKinematics === 'none') {
            allPanels = allPanels.filter((name) => !['toolhead-control', 'machine-settings'].includes(name))
        }

        if (printerStore.getExtruders.length < 1) {
            allPanels = allPanels.filter((name) => name !== 'extruder-control')
        }

        const printerTemperatureSensors = printerStore.heaters?.available_sensors ?? []
        if (printerTemperatureSensors.length < 1) {
            allPanels = allPanels.filter((name) => name !== 'temperature')
        }

        if (useGuiWebcamsStore().getWebcams.length === 0) {
            allPanels = allPanels.filter((name) => name !== 'webcam')
        }

        if (!serverStore.components.includes('spoolman')) {
            allPanels = allPanels.filter((name) => name !== 'spoolman')
        }

        if (!printerStore.AFC) {
            allPanels = allPanels.filter((name) => name !== 'afc')
        }

        if (!printerStore.mmu) {
            allPanels = allPanels.filter((name) => name !== 'mmu')
        }

        const ledEffectsPrefix = 'led_effect '
        const existsLedEffects = Object.keys(printerStore).some((name) => name.toLowerCase().startsWith(ledEffectsPrefix))
        if (!existsLedEffects) {
            allPanels = allPanels.filter((name) => name !== 'led-effects')
        }

        return allPanels
    })

    const getAllPanelsFromViewport = (viewport: string): GuiStateLayoutoption[] => {
        let panels: GuiStateLayoutoption[] = []

        const layoutKey = `${viewport}Layout` as keyof GuiStateDashboard
        if (layoutKey in state.dashboard) {
            panels = panels.concat(state.dashboard[layoutKey] as GuiStateLayoutoption[])
        }

        let nr = 1
        while (`${viewport}Layout${nr}` in state.dashboard) {
            const layoutKeyNr = `${viewport}Layout${nr}` as keyof GuiStateDashboard
            panels = panels.concat(state.dashboard[layoutKeyNr] as GuiStateLayoutoption[])
            nr++
        }

        return panels
    }

    const getPanels = (viewport: string, column: number, onlyVisible = false): GuiStateLayoutoption[] => {
        const layoutName = (column ? `${viewport}Layout${column}` : `${viewport}Layout`) as keyof GuiStateDashboard
        let panels = state.dashboard[layoutName] as GuiStateLayoutoption[]

        panels = panels?.filter((element) => element !== null) ?? []
        const allPossiblePanels = getAllPossiblePanels.value

        if (column < 2) {
            const allViewportPanels = getAllPanelsFromViewport(viewport)
            const missingPanels: GuiStateLayoutoption[] = []

            allPossiblePanels.forEach((panelname: string) => {
                if (!allViewportPanels.find((panel) => panel.name === panelname))
                    missingPanels.push({ name: panelname, visible: true })
            })
            panels = panels.concat(missingPanels)
        }

        if (onlyVisible) {
            panels = panels.filter((element) => element.visible)
        }

        const macrosStore = useGuiMacrosStore()
        if (macrosStore.mode === 'simple') {
            panels = panels.filter((element) => !element.name.startsWith('macrogroup_'))
        } else {
            panels = panels.filter((element) => element.name !== 'macros')
            const macrogroups = macrosStore.getAllMacrogroups
            if (macrogroups.length) {
                panels = panels.filter((element) => {
                    if (!element.name.startsWith('macrogroup_')) return true

                    const macrogroupId = element.name.slice(11)
                    return macrogroups.findIndex((macrogroup) => macrogroup.id === macrogroupId) !== -1
                })
            }
        }

        return panels.filter((element) => allPossiblePanels.includes(element.name))
    }

    const getDefaultControlActionButton = computed<'qgl' | 'ztilt' | 'm84'>(() => {
        const printerStore = usePrinterStore()
        if (printerStore.existsQGL) return 'qgl'
        else if (printerStore.existsZtilt) return 'ztilt'

        return 'm84'
    })

    const getHours12Format = computed<boolean>(() => {
        const setting = state.general.timeFormat
        if (setting === '12hours') return true
        if (setting === null) {
            return Intl.DateTimeFormat(navigator.language, { hour: 'numeric' }).resolvedOptions().hour12 ?? false
        }

        return false
    })

    // --- internal state setters (former mutations) ---
    const setData = (payload: Record<string, unknown>) => deepMerge(state, payload)

    const saveSettingLocal = (payload: { name: string; value: unknown }) => {
        const nested = payload.name.split('.').reduceRight<unknown>((value, key) => ({ [key]: value }), payload.value)
        setData(nested as Record<string, unknown>)
    }

    const setHeaterChartVisibility = (payload: { name: string; hidden: boolean }) => {
        const index = state.view.tempchart.hiddenDataset.indexOf(payload.name.toUpperCase())

        if (payload.hidden && index === -1) state.view.tempchart.hiddenDataset.push(payload.name.toUpperCase())
        else if (payload.hidden !== true && index > -1) state.view.tempchart.hiddenDataset.splice(index, 1)
    }

    const setGcodefilesMetadataState = (data: { name: string; value: boolean }) => {
        const array = [...state.view.gcodefiles.hideMetadataColumns]
        const index = array.findIndex((value) => value === data.name)

        if (data.value && index !== -1) array.splice(index, 1)
        else if (!data.value && index === -1) array.push(data.name)

        state.view.gcodefiles.hideMetadataColumns = array
    }

    const setGcodefilesShowHiddenFilesState = (value: boolean) => {
        state.view.gcodefiles.showHiddenFiles = value
    }

    const setCurrentWebcamState = (payload: { page: string; value: unknown }) => {
        ;(state.view.webcam.currentCam as Record<string, unknown>)[payload.page] = payload.value
    }

    const setHistoryColumnsState = (data: { name: string; value: boolean }) => {
        if (data.value && state.view.history.hideColums.includes(data.name)) {
            state.view.history.hideColums.splice(state.view.history.hideColums.indexOf(data.name), 1)
        } else if (!data.value && !state.view.history.hideColums.includes(data.name)) {
            state.view.history.hideColums.push(data.name)
        }
    }

    const setHistoryHidePrintStatus = (payload: string[]) => {
        state.view.history.hidePrintStatus = payload
    }

    const addClosePanel = (payload: { name: string; viewport: string }) => {
        const nonExpandPanels = [...state.dashboard.nonExpandPanels[payload.viewport]]

        if (!nonExpandPanels.includes(payload.name)) {
            nonExpandPanels.push(payload.name)
            state.dashboard.nonExpandPanels[payload.viewport] = nonExpandPanels
        }
    }

    const removeClosePanel = (payload: { name: string; viewport: string }) => {
        const nonExpandPanels = [...state.dashboard.nonExpandPanels[payload.viewport]]
        const index = nonExpandPanels.indexOf(payload.name)
        if (index > -1) {
            nonExpandPanels.splice(index, 1)
            state.dashboard.nonExpandPanels[payload.viewport] = nonExpandPanels
        }
    }

    const deleteFromDashboardLayout = (payload: { layoutname: GuiStateDashboardLayoutKey; index: number }) => {
        const layoutArray = [...(state.dashboard[payload.layoutname] as GuiStateLayoutoption[])]
        layoutArray.splice(payload.index, 1)
        ;(state.dashboard[payload.layoutname] as GuiStateLayoutoption[]) = layoutArray
    }

    const setChartDatasetStatusState = (payload: { objectName: string; dataset: string; value: boolean | string }) => {
        if (!(payload.objectName in state.view.tempchart.datasetSettings)) {
            state.view.tempchart.datasetSettings[payload.objectName] = { [payload.dataset]: payload.value }
            return
        }

        state.view.tempchart.datasetSettings[payload.objectName][payload.dataset] = payload.value
    }

    const setDatasetAdditionalSensorStatusState = (payload: { objectName: string; dataset: string; value: boolean }) => {
        if (!(payload.objectName in state.view.tempchart.datasetSettings)) {
            state.view.tempchart.datasetSettings[payload.objectName] = {
                additionalSensors: { [payload.dataset]: payload.value },
            }
            return
        }

        const entry = state.view.tempchart.datasetSettings[payload.objectName]
        if (!('additionalSensors' in entry)) {
            entry.additionalSensors = { [payload.dataset]: payload.value }
            return
        }
        ;(entry.additionalSensors as Record<string, boolean>)[payload.dataset] = payload.value
    }

    // --- actions ---
    const reset = () => {
        resetState(state, getDefaultState)

        useGuiConsoleStore().reset()
        useGuiGcodehistoryStore().reset()
        useGuiMacrosStore().reset()
        useGuiPresetsStore().reset()
        useGuiWebcamsStore().reset()
    }

    const init = () => {
        window.console.debug('init gui')
        webSocketClient.emit('server.database.get_item', { namespace: 'mainsail' }, { action: 'gui/initStore' })
    }

    const initStore = async (payload: { value: Record<string, unknown> }) => {
        const socketStore = useSocketStore()
        const baseUrl = socketStore.getUrl + '/server/database/item'
        const mainsailUrl = baseUrl + '?namespace=mainsail'
        const data = payload.value

        if ('remoteprinters' in data) {
            const remoteprinters = data.remoteprinters as { printers: Record<string, unknown> }
            if (useRootStore().instancesDB === 'moonraker') useGuiRemoteprintersStore().initStore(remoteprinters.printers as never)
            delete data.remoteprinters
        }

        const view = data.view as { gcodefiles?: { currentPath?: string }; configfiles?: { currentPath?: string } } | undefined
        if (view?.gcodefiles?.currentPath) {
            window.console.debug('remove currentPath from gui namespace')
            await fetch(mainsailUrl + '&key=view.gcodefiles.currentPath', { method: 'DELETE' })
        }

        if (view?.configfiles?.currentPath) {
            window.console.debug('remove currentPath from gui namespace')
            await fetch(mainsailUrl + '&key=view.configfiles.currentPath', { method: 'DELETE' })
        }

        if ('cooldownGcode' in data) {
            window.console.debug('update cooldownGcode to new namespace')
            saveSetting({ name: 'presets.cooldownGcode', value: data.cooldownGcode })

            await fetch(mainsailUrl + '&key=cooldownGcode', { method: 'DELETE' })
            delete data.cooldownGcode
        }

        if ('presets' in data && Array.isArray(data.presets)) {
            window.console.debug('update presets to new namespace')

            data.presets.forEach((preset: GuiPresetsStatePreset) => {
                useGuiPresetsStore().store({ values: preset })
            })

            delete data.presets
        }

        if (isRecord(data.dashboard) && Array.isArray(data.dashboard.nonExpandPanels)) {
            await fetch(mainsailUrl + '&key=dashboard.nonExpandPanels', { method: 'DELETE' })
            updateSettings({ keyName: 'dashboard.nonExpandPanels.widescreen', newVal: data.dashboard.nonExpandPanels })
            delete data.dashboard.nonExpandPanels
        }

        if (isRecord(data.dashboard)) {
            const dashboard = data.dashboard as unknown as GuiStateDashboard
            const layouts: GuiStateDashboardLayoutKey[] = [
                'mobileLayout',
                'tabletLayout1',
                'tabletLayout2',
                'desktopLayout1',
                'desktopLayout2',
                'widescreenLayout1',
                'widescreenLayout2',
                'widescreenLayout3',
            ]

            layouts.forEach((layout) => {
                if (layout in dashboard) {
                    const layoutArray = dashboard[layout] as GuiStateLayoutoption[]
                    const index = layoutArray.findIndex((entry) => entry.name === 'tools')

                    if (index !== -1) {
                        layoutArray[index].name = 'temperature'
                        updateSettings({ keyName: 'dashboard.' + layout, newVal: layoutArray })
                    }
                }
            })
        }

        // route each submodule's persisted slice to its own store; everything
        // else stays on this store's own state (mirrors Vuex's nested-module
        // state placement, where child module state physically lived under
        // the parent's own reactive state tree)
        for (const key of Object.keys(submoduleStores) as SubmoduleKey[]) {
            if (key in data) {
                submoduleStores[key]().setData(data[key] as never)
                delete data[key]
            }
        }

        setData(data)

        // Plugins installed through the Plugins settings tab are persisted
        // in this same 'mainsail' namespace (hydrated by the submodule loop
        // above), so load them here rather than at main.ts's boot-time
        // config.json-driven loadPlugins() call, which runs before this
        // database round-trip resolves. Additive to, not a replacement for,
        // that call - hand-edited config.json plugins keep working.
        const enabledUrls = useGuiPluginsStore()
            .getPlugins.filter((plugin) => plugin.enabled)
            .map((plugin) => plugin.entryUrl)
        if (enabledUrls.length) loadPlugins(enabledUrls)

        socketStore.removeInitModule('gui/init')
    }

    const initDb = async () => {
        const socketStore = useSocketStore()
        const baseUrl = socketStore.getUrl + '/server/database/item'
        const urlDefault = socketStore.getUrl + '/server/files/config/' + themeDir + '/default.json?time=' + Date.now()
        const responseDefault = await fetch(urlDefault)
        let defaults: Record<string, unknown> & { error?: { code?: number } } = {}
        if (responseDefault) {
            defaults = await responseDefault.json()
            if (defaults.error?.code === 404) defaults = {}
        }

        for (const key in defaults) {
            const namespaceDefaults = defaults[key]

            if (['webcams', 'timelapse'].includes(key) && isRecord(namespaceDefaults)) {
                for (const key2 of Object.keys(namespaceDefaults)) {
                    await fetch(baseUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ namespace: key, key: key2, value: namespaceDefaults[key2] }),
                    })
                }
            } else {
                await fetch(baseUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ namespace: 'mainsail', key, value: namespaceDefaults }),
                })
            }
        }

        await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                namespace: 'mainsail',
                key: 'initVersion',
                value: (import.meta.env.PACKAGE_VERSION as string) || '0.0.0',
            }),
        })

        init()
    }

    const saveSetting = (payload: { name: string; value: unknown }) => {
        const [firstSegment, ...rest] = payload.name.split('.')

        if (isSubmoduleKey(firstSegment)) {
            const nested = rest.reduceRight<unknown>((value, key) => ({ [key]: value }), payload.value)
            submoduleStores[firstSegment]().setData(nested as never)
        } else {
            saveSettingLocal(payload)
        }

        if (excludeKeys.includes(payload.name)) return

        webSocketClient.emit('server.database.post_item', {
            namespace: 'mainsail',
            key: payload.name,
            value: payload.value,
        })
    }

    const updateSettings = (payload: { keyName: string; newVal: unknown }) => {
        webSocketClient.emit('server.database.post_item', {
            namespace: 'mainsail',
            key: payload.keyName,
            value: payload.newVal,
        })
    }

    const setGcodefilesMetadata = (data: { name: string; value: boolean }) => {
        setGcodefilesMetadataState(data)
        updateSettings({ keyName: 'view.gcodefiles.hideMetadataColumns', newVal: state.view.gcodefiles.hideMetadataColumns })
    }

    const setGcodefilesShowHiddenFiles = (data: boolean) => {
        setGcodefilesShowHiddenFilesState(data)
        updateSettings({ keyName: 'view.gcodefiles.showHiddenFiles', newVal: state.view.gcodefiles.showHiddenFiles })
    }

    const setCurrentWebcam = (payload: { page: string; value: unknown }) => {
        setCurrentWebcamState(payload)
        updateSettings({ keyName: 'view.webcam.currentCam', newVal: state.view.webcam.currentCam })
    }

    const setTempchartDatasetAdditionalSensorSetting = (payload: { objectName: string; dataset: string; value: boolean }) => {
        setDatasetAdditionalSensorStatusState(payload)
        updateSettings({ keyName: 'view.tempchart', newVal: state.view.tempchart })
    }

    const resetMoonrakerDB = async (payload: string[]) => {
        const socketStore = useSocketStore()
        const baseUrl = socketStore.getUrl + '/server/database/item'
        const urlDefault = socketStore.getUrl + '/server/files/config/' + themeDir + '/default.json?time=' + Date.now()

        let defaults: Record<string, unknown> = {}
        try {
            defaults = await fetch(urlDefault).then((result) => result.json())
        } catch (error) {
            window.console.error('Error while fetching/parsing default.json', error)
        }

        for (const key of payload) {
            if (['maintenance', 'timelapse', 'webcams'].includes(key)) {
                const url = baseUrl + '?namespace=' + key

                const response = await fetch(url)
                const objects = await response.json()
                if (objects?.result?.value) {
                    for (const item of Object.keys(objects?.result?.value)) {
                        await fetch(url + '&key=' + item, { method: 'DELETE' })
                    }
                }

                if (key in defaults) {
                    const namespaceDefaults = defaults[key]
                    if (isRecord(namespaceDefaults)) {
                        for (const key2 of Object.keys(namespaceDefaults)) {
                            await fetch(baseUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ namespace: key, key: key2, value: namespaceDefaults[key2] }),
                            })
                        }
                    }
                }
            } else if (key === 'history_jobs') {
                await fetch(socketStore.getUrl + '/server/history/job?all=true', { method: 'DELETE' })
            } else if (key === 'history_totals') {
                await fetch(socketStore.getUrl + '/server/history/reset_totals', { method: 'POST' })
            } else {
                await fetch(socketStore.getUrl + '/server/database/item?namespace=mainsail&key=' + key, { method: 'DELETE' })

                if (key in defaults) {
                    await fetch(baseUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ namespace: 'mainsail', key, value: defaults[key] }),
                    })
                }
            }
        }

        window.location.reload()
    }

    const backupMoonrakerDB = async (payload: string[]) => {
        const socketStore = useSocketStore()
        const backup: Record<string, Record<string, unknown>> = {}

        const responseMainsail = await fetch(socketStore.getUrl + '/server/database/item?namespace=mainsail')
        const objectsMainsail = await responseMainsail.json()
        const mainsailDb = (objectsMainsail?.result?.value ?? {}) as Record<string, unknown>

        for (const key of payload) {
            if (['timelapse', 'webcams'].includes(key)) {
                const url = socketStore.getUrl + '/server/database/item?namespace=' + key

                const response = await fetch(url)
                const objects = await response.json()
                if (isRecord(objects?.result?.value)) backup[key] = { ...objects?.result?.value }
            } else {
                const mainsailValue = mainsailDb[key]
                if (!isRecord(mainsailValue)) continue

                backup[key] = { ...mainsailValue }

                excludeKeys
                    .filter((excludeKey) => excludeKey.startsWith(key + '.'))
                    .forEach((excludeKey) => {
                        deletePath(backup[key], excludeKey.substring(key.length + 1))
                    })
            }
        }

        const element = document.createElement('a')
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup)))
        element.setAttribute('download', 'backup-mainsail.json')
        element.style.display = 'none'
        document.body.appendChild(element)
        element.click()

        document.body.removeChild(element)
    }

    const restoreMoonrakerDB = async (payload: { dbCheckboxes: string[]; restoreObjects: Record<string, Record<string, unknown>> }) => {
        const socketStore = useSocketStore()
        const baseUrl = socketStore.getUrl + '/server/database/item'
        const mainsailUrl = baseUrl + '?namespace=mainsail'
        const responseNamespaces = await fetch(socketStore.getUrl + '/server/database/list')
        const objectsNamespaces = await responseNamespaces.json()
        const namespacesArray = objectsNamespaces?.result?.namespaces ?? []
        let mainsailArray: string[] = []

        if (namespacesArray.includes('mainsail')) {
            const responseMainsail = await fetch(mainsailUrl)
            const objectsMainsail = await responseMainsail.json()
            mainsailArray = Object.keys(objectsMainsail?.result?.value ?? {})
        }

        for (const key of payload.dbCheckboxes) {
            if (['timelapse', 'webcams'].includes(key)) {
                if (namespacesArray.includes(key)) {
                    const url = baseUrl + '?namespace=' + key
                    const response = await fetch(url)
                    const objects = await response.json()
                    if (objects?.result?.value) {
                        for (const item of Object.keys(objects?.result?.value)) {
                            await fetch(url + '&key=' + item, { method: 'DELETE' })
                        }
                    }
                }

                for (const key2 of Object.keys(payload.restoreObjects[key])) {
                    const value = payload.restoreObjects[key][key2]
                    await fetch(baseUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ namespace: key, key: key2, value }),
                    })
                }
            } else {
                if (mainsailArray.includes(key)) await fetch(mainsailUrl + '&key=' + key, { method: 'DELETE' })
                await fetch(mainsailUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ namespace: 'mainsail', key, value: payload.restoreObjects[key] }),
                })
            }
        }

        window.location.reload()
    }

    const setHistoryColumns = (data: { name: string; value: boolean }) => {
        setHistoryColumnsState(data)
        updateSettings({ keyName: 'view.history', newVal: state.view.history })
    }

    const toggleStatusInHistoryList = (name: string) => {
        const array: string[] = [...state.view.history.hidePrintStatus]
        const index = array.indexOf(name)

        if (index === -1) array.push(name)
        else array.splice(index, 1)

        setHistoryHidePrintStatus(array)
        updateSettings({ keyName: 'view.history.hidePrintStatus', newVal: array })
    }

    const saveExpandPanel = (payload: { name: string; viewport: string; value: boolean }) => {
        if (!payload.value) addClosePanel({ name: payload.name, viewport: payload.viewport })
        else removeClosePanel({ name: payload.name, viewport: payload.viewport })

        updateSettings({
            keyName: `dashboard.nonExpandPanels.${payload.viewport}`,
            newVal: state.dashboard.nonExpandPanels[payload.viewport],
        })
    }

    const resetLayout = (name: GuiStateDashboardLayoutKey) => {
        const defaultState = getDefaultState()
        const newVal = defaultState.dashboard[name]

        saveSetting({ name: 'dashboard.' + name, value: newVal })
    }

    const updateGcodeviewerCache = (payload: Record<string, unknown>) => {
        const klipperCache = state.gcodeViewer.klipperCache as Record<string, unknown>

        Object.keys(payload).forEach((key) => {
            const value = payload[key]
            const oldValue = key in klipperCache ? klipperCache[key] : null

            if (JSON.stringify(value) !== JSON.stringify(oldValue)) saveSetting({ name: `gcodeViewer.klipperCache.${key}`, value })
        })
    }

    const announcementDismissFlag = (payload: unknown) => {
        window.console.log(payload)
    }

    const setChartDatasetStatus = (payload: { objectName: string; dataset: string; value: boolean }) => {
        setChartDatasetStatusState(payload)
        updateSettings({ keyName: 'view.tempchart.datasetSettings', newVal: state.view.tempchart.datasetSettings })
    }

    const setDatasetAdditionalSensorStatus = (payload: { objectName: string; dataset: string; value: boolean }) => {
        setDatasetAdditionalSensorStatusState(payload)
        updateSettings({ keyName: 'view.tempchart.datasetSettings', newVal: state.view.tempchart.datasetSettings })
    }

    const setChartColor = (payload: { objectName: string; value: string }) => {
        setChartDatasetStatusState({ objectName: payload.objectName, dataset: 'color', value: payload.value })
        updateSettings({ keyName: 'view.tempchart.datasetSettings', newVal: state.view.tempchart.datasetSettings })
    }

    return {
        ...toRefs(state),
        theme,
        getTheme,
        getDatasetValue,
        getDatasetAdditionalSensorValue,
        getPanelExpand,
        getAllPossiblePanels,
        getAllPanelsFromViewport,
        getPanels,
        getDefaultControlActionButton,
        getHours12Format,
        setData,
        setHeaterChartVisibility,
        deleteFromDashboardLayout,
        reset,
        init,
        initStore,
        initDb,
        saveSetting,
        updateSettings,
        setGcodefilesMetadata,
        setGcodefilesShowHiddenFiles,
        setCurrentWebcam,
        setTempchartDatasetAdditionalSensorSetting,
        resetMoonrakerDB,
        backupMoonrakerDB,
        restoreMoonrakerDB,
        setHistoryColumns,
        toggleStatusInHistoryList,
        saveExpandPanel,
        resetLayout,
        updateGcodeviewerCache,
        announcementDismissFlag,
        setChartDatasetStatus,
        setDatasetAdditionalSensorStatus,
        setChartColor,
    }
})
