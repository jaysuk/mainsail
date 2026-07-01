import { computed } from 'vue'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

/** Replaces the Vue 2 `ControlMixin` class component. */
export function useControl() {
    const printerStore = usePrinterStore()
    const guiStore = useGuiStore()

    const absolute_coordinates = computed(() => printerStore.gcode_move?.absolute_coordinates ?? true)
    const enableXYHoming = computed<boolean>(() => guiStore.control.enableXYHoming)
    const feedrateXY = computed(() => guiStore.control?.feedrateXY ?? 100)
    const feedrateZ = computed(() => guiStore.control?.feedrateZ ?? 10)

    const existsQGL = computed(() => printerStore.existsQGL)
    const existsZtilt = computed(() => printerStore.existsZtilt)
    const existsBedTilt = computed(() => printerStore.existsBedTilt)
    const existsBedScrews = computed(() => printerStore.existsBedScrews)
    const existsDeltaCalibrate = computed(() => printerStore.existsDeltaCalibrate)
    const existsScrewsTilt = computed(() => printerStore.existsScrewsTilt)
    const existsFirmwareRetraction = computed<boolean>(() => printerStore.existsFirmwareRetraction)

    const colorQuadGantryLevel = computed(() => {
        const status = printerStore.quad_gantry_level?.applied ?? true
        return status ? 'primary' : 'warning'
    })

    const colorZTilt = computed(() => {
        let status = true

        if ('z_tilt' in printerStore) {
            status = printerStore.z_tilt?.applied
        } else if ('z_tilt_ng' in printerStore) {
            status = printerStore.z_tilt_ng?.applied
        }

        return status ? 'primary' : 'warning'
    })

    const defaultActionButton = computed(() => guiStore.getDefaultControlActionButton)

    const actionButton = computed<string>(() => {
        const button = guiStore.control.actionButton ?? defaultActionButton.value

        // NOTE: the original mixin checked `printer/existsZTilt` (capital T),
        // a getter that doesn't exist (the real one is `existsZtilt`) -- so
        // this branch's `!undefined` was always true and a saved 'ztilt'
        // action-button preference always silently reverted to the default.
        // Fixed to check the real existsZtilt getter.
        if ((button === 'qgl' && !existsQGL.value) || (button === 'ztilt' && !existsZtilt.value)) {
            return defaultActionButton.value
        }

        return button
    })

    const homedAxes = computed<string>(() => printerStore.toolhead?.homed_axes ?? '')
    const xAxisHomed = computed(() => homedAxes.value.includes('x'))
    const yAxisHomed = computed(() => homedAxes.value.includes('y'))
    const zAxisHomed = computed(() => homedAxes.value.includes('z'))

    const macros = computed(() => printerStore.getMacros)

    const toolchangeMacros = computed<string[]>(() => {
        const sortToolchangeMacros = (a: string, b: string) => {
            const numberA = parseInt(a.slice(1))
            const numberB = parseInt(b.slice(1))

            return numberA - numberB
        }

        const commands = printerStore.gcode?.commands ?? null
        if (commands) {
            return Object.keys(commands)
                .filter((gcode) => gcode.match(/^T\d+/))
                .sort(sortToolchangeMacros)
        }

        return Object.keys(printerStore)
            .filter((gcode) => gcode.toLowerCase().match(/^gcode_macro t\d+/))
            .map((gcode) => gcode.slice(gcode.indexOf(' ') + 1))
            .sort(sortToolchangeMacros)
    })

    const existsClientLinearMoveMacro = computed(() => {
        const macros = printerStore.gcode?.commands ?? {}
        return '_CLIENT_LINEAR_MOVE' in macros
    })

    const doSend = (gcode: string) => {
        useServerStore().addEvent({ message: gcode, type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: gcode })
    }

    const doHome = () => {
        useServerStore().addEvent({ message: 'G28', type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: 'G28' }, { loading: 'homeAll' })
    }

    const doHomeX = () => {
        useServerStore().addEvent({ message: 'G28 X', type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: 'G28 X' }, { loading: 'homeX' })
    }

    const doHomeY = () => {
        useServerStore().addEvent({ message: 'G28 Y', type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: 'G28 Y' }, { loading: 'homeY' })
    }

    const doHomeXY = () => {
        useServerStore().addEvent({ message: 'G28 X Y', type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: 'G28 X Y' }, { loading: 'homeXY' })
    }

    const doHomeZ = () => {
        useServerStore().addEvent({ message: 'G28 Z', type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: 'G28 Z' }, { loading: 'homeZ' })
    }

    const doQGL = () => {
        useServerStore().addEvent({ message: 'QUAD_GANTRY_LEVEL', type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: 'QUAD_GANTRY_LEVEL' }, { loading: 'qgl' })
    }

    const doZtilt = () => {
        useServerStore().addEvent({ message: 'Z_TILT_ADJUST', type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: 'Z_TILT_ADJUST' }, { loading: 'zTilt' })
    }

    const doSendMove = (gcode: string, feedrate: number) => {
        let command =
            `SAVE_GCODE_STATE NAME=_ui_movement\n` +
            `G91\n` +
            `G1 ${gcode} F${feedrate * 60}\n` +
            `RESTORE_GCODE_STATE NAME=_ui_movement`

        if (existsClientLinearMoveMacro.value) {
            gcode = gcode
                .split(' ')
                .map((part) => {
                    const axis = part.slice(0, 1)
                    const value = parseFloat(part.slice(1))

                    return `${axis}=${value}`
                })
                .join(' ')

            command = `_CLIENT_LINEAR_MOVE ${gcode} F=${feedrate * 60}`
        }

        doSend(command)
    }

    return {
        absolute_coordinates,
        enableXYHoming,
        feedrateXY,
        feedrateZ,
        existsQGL,
        existsZtilt,
        existsBedTilt,
        existsBedScrews,
        existsDeltaCalibrate,
        existsScrewsTilt,
        existsFirmwareRetraction,
        colorQuadGantryLevel,
        colorZTilt,
        defaultActionButton,
        actionButton,
        homedAxes,
        xAxisHomed,
        yAxisHomed,
        zAxisHomed,
        macros,
        toolchangeMacros,
        existsClientLinearMoveMacro,
        doHome,
        doHomeX,
        doHomeY,
        doHomeXY,
        doHomeZ,
        doQGL,
        doZtilt,
        doSendMove,
        doSend,
    }
}
