import { computed } from 'vue'
import { W3C_COLORS } from '@/plugins/w3c'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useBase } from '@/composables/useBase'

export type MmuEspoolerState = 'rewind' | 'assist' | 'off'

export interface Mmu {
    enabled: boolean
    num_gates: number
    is_homed: boolean
    is_locked: boolean
    is_paused: boolean
    is_in_print: boolean
    print_state: string
    unit: number
    tool: number
    gate: number
    active_filament: {
        filament_name: string
        material: string
        color: string
        spool_id: number
        temperature: number
    }
    num_toolchanges: number
    last_tool: number
    next_tool: number
    toolchange_purge_volume: number
    last_toolchange: string
    runout: boolean
    operation: string
    filament: string
    filament_position: number
    filament_pos: number
    filament_direction: typeof DIRECTION_LOAD | typeof DIRECTION_UNKNOWN | typeof DIRECTION_UNLOAD
    pending_spool_id: number
    ttg_map: number[]
    endless_spool_groups: number[]
    gate_status: number[]
    gate_filament_name: string[]
    gate_material: string[]
    gate_color: string[]
    gate_temperature: number[]
    gate_spool_id: number[]
    gate_speed_override: number[]
    gate_color_rgb: number[][]
    slicer_color_rgb: number[][]
    tool_extrusion_multipliers: number[]
    tool_speed_multipliers: number[]
    slicer_tool_map: MmuSlicerToolMap
    action:
        | typeof ACTION_IDLE
        | typeof ACTION_LOADING
        | typeof ACTION_LOADING_EXTRUDER
        | typeof ACTION_UNLOADING
        | typeof ACTION_UNLOADING_EXTRUDER
        | typeof ACTION_FORMING_TIP
        | typeof ACTION_CUTTING_TIP
        | typeof ACTION_HEATING
        | typeof ACTION_CHECKING
        | typeof ACTION_HOMING
        | typeof ACTION_SELECTING
        | typeof ACTION_CUTTING_FILAMENT
        | typeof ACTION_PURGING
    has_bypass: boolean
    sync_drive: boolean
    sync_feedback_bias_modelled: number
    sync_feedback_bias_raw: number
    sync_feedback_enabled: boolean
    sync_feedback_state: string
    sync_feedback_flow_rate: number
    flowguard?: {
        trigger: string
        reason: string
        level: number
        max_clog: number
        max_tangle: number
        active: boolean
        enabled: boolean
    }
    clog_detection: number
    clog_detection_enabled: number
    endless_spool: number
    endless_spool_enabled: number
    print_start_detection: number
    reason_for_pause: string
    extruder_filament_remaining: number
    spoolman_support: 'off' | 'readonly' | 'push' | 'pull'
    bowden_progress: number
    espooler_active: MmuEspoolerState
    drying_state: MmuDryingState[]
    sensors: {
        mmu_pre_gate?: boolean
        mmu_gear?: boolean
        mmu_gate?: boolean
        filament_compression?: boolean
        filament_proportional?: boolean
        filament_tension?: boolean
        extruder?: boolean
        toolhead?: boolean
    }
    servo?: 'Up' | 'Down' | 'Move' | 'Unknown'
    grip?: 'Gripped' | 'Released' | 'Unknown'
    encoder?: {
        enabled: boolean
        encoder_pos: number
        flow_rate: number
        detection_mode: number
        desired_headroom: number
        detection_length: number
        headroom: number
        min_headroom: number
    }
    espooler?: MmuEspoolerState[]
}

export interface MmuMachine {
    num_units: number
    [key: string]: number | MmuMachineUnit
}

export interface MmuMachineUnit {
    name: string
    vendor:
        | '3MS'
        | 'AngryBeaver'
        | 'BoxTurtle'
        | 'EMU'
        | 'ERCF'
        | 'HappyHare'
        | 'KMS'
        | 'MMX'
        | 'NightOwl'
        | 'QuattroBox'
        | 'Tradrack'
        | 'VVD'
    version: string
    num_gates: number
    first_gate: number
    selector_type: 'VirtualSelector' | 'RotarySelector' | 'ServoSelector' | 'LinearSelector'
    variable_rotation_distances: boolean
    variable_bowden_lengths: boolean
    require_bowden_move: boolean
    filament_always_gripped: boolean
    can_crossload: boolean
    has_bypass: boolean
    multi_gear: boolean
    environment_sensor?: string
    environment_sensors?: string[]
    filament_heater?: string
    filament_heaters?: string[]
}

export type MmuDryingState = '' | 'active' | 'queued' | 'complete' | 'cancelled'

export interface MmuFilamentHeater {
    temperature: number
    target: number
    power: number
}

export interface MmuEnvironmentSensor {
    temperature?: number
    humidity?: number
}

export interface MmuSlicerToolMap {
    tools: Record<string, MmuSlicerToolMapTool>
    referenced_tools: number[]
    initial_tool: number | null
    purge_volumes: number[][]
    total_toolchanges: number | null
    skip_automap: boolean
}

export interface MmuSlicerToolMapTool {
    color: string
    material: string
    temp: number
    name: string
    in_use: boolean
}

type MmuUnitGateMenuDisabled = boolean | ((gate: number) => boolean)
type MmuUnitGateMenuAction = { kind: 'gcode'; command: string } | { kind: 'call'; fn: (gate: number) => void }

export interface MmuUnitGateContextMenuItem {
    icon: string
    label: string
    loading: string
    disabled?: MmuUnitGateMenuDisabled
    action: MmuUnitGateMenuAction
}

export const NO_FILAMENT_COLOR = '#808182E3'

export const TOOL_GATE_BYPASS = -2
export const TOOL_GATE_UNKNOWN = -1

export const GATE_UNKNOWN = -1
export const GATE_EMPTY = 0
export const GATE_AVAILABLE = 1 // Available to load from either buffer or spool
export const GATE_AVAILABLE_FROM_BUFFER = 2

export const UNIT_UNKNOWN = -1

export const FILAMENT_SPEED_OVERRIDE_MIN = 10
export const FILAMENT_SPEED_OVERRIDE_MAX = 150

export const MmuTtgMap_START_X = 10
export const MmuTtgMap_START_Y = 8
export const MmuTtgMap_VERTICAL_SPACING = 12
export const MmuTtgMap_GROUP_SPACING = 12
export const MmuTtgMap_MAP_SPACE = 80
export const MmuTtgMap_LEADER = 10

export const FILAMENT_POS_UNKNOWN = -1
export const FILAMENT_POS_UNLOADED = 0 // Parked in gate
export const FILAMENT_POS_HOMED_GATE = 1 // Homed at either gate or gear sensor (currently assumed mutually exclusive sensors)
export const FILAMENT_POS_START_BOWDEN = 2 // Point of fast load portion
export const FILAMENT_POS_IN_BOWDEN = 3 // Some unknown position in the bowden
export const FILAMENT_POS_END_BOWDEN = 4 // End of fast load portion
export const FILAMENT_POS_HOMED_ENTRY = 5 // Homed at entry sensor
export const FILAMENT_POS_HOMED_EXTRUDER = 6 // Collision homing case at extruder gear entry
export const FILAMENT_POS_EXTRUDER_ENTRY = 7 // Past extruder gear entry
export const FILAMENT_POS_HOMED_TS = 8 // Homed at toolhead sensor
export const FILAMENT_POS_IN_EXTRUDER = 9 // In extruder past toolhead sensor
export const FILAMENT_POS_LOADED = 10 // Homed to nozzle

export const DIRECTION_LOAD = 1
export const DIRECTION_UNKNOWN = 0
export const DIRECTION_UNLOAD = -1

export const ACTION_IDLE = 'Idle'
export const ACTION_LOADING = 'Loading'
export const ACTION_LOADING_EXTRUDER = 'Loading Ext'
export const ACTION_UNLOADING = 'Unloading'
export const ACTION_UNLOADING_EXTRUDER = 'Unloading Ext'
export const ACTION_FORMING_TIP = 'Forming Tip'
export const ACTION_CUTTING_TIP = 'Cutting Tip'
export const ACTION_HEATING = 'Heating'
export const ACTION_CHECKING = 'Checking'
export const ACTION_HOMING = 'Homing'
export const ACTION_SELECTING = 'Selecting'
export const ACTION_CUTTING_FILAMENT = 'Cutting Filament'
export const ACTION_PURGING = 'Purging'

/** Replaces the Vue 2 `MmuMixin` class component. */
export function useMmu() {
    const printerStore = usePrinterStore()
    const { klipperReadyForGui, printer_state } = useBase()

    const mmu = computed<Mmu | undefined>(() => printerStore.mmu ?? undefined)
    const hasMmuEncoder = computed(() => 'encoder' in (mmu.value ?? {}))

    const hasMmuSensor = (sensorName: keyof Mmu['sensors']) => mmuSensors.value !== undefined && sensorName in mmuSensors.value

    const getMmuSensor = (sensorName: keyof Mmu['sensors']) => (mmuSensors.value ? mmuSensors.value[sensorName] : undefined)

    const hasFilamentProportionalSensor = computed(() => hasMmuSensor('filament_proportional'))
    const hasFilamentCompressionSensor = computed(() => hasMmuSensor('filament_compression'))
    const hasFilamentTensionSensor = computed(() => hasMmuSensor('filament_tension'))
    const hasSyncFeedback = computed(
        () => hasFilamentCompressionSensor.value || hasFilamentTensionSensor.value || hasFilamentProportionalSensor.value
    )

    const mmuMachine = computed<MmuMachine | undefined>(() => printerStore.mmu_machine ?? undefined)
    const mmuSettings = computed(() => printerStore.configfile?.settings?.mmu ?? {})
    const mmuSoftwareVars = computed(() => printerStore['gcode_macro _MMU_SOFTWARE_VARS'])
    const mmuNumGates = computed(() => mmu.value?.num_gates ?? 0)

    const spoolWidth = computed(() => {
        if (mmuNumGates.value <= 8) return 56
        if (mmuNumGates.value <= 16) return 48

        return 40
    })

    const ttgMap = computed(() => mmu.value?.ttg_map ?? [])
    const endlessSpoolGroups = computed(() => mmu.value?.endless_spool_groups ?? [])
    const mmuAction = computed(() => mmu.value?.action ?? ACTION_IDLE)
    const mmuPrintState = computed(() => mmu.value?.print_state ?? '')
    const mmuSensors = computed(() => mmu.value?.sensors ?? undefined)
    const mmuEncoder = computed(() => mmu.value?.encoder ?? undefined)
    const mmuNumUnits = computed(() => mmuMachine.value?.num_units ?? 1)
    const mmuUnit = computed(() => mmu.value?.unit ?? UNIT_UNKNOWN)
    const mmuGate = computed(() => mmu.value?.gate ?? TOOL_GATE_UNKNOWN)
    const mmuTool = computed(() => mmu.value?.tool ?? TOOL_GATE_UNKNOWN)
    const mmuHasBypass = computed(() => mmu.value?.has_bypass ?? false)
    const mmuFilamentPos = computed(() => mmu.value?.filament_pos ?? FILAMENT_POS_UNKNOWN)
    const mmuSyncDrive = computed(() => mmu.value?.sync_drive ?? false)
    const mmuSpoolmanSupport = computed(() => mmu.value?.spoolman_support ?? 'off')
    const mmuServo = computed(() => mmu.value?.servo ?? 'Unknown')
    const mmuGrip = computed(() => mmu.value?.grip ?? 'Unknown')
    const mmuEspoolers = computed(() => mmu.value?.espooler)
    const configGateHomingEndstop = computed<string>(() => mmuSettings.value?.gate_homing_endstop)

    const canSend = computed(() => {
        const idleTimeout = printerStore.idle_timeout?.state ?? ''
        return klipperReadyForGui.value && printer_state.value !== 'printing' && idleTimeout !== 'Printing'
    })

    const getMmuMachineUnit = (unitIndex: number): MmuMachineUnit | undefined =>
        (mmuMachine.value?.[`unit_${unitIndex}`] as MmuMachineUnit) ?? undefined

    const doSend = (gcode: string, loading: string | null = null) => {
        useServerStore().addEvent({ message: gcode, type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: gcode }, { loading })
    }

    const formColorString = (color: string | null) => {
        if (!color) return NO_FILAMENT_COLOR

        const namedColor = W3C_COLORS.find((c) => c.name === color.toLowerCase())
        if (namedColor) {
            return namedColor.hex.length === 7 ? `${namedColor.hex}FF` : namedColor.hex.toUpperCase()
        }

        const hexPattern = /^#?([0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?)$/
        const match = color.match(hexPattern)
        if (!match) return NO_FILAMENT_COLOR

        const hex = match[1]
        const normalized = `#${hex}${hex.length === 6 ? 'FF' : ''}`

        return normalized.toUpperCase()
    }

    return {
        mmu,
        hasMmuEncoder,
        hasFilamentProportionalSensor,
        hasFilamentCompressionSensor,
        hasFilamentTensionSensor,
        hasSyncFeedback,
        mmuMachine,
        mmuSettings,
        mmuSoftwareVars,
        mmuNumGates,
        spoolWidth,
        ttgMap,
        endlessSpoolGroups,
        mmuAction,
        mmuPrintState,
        mmuSensors,
        mmuEncoder,
        mmuNumUnits,
        mmuUnit,
        mmuGate,
        mmuTool,
        mmuHasBypass,
        mmuFilamentPos,
        mmuSyncDrive,
        mmuSpoolmanSupport,
        mmuServo,
        mmuGrip,
        mmuEspoolers,
        configGateHomingEndstop,
        canSend,
        getMmuMachineUnit,
        hasMmuSensor,
        getMmuSensor,
        doSend,
        formColorString,
    }
}
