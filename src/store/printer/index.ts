import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'
import type {
    PrinterState,
    PrinterStateExtruder,
    PrinterStateExtruderStepper,
    PrinterStateFan,
    PrinterStateFilamentSensors,
    PrinterStateMiscellaneous,
    PrinterStateMiscellaneousSensor,
    PrinterStateMcu,
    PrinterStateMacro,
    PrinterGetterObject,
    PrinterConfigMcuTempSensor,
    McuTempSensorEntry,
} from '@/store/printer/types'
import { checkKlipperConfigModules } from '@/store/variables'
import { caseInsensitiveSort, formatFrequency, getMacroParams } from '@/plugins/helpers'
import { deepMerge, resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'
import { useServerStore } from '@/store/server'
import { useGuiStore } from '@/store/gui'
import { usePrinterTempHistoryStore } from '@/store/printer/tempHistory'

export const getDefaultState = (): PrinterState => ({})

export function formatEstimatedTimeETA(eta: number, hours12Format: boolean): string {
    const now = new Date()
    const etaDate = new Date(eta)
    if (etaDate <= now) return '--'

    const hours = etaDate.getHours()
    const minutes = etaDate.getMinutes()

    let displayHour = hours
    let amPm = ''

    if (hours12Format) {
        amPm = hours >= 12 ? ' PM' : ' AM'
        displayHour = hours % 12 || 12
    }

    const output = `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}${amPm}`

    const MS_PER_DAY = 86_400_000
    now.setHours(0, 0, 0, 0)
    etaDate.setHours(0, 0, 0, 0)
    const dayDiff = Math.round((etaDate.getTime() - now.getTime()) / MS_PER_DAY)

    if (dayDiff > 0) return `${output} +${dayDiff}`

    return output
}

export const usePrinterStore = defineStore('printer', () => {
    const state = reactive<PrinterState>(getDefaultState())

    // `Object.assign(state, {...actions})` at the bottom of this store (see
    // the return statement) attaches every action/getter as an own property
    // of the *same* `state` object used for Klipper data, since that's what
    // smuggles them past Pinia's setup-store snapshot (see the note below).
    // That means `Object.keys(state)` mixes action names in with real
    // Klipper data keys. `reset()` needs to tell them apart so it only
    // scrubs stale *data* off the exposed store, not the store's own
    // methods - populated once, right before the return statement, with
    // every action/getter name.
    let reservedKeys = new Set<string>()

    // Pinia's setup-store mechanism only exposes the properties present on
    // the object this store's setup() function returns, snapshotted *once*
    // at store-creation time (see `createSetupStore` in pinia's source:
    // `for (const key in setupStore)` runs a single time against whatever
    // `setup()` returned). Since getDefaultState() is `{}` -- Klipper's
    // object model is a fully dynamic bag of keys (`extruder`, `heater_bed`,
    // arbitrary sensor names, ...) that can't be known ahead of time -- no
    // key exists at that snapshot moment. Mutating the `state` reactive
    // object referenced by this closure (via deepMerge/direct assignment)
    // is real and reactive *internally*, but invisible to any caller of
    // `usePrinterStore().someKlipperObject`, because that accessor reads
    // from a *different* object: the one Pinia actually constructed and
    // handed out, populated only from that one-time snapshot.
    // `Object.assign(state, {...actions})` below (the store's return value)
    // only smuggles the *action/getter* methods past that limitation, since
    // those pre-exist as closures at setup time - it does nothing for
    // *data* keys that don't exist until real Moonraker traffic arrives.
    // Bridge every top-level key touched by a mutation onto the live,
    // Pinia-managed store object explicitly instead. Safe to call
    // usePrinterStore() recursively here: by the time any of these run
    // (well after this setup() function has returned), Pinia has already
    // fully constructed and cached the real store instance.
    const bridgeKeys = (keys: Iterable<string>) => {
        const exposedStore = usePrinterStore() as unknown as Record<string, unknown>
        for (const key of keys) {
            exposedStore[key] = (state as Record<string, unknown>)[key]
        }
    }

    // Object-model subscription hooks (Phase 4's window.Mainsail plugin API):
    // Pinia's own $subscribe() watches `pinia.state.value[$id]`, a separate
    // object from the one bridgeKeys() above updates, so it never fires for
    // printer data (see the reactivity note above). Plugins/composables that
    // need to react to real Klipper object-model updates subscribe here
    // instead, fed directly from getData() - the one function every
    // notify_status_update and printer.objects.query response flows through.
    const updateSubscribers = new Set<(printerState: PrinterState) => void>()

    const subscribeToUpdates = (callback: (printerState: PrinterState) => void): (() => void) => {
        updateSubscribers.add(callback)
        return () => updateSubscribers.delete(callback)
    }

    // --- print progress getters ---
    const getPrintPercentByFilepositionRelative = computed<number>(() => {
        if (
            state.current_file?.filename &&
            state.current_file?.gcode_start_byte &&
            state.current_file?.gcode_end_byte &&
            state.current_file.filename === state.print_stats.filename
        ) {
            if (state.virtual_sdcard.file_position <= state.current_file.gcode_start_byte) return 0
            if (state.virtual_sdcard.file_position >= state.current_file.gcode_end_byte) return 1

            const currentPosition = state.virtual_sdcard.file_position - state.current_file.gcode_start_byte
            const maxPosition = state.current_file.gcode_end_byte - state.current_file.gcode_start_byte

            if (currentPosition > 0 && maxPosition > 0) return (1 / maxPosition) * currentPosition
        }

        return state.virtual_sdcard?.progress ?? 0
    })

    const getPrintPercentByFilepositionAbsolute = computed<number>(() => state.virtual_sdcard?.progress ?? 0)

    const getPrintPercentBySlicer = computed<number>(() => state.display_status?.progress ?? 0)

    const getPrintPercentByFilament = computed<number>(() => {
        const filament_used = state.print_stats?.filament_used ?? null
        const filament_total = state.current_file?.filament_total ?? null

        if (filament_used !== null && filament_total !== null) {
            if (filament_total == 0) return 0

            const progress = filament_used / filament_total
            if (progress > 1) return 1

            return progress
        }

        return state.virtual_sdcard?.progress ?? 0
    })

    const getPrintPercent = computed<number>(() => {
        const type = useGuiStore().general?.calcPrintProgress ?? 'file-relative'
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

    const getPrintMaxLayers = computed<number>(() => {
        if ((state.print_stats?.info?.total_layer ?? null) !== null) return state.print_stats.info.total_layer
        if (state.current_file?.layer_count) return state.current_file.layer_count

        if (
            state.current_file?.first_layer_height !== undefined &&
            state.current_file?.layer_height !== undefined &&
            state.current_file?.object_height !== undefined
        ) {
            const max = Math.ceil(
                (state.current_file.object_height - state.current_file.first_layer_height) /
                    state.current_file.layer_height +
                    1
            )
            return max > 0 ? max : 0
        }

        return 0
    })

    const getPrintCurrentLayer = computed<number>(() => {
        if ((state.print_stats?.info?.current_layer ?? null) !== null) return state.print_stats.info.current_layer

        if (
            state.print_stats?.print_duration > 0 &&
            state.current_file?.first_layer_height !== undefined &&
            state.current_file?.layer_height !== undefined
        ) {
            const gcodePositionZ = state.gcode_move?.gcode_position[2] ?? 0
            const current_layer = Math.ceil(
                (gcodePositionZ - state.current_file.first_layer_height) / state.current_file.layer_height + 1
            )

            if (current_layer > getPrintMaxLayers.value) return getPrintMaxLayers.value
            if (current_layer > 0) return current_layer
        }

        return 0
    })

    const getPrinterObjects = (supportedObjects: string[]): PrinterGetterObject[] => {
        const outputObjects: PrinterGetterObject[] = []

        for (const [key, value] of Object.entries(state)) {
            let type = key.substring(0, key.indexOf(' ')).trimEnd()
            let name = key.substring(key.indexOf(' ') + 1).trimStart()

            if (key.indexOf(' ') === -1) type = name = key

            if (supportedObjects.includes(type)) {
                outputObjects.push({
                    name,
                    type,
                    state: { ...value },
                    config: state.configfile?.config[key] ?? {},
                    settings: state.configfile?.settings[key.toLowerCase()] ?? {},
                })
            }
        }

        return outputObjects
    }

    const getMacros = computed<PrinterStateMacro[]>(() => {
        const array: PrinterStateMacro[] = []
        const settings = state.configfile?.settings ?? null
        const printerGcodes = state.gcode?.commands ?? {}

        const prefix = 'gcode_macro '
        const prefixLength = prefix.length

        Object.keys(state)
            .filter((prop) => prop.toLowerCase().startsWith(prefix))
            .forEach((prop) => {
                const name = prop.slice(prefixLength)
                const printerGcode = printerGcodes[name.toUpperCase()] ?? {}

                if (name.startsWith('_')) return

                const propLower = prop.toLowerCase()
                const propSettings = settings[propLower] ?? {}
                if ('rename_existing' in propSettings) return

                const variables = state[prop] ?? {}

                array.push({
                    name,
                    description: printerGcode?.help ?? null,
                    prop: propSettings,
                    params: getMacroParams(propSettings),
                    variables,
                })
            })

        return caseInsensitiveSort(array, 'name')
    })

    const getMacro = (name: string) => {
        const nameLower = name.toLowerCase()
        return getMacros.value.find((macro) => macro.name.toLowerCase() === nameLower)
    }

    const getPartFanSpeed = computed<number>(() => ('fan' in state ? state.fan.speed : 0))

    const getFans = computed<PrinterStateFan[]>(() => {
        const fans: PrinterStateFan[] = []
        const supportedFans = ['temperature_fan', 'controller_fan', 'heater_fan', 'fan_generic', 'fan']
        const objects = getPrinterObjects(supportedFans)

        const controllableFans = ['fan_generic', 'fan']

        // the original Vuex getter called `objects.foreach(...)`, a typo that
        // throws at runtime (Array has no `foreach`); fixed to `forEach` here.
        objects.forEach((object) => {
            fans.push({
                name: object.name,
                type: object.type,
                speed: (object.state.speed as number) ?? 0,
                controllable: controllableFans.includes(object.type),
            })
        })

        return fans.sort((a, b) => {
            if (a.controllable < b.controllable) return 1
            if (a.controllable > b.controllable) return -1

            const nameA = a.name.toUpperCase()
            const nameB = b.name.toUpperCase()

            if (nameA < nameB) return -1
            if (nameA > nameB) return 1

            return 0
        })
    })

    const getMiscellaneous = computed<PrinterStateMiscellaneous[]>(() => {
        const output: PrinterStateMiscellaneous[] = []
        const supportedObjects = [
            'controller_fan',
            'heater_fan',
            'fan_generic',
            'fan',
            'output_pin',
            'pwm_tool',
            'pwm_cycle_time',
        ]

        const controllableFans = ['fan_generic', 'fan']

        for (const [key, value] of Object.entries(state)) {
            const nameSplit = key.split(' ')

            if (supportedObjects.includes(nameSplit[0])) {
                const name = nameSplit.length > 1 ? nameSplit[1] : nameSplit[0]
                if (!name.startsWith('_')) {
                    let controllable = controllableFans.includes(nameSplit[0].toLowerCase())
                    const settings = state.configfile?.settings[key.toLowerCase()] ?? {}
                    const power = 'speed' in value ? value.speed : 'value' in value ? value.value : 0
                    const rpm = 'rpm' in value ? value.rpm : null
                    let pwm = controllable
                    let scale = 1

                    if (nameSplit[0].toLowerCase() === 'fan') scale = 255

                    if (['output_pin', 'pwm_tool', 'pwm_cycle_time'].includes(nameSplit[0])) {
                        controllable = true
                        pwm = false
                        if ('pwm' in settings) pwm = settings?.pwm ?? false
                        if (['pwm_tool', 'pwm_cycle_time'].includes(nameSplit[0])) pwm = true
                        if ('scale' in settings) scale = settings?.scale ?? 1
                    }

                    const tmp: PrinterStateMiscellaneous = {
                        name: name,
                        type: nameSplit[0],
                        power,
                        controllable,
                        pwm,
                        rpm,
                        scale,
                        object: value as Record<string, unknown>,
                        config: settings,
                        off_below: undefined,
                        max_power: undefined,
                    }

                    if (
                        'configfile' in state &&
                        'settings' in state.configfile &&
                        key.toLowerCase() in state.configfile.settings
                    ) {
                        if ('off_below' in settings) tmp.off_below = settings?.off_below ?? 0
                        if ('max_power' in settings) tmp.max_power = settings?.max_power ?? 1
                    }

                    output.push(tmp)
                }
            }
        }

        return output.sort((a, b) => {
            if (a.type === 'fan') return -1
            if (b.type === 'fan') return 1

            if (a.pwm < b.pwm) return 1
            if (a.pwm > b.pwm) return -1

            if (a.controllable < b.controllable) return 1
            if (a.controllable > b.controllable) return -1

            const nameA = a.name.toUpperCase()
            const nameB = b.name.toUpperCase()

            if (nameA < nameB) return -1
            if (nameA > nameB) return 1

            return 0
        })
    })

    const getMiscellaneousSensors = computed<PrinterStateMiscellaneousSensor[]>(() => {
        const output: PrinterStateMiscellaneousSensor[] = []
        const supportedObjects = ['load_cell']

        for (const [key, value] of Object.entries(state)) {
            const nameSplit = key.split(' ')

            if (!supportedObjects.includes(nameSplit[0])) continue
            const name = nameSplit.length > 1 ? nameSplit[1] : nameSplit[0]
            if (name.startsWith('_')) continue

            const basis = {
                name: name,
                type: nameSplit[0],
                value: 'value' in value ? value.value : null,
                unit: 'unit' in value ? value.unit : '',
            }
            if (nameSplit[0] == 'load_cell') {
                output.push({
                    ...basis,
                    value: value.force_g ?? NaN,
                    unit: 'g',
                })
            } else {
                output.push(basis)
            }
        }

        return caseInsensitiveSort(output, 'type', 'unit', 'name')
    })

    const getAvailableHeaters = computed<string[]>(() => state.heaters?.available_heaters ?? [])
    const getAvailableSensors = computed<string[]>(() => state.heaters?.available_sensors ?? [])
    const getAvailableMonitors = computed<string[]>(() => state.heaters?.available_monitors ?? [])

    const getFilamentSensors = computed<PrinterStateFilamentSensors[]>(() => {
        const sensorObjectNames = ['filament_switch_sensor', 'filament_motion_sensor', 'hall_filament_width_sensor']
        const sensors: PrinterStateFilamentSensors[] = []

        for (const [key, value] of Object.entries(state)) {
            const nameSplit = key.split(' ')

            if (sensorObjectNames.includes(nameSplit[0])) {
                sensors.push({
                    type: nameSplit[0],
                    name: nameSplit[1] ?? nameSplit[0],
                    enabled: value.enabled,
                    filament_detected: value.filament_detected,
                    filament_diameter: value.Diameter,
                })
            }
        }

        return caseInsensitiveSort(sensors, 'name')
    })

    const getPrinterConfigObjects = (objectNames: string[]): Record<string, unknown> => {
        const settings = state.configfile?.settings
        if (!settings) return {}

        const output: Record<string, unknown> = {}
        Object.keys(settings).forEach((key) => {
            const keySplits = key.split(' ')

            if (objectNames.includes(keySplits[0])) {
                output[key] = settings[key]
            }
        })

        return output
    }

    const getHostTempSensor = computed(() => {
        const sensorTypes = ['rpi_temperature', 'temperature_host']
        const checkObjects = ['temperature_sensor', 'temperature_fan']
        let output: null | { temperature: string; measured_min_temp: string; measured_max_temp: string } = null

        const objects = getPrinterConfigObjects(checkObjects)
        Object.keys(objects).forEach((key) => {
            const settings = objects[key] as PrinterConfigMcuTempSensor
            const caseKey: string =
                Object.keys(state).find((state_key: string) => state_key.toLowerCase() === key.toLowerCase()) || ''
            if (
                typeof settings.sensor_type === 'string' &&
                sensorTypes.includes(settings.sensor_type) &&
                caseKey in state
            ) {
                const value = state[caseKey]

                output = {
                    temperature: value.temperature?.toFixed(0),
                    measured_min_temp: value.measured_min_temp?.toFixed(1),
                    measured_max_temp: value.measured_max_temp?.toFixed(1),
                }
            }
        })

        return output
    })

    const getMcuTempSensors = computed<McuTempSensorEntry[]>(() => {
        const checkObjects = ['temperature_sensor', 'temperature_fan']
        const output: McuTempSensorEntry[] = []

        const objects = getPrinterConfigObjects(checkObjects)
        Object.keys(objects).forEach((key) => {
            const value = objects[key] as PrinterConfigMcuTempSensor
            const caseKey: string =
                Object.keys(state).find((state_key: string) => state_key.toLowerCase() === key.toLowerCase()) || ''

            if (value.sensor_type === 'temperature_mcu' && typeof value.sensor_mcu === 'string') {
                output.push({
                    key: caseKey,
                    settings: value,
                    object: caseKey in state ? state[caseKey] : {},
                })
            }
        })

        return output
    })

    const getMcuTempSensor = (mcuName: string) => {
        let output: {
            temperature: string
            measured_min_temp: string | null
            measured_max_temp: string | null
        } | null = null

        getMcuTempSensors.value.forEach((sensor) => {
            if (
                typeof sensor.settings.sensor_mcu === 'string' &&
                mcuName.endsWith(sensor.settings.sensor_mcu) &&
                typeof sensor.object.temperature === 'number'
            ) {
                output = {
                    temperature: sensor.object.temperature.toFixed(0),
                    measured_min_temp: sensor.object.measured_min_temp?.toFixed(1) ?? null,
                    measured_max_temp: sensor.object.measured_max_temp?.toFixed(1) ?? null,
                }
            }
        })

        return output
    }

    const getMcus = computed<PrinterStateMcu[]>(() => {
        const mcus: PrinterStateMcu[] = []

        Object.keys(state).forEach((key) => {
            if (key === 'mcu' || key.startsWith('mcu ')) {
                const mcu = state[key]
                let versionOutput = (mcu.mcu_version ?? 'unknown').split('-').slice(0, 4).join('-')

                if ('app' in mcu && mcu.app !== 'Klipper') versionOutput = mcu.app + ' ' + versionOutput

                let load = 0
                if (mcu.last_stats?.mcu_task_avg && mcu.last_stats?.mcu_task_stddev) {
                    load = mcu.last_stats.mcu_task_avg + (3 * mcu.last_stats?.mcu_task_stddev) / 0.0025
                }

                let loadProgressColor = 'primary'
                if (load > 0.95) loadProgressColor = 'error'
                else if (load > 0.8) loadProgressColor = 'warning'

                mcus.push({
                    name: key,
                    mcu_constants: mcu.mcu_constants,
                    last_stats: mcu.last_stats,
                    version: versionOutput,
                    chip: mcu.mcu_constants?.MCU ?? null,
                    freq: mcu.last_stats?.freq ?? null,
                    freqFormat: formatFrequency(mcu.last_stats?.freq ?? 0),
                    awake: ((mcu.last_stats?.mcu_awake ?? 0) / 5).toFixed(2),
                    load: load.toFixed(2),
                    loadPercent: load < 1 ? Math.round(load * 100) : 100,
                    loadProgressColor: loadProgressColor,
                    tempSensor: getMcuTempSensor(key),
                })
            }
        })

        return mcus
    })

    const getPrinterObject = (objectName: string) => (objectName in state ? state[objectName] : null)

    const getExtruders = computed<PrinterStateExtruder[]>(() => {
        const extruders: PrinterStateExtruder[] = []
        if (state.configfile?.settings) {
            Object.keys(state.configfile?.settings)
                .filter((key) => key.match(/^(extruder)\d?$/g))
                .sort()
                .forEach((key: string) => {
                    const extruder = state.configfile?.settings[key]
                    extruders.push({
                        key: key,
                        name: `Extruder ${key == 'extruder' ? '0' : key.replace('extruder', '')}`,
                        filamentDiameter: extruder.filament_diameter,
                        nozzleDiameter: extruder.nozzle_diameter,
                        minExtrudeTemp: extruder.min_extrude_temp,
                        maxExtrudeOnlyDistance: extruder.max_extrude_only_distance,
                    })
                })
        }
        return extruders
    })

    const getExtruderSteppers = computed<PrinterStateExtruderStepper[]>(() => {
        const extruderSteppers: PrinterStateExtruderStepper[] = []
        if (state.configfile?.settings) {
            Object.keys(state.configfile?.settings)
                .filter((key) => key.match(/^extruder_stepper/g))
                .sort()
                .forEach((key: string) => {
                    const extruderStepper = state.configfile?.settings[key]
                    extruderSteppers.push({
                        key: key,
                        name: key.replace('extruder_stepper ', ''),
                        extruder: extruderStepper.extruder,
                    })
                })
        }
        return extruderSteppers
    })

    const getExtrudePossible = computed<boolean>(() => {
        const extruderName = state.toolhead?.extruder ?? 'extruder'
        return state[extruderName]?.can_extrude ?? false
    })

    const getBedMeshProfileName = computed<string>(() => {
        if ('bed_mesh' in state && 'profile_name' in state.bed_mesh) return state.bed_mesh.profile_name
        return ''
    })

    const getMaxTemp = computed<number>(() => {
        let maxtemp = 0

        state.heaters?.available_sensors?.forEach((sensorName: string) => {
            const settings = state.configfile?.settings[sensorName]
            if (
                settings &&
                'max_temp' in settings &&
                Math.round(settings.max_temp) > maxtemp &&
                Math.round(settings.max_temp) < 10000
            )
                maxtemp = Math.round(settings.max_temp)
        })

        return maxtemp > 0 ? maxtemp + 10 : 300
    })

    const existPrinterConfig = computed<boolean>(() => {
        if (state.configfile?.config) return Object.keys(state.configfile.config).length > 0
        return false
    })

    const checkConfig = (configName: string): boolean => {
        if (!state.configfile?.config) return false

        const configObjects = Object.keys(state.configfile.config)
        return configObjects.findIndex((module) => module.toLowerCase() === configName.toLowerCase()) !== -1
    }

    const checkNecessaryConfig = computed<string[]>(() => {
        const missingModules: string[] = []

        checkKlipperConfigModules.forEach((module: string) => {
            if (!checkConfig(module)) missingModules.push(module)
        })

        if (!checkConfig('display') && !checkConfig('display_status')) missingModules.push('display_status')

        return missingModules
    })

    const getEstimatedTimeFile = computed<number>(() => {
        if (
            'print_stats' in state &&
            'print_duration' in state.print_stats &&
            state.print_stats.print_duration > 0 &&
            getPrintPercent.value > 0
        ) {
            return Number(
                (state.print_stats.print_duration / getPrintPercent.value - state.print_stats.print_duration).toFixed(
                    0
                )
            )
        }

        return 0
    })

    const getEstimatedTimeFilament = computed<number>(() => {
        if (
            'print_stats' in state &&
            'print_duration' in state.print_stats &&
            'filament_used' in state.print_stats &&
            'current_file' in state &&
            'filament_total' in state.current_file &&
            state.print_stats.print_duration > 0 &&
            state.current_file.filament_total > 0 &&
            state.current_file.filament_total > state.print_stats.filament_used
        ) {
            return Number(
                (
                    state.print_stats.print_duration /
                        (state.print_stats.filament_used / state.current_file.filament_total) -
                    state.print_stats.print_duration
                ).toFixed(0)
            )
        }

        return 0
    })

    const getEstimatedTimeSlicer = computed<number>(() => {
        if (
            'print_stats' in state &&
            'print_duration' in state.print_stats &&
            'current_file' in state &&
            'estimated_time' in state.current_file &&
            state.print_stats.print_duration > 0 &&
            state.current_file.estimated_time > 0
        ) {
            return Number((state.current_file.estimated_time - state.print_stats.print_duration).toFixed(0))
        }

        return 0
    })

    const getEstimatedTimeAvg = computed<number>(() => {
        let time = 0
        let timeCount = 0
        const guiStore = useGuiStore()
        const boolFileCalc = guiStore.general?.calcEstimateTime?.includes('file') ?? false
        const boolFilamentCalc = guiStore.general?.calcEstimateTime?.includes('filament') ?? false

        if (boolFileCalc && getEstimatedTimeFile.value > 0) {
            time += getEstimatedTimeFile.value
            timeCount++
        }

        if (boolFilamentCalc && getEstimatedTimeFilament.value > 0) {
            time += getEstimatedTimeFilament.value
            timeCount++
        }

        if (time && timeCount) return time / timeCount

        return 0
    })

    const getEstimatedTimeETA = computed<number>(() => {
        let time = 0
        let timeCount = 0
        const guiStore = useGuiStore()
        const boolFileCalc = guiStore.general?.calcEtaTime?.includes('file') ?? false
        const boolFilamentCalc = guiStore.general?.calcEtaTime?.includes('filament') ?? false
        const boolSlicerCalc = guiStore.general?.calcEtaTime?.includes('slicer') ?? false

        if (boolFileCalc && getEstimatedTimeFile.value > 0) {
            time += getEstimatedTimeFile.value
            timeCount++
        }

        if (boolFilamentCalc && getEstimatedTimeFilament.value > 0) {
            time += getEstimatedTimeFilament.value
            timeCount++
        }

        if (boolSlicerCalc && getEstimatedTimeSlicer.value > 0) {
            time += getEstimatedTimeSlicer.value
            timeCount++
        }

        if (time && timeCount) return Math.round(Date.now() + (time / timeCount) * 1000)

        return 0
    })

    const getEstimatedTimeETAFormat = computed<string>(() => {
        const hours12Format = useGuiStore().getHours12Format ?? false
        return formatEstimatedTimeETA(getEstimatedTimeETA.value, hours12Format)
    })

    const getKinematics = computed<string | false>(() => {
        if (!state.configfile?.settings?.printer) return false
        return state.configfile?.settings?.printer.kinematics ?? 'none'
    })

    const existsQGL = computed<boolean>(() => {
        if (!state.configfile?.settings) return false
        return 'quad_gantry_level' in state.configfile.settings
    })

    const existsZtilt = computed<boolean>(() => {
        const commands = state.gcode?.commands ?? null
        if (commands) return 'Z_TILT_ADJUST' in commands

        const settings = state.configfile?.settings ?? null
        if (settings) return 'z_tilt' in settings

        return false
    })

    const existsBedTilt = computed<boolean>(() => {
        if (!state.configfile?.settings) return false
        return 'bed_tilt' in state.configfile.settings
    })

    const existsBedScrews = computed<boolean>(() => {
        if (!state.configfile?.settings) return false
        return 'bed_screws' in state.configfile.settings
    })

    const existsDeltaCalibrate = computed<boolean>(() => {
        if (!state.configfile?.settings) return false
        return 'delta_calibrate' in state.configfile.settings
    })

    const existsScrewsTilt = computed<boolean>(() => {
        if (!state.configfile?.settings) return false
        return 'screws_tilt_adjust' in state.configfile.settings
    })

    const existsFirmwareRetraction = computed<boolean>(() => {
        if (!state.configfile?.settings) return false
        return 'firmware_retraction' in state.configfile.settings
    })

    // --- internal state setters (former mutations) ---
    const setData = (payload: Record<string, unknown>) => {
        deepMerge(state, payload)
        bridgeKeys(Object.keys(payload))
    }

    const setBedMeshProfiles = (payload: unknown) => {
        if ('bed_mesh' in state) state.bed_mesh.profiles = payload
    }

    const clearCurrentFile = () => {
        state.current_file = {}
        bridgeKeys(['current_file'])
    }

    const setEndstopStatus = (payload: Record<string, unknown>) => {
        delete payload.requestParams
        state.endstops = payload
        bridgeKeys(['endstops'])
    }

    const removeBedMeshProfile = (payload: { name: string }) => {
        if ('bed_mesh ' + payload.name in state.configfile.config) {
            Object.assign(state.configfile.config['bed_mesh ' + payload.name], { deleted: true })
        }
    }

    const clearScrewsTiltAdjust = () => {
        state.screws_tilt_adjust.error = false
        state.screws_tilt_adjust.results = {}
    }

    // --- actions ---
    const reset = () => {
        // Snapshot the keys bridged onto the exposed store before wiping
        // `state` back to defaults ({}), so stale Klipper object-model data
        // doesn't linger on `usePrinterStore()` after a disconnect/reconnect.
        // Exclude the store's own action/getter names - they live on `state`
        // too (see `reservedKeys` above), and deleting them from the exposed
        // store bricks every action (getData, getInfo, initGcodes, even
        // reset/init themselves) the moment Klipper reconnects.
        const staleKeys = Object.keys(state).filter((key) => !reservedKeys.has(key))
        resetState(state, getDefaultState)

        const exposedStore = usePrinterStore() as unknown as Record<string, unknown>
        for (const key of staleKeys) {
            if (!(key in state)) delete exposedStore[key]
        }

        usePrinterTempHistoryStore().reset()
        useSocketStore().clearLoadings()
    }

    const init = () => {
        window.console.debug('init printer')
        reset()

        const socketStore = useSocketStore()
        socketStore.addInitModule('printer/info')
        socketStore.addInitModule('printer/initSubscripts')
        socketStore.addInitModule('printer/initTempHistory')
        socketStore.addInitModule('server/gcode_store')

        webSocketClient.emit('printer.info', {}, { action: 'printer/getInfo' })
        webSocketClient.emit('server.gcode_store', {}, { action: 'server/getGcodeStore' })

        initSubscripts()
    }

    const getInfo = (payload: {
        state: string
        state_message: string
        app?: string
        hostname: string
        software_version: string
        cpu_info: unknown
    }) => {
        useServerStore().setData({
            klippy_state: payload.state,
            klippy_message: payload.state_message,
        })

        setData({
            app_name: payload.app ?? null,
            hostname: payload.hostname,
            software_version: payload.software_version,
            cpu_info: payload.cpu_info,
        })

        useSocketStore().removeInitModule('printer/info')
    }

    const initSubscripts = async () => {
        const payload = await webSocketClient.emitAndWait('printer.objects.list')

        let subscripts: Record<string, null> = {}
        const blocklist = ['menu']

        payload.objects.forEach((key: string) => {
            const nameSplit = key.split(' ')

            if (!blocklist.includes(nameSplit[0])) subscripts = { ...subscripts, [key]: null }
        })

        if (Object.keys(subscripts).length > 0) {
            const result = await webSocketClient.emitAndWait('printer.objects.subscribe', { objects: subscripts })

            if ('screws_tilt_adjust' in result.status) {
                const screwsTiltAdjust = result.status.screws_tilt_adjust as { error: boolean; results: object }
                screwsTiltAdjust.error = false
                screwsTiltAdjust.results = {}
            }

            getData(result)

            setTimeout(() => {
                initExtruderCanExtrude()
            }, 200)
        }

        webSocketClient.emit('server.temperature_store', { include_monitors: true }, { action: 'printer/tempHistory/init' })

        useSocketStore().removeInitModule('printer/initSubscripts')
    }

    const getData = (payload: Record<string, unknown> & { status?: Record<string, unknown>; requestParams?: unknown }) => {
        let data = 'status' in payload && payload.status ? payload.status : payload
        if ('requestParams' in data) delete data.requestParams

        if ('webhooks' in data) {
            const webhooks = data.webhooks as { state: string; state_message: string }
            useServerStore().getData({ klippy_state: webhooks.state, klippy_message: webhooks.state_message })
            delete data.webhooks
        }

        if ('bed_mesh' in state && 'bed_mesh' in data) {
            const bedMesh = data.bed_mesh as { profiles?: unknown }
            if ('profiles' in bedMesh) {
                setBedMeshProfiles(bedMesh.profiles)
                delete bedMesh.profiles
            }
        }

        const configfile = data.configfile as { settings?: { printer?: { kinematics?: string } } } | undefined
        if (configfile?.settings?.printer?.kinematics) {
            useGuiStore().updateGcodeviewerCache({ kinematics: configfile.settings.printer.kinematics })
        }

        const toolhead = data.toolhead as { axis_maximum?: unknown; axis_minimum?: unknown } | undefined
        if (toolhead?.axis_maximum) {
            useGuiStore().updateGcodeviewerCache({ axis_maximum: toolhead.axis_maximum })
        }
        if (toolhead?.axis_minimum) {
            useGuiStore().updateGcodeviewerCache({ axis_minimum: toolhead.axis_minimum })
        }

        setData(data)
        updateSubscribers.forEach((callback) => callback(state))
    }

    const initGcodes = async () => {
        const gcodes = await webSocketClient.emitAndWait('printer.objects.query', { objects: { gcode: ['commands'] } })
        setData(gcodes.status)
    }

    const initExtruderCanExtrude = async () => {
        const extruderList: string[] = Object.keys(state).filter((name) => name.startsWith('extruder'))
        const reInitList: { [key: string]: string[] } = {}

        extruderList.forEach((extruderName) => {
            reInitList[extruderName] = ['can_extrude']
        })

        const result = await webSocketClient.emitAndWait('printer.objects.query', { objects: reInitList })
        getData(result.status)
    }

    const getEndstopStatus = (payload: Record<string, unknown>) => {
        setEndstopStatus(payload)
    }

    const sendGcode = (payload: string) => {
        useServerStore().addEvent({ message: payload, type: 'command' })

        if (payload.toLowerCase().trim() === 'm112') {
            webSocketClient.emit('printer.emergency_stop', {}, { loading: 'sendGcode' })
            return
        }

        webSocketClient.emit('printer.gcode.script', { script: payload }, { loading: 'sendGcode' })
    }

    // PrinterState is a fully dynamic bag mirroring the raw Klipper object
    // model -- keys like `configfile`/`heaters`/`toolhead` don't exist until
    // streamed in via setData. `toRefs(state)` snapshots only the keys present
    // at store-creation time (none, since getDefaultState() is `{}`), so it
    // would never expose properties added later. Returning the live reactive
    // `state` object itself (merged with getters/actions) keeps every future
    // key accessible and reactive, mirroring Vuex's dynamic root state bag.
    const storeDefinition = {
        getPrintPercent,
        getPrintPercentByFilepositionRelative,
        getPrintPercentByFilepositionAbsolute,
        getPrintPercentBySlicer,
        getPrintPercentByFilament,
        getPrintMaxLayers,
        getPrintCurrentLayer,
        getPrinterObjects,
        getMacros,
        getMacro,
        getPartFanSpeed,
        getFans,
        getMiscellaneous,
        getMiscellaneousSensors,
        getAvailableHeaters,
        getAvailableSensors,
        getAvailableMonitors,
        getFilamentSensors,
        getMcus,
        getPrinterObject,
        getPrinterConfigObjects,
        getHostTempSensor,
        getMcuTempSensors,
        getMcuTempSensor,
        getExtruders,
        getExtruderSteppers,
        getExtrudePossible,
        getBedMeshProfileName,
        getMaxTemp,
        existPrinterConfig,
        checkConfig,
        checkNecessaryConfig,
        getEstimatedTimeFile,
        getEstimatedTimeFilament,
        getEstimatedTimeSlicer,
        getEstimatedTimeAvg,
        getEstimatedTimeETA,
        getEstimatedTimeETAFormat,
        getKinematics,
        existsQGL,
        existsZtilt,
        existsBedTilt,
        existsBedScrews,
        existsDeltaCalibrate,
        existsScrewsTilt,
        existsFirmwareRetraction,
        setData,
        setBedMeshProfiles,
        clearCurrentFile,
        setEndstopStatus,
        removeBedMeshProfile,
        clearScrewsTiltAdjust,
        subscribeToUpdates,
        reset,
        init,
        getInfo,
        initSubscripts,
        getData,
        initGcodes,
        initExtruderCanExtrude,
        getEndstopStatus,
        sendGcode,
    }

    reservedKeys = new Set(Object.keys(storeDefinition))

    return Object.assign(state, storeDefinition)
})
