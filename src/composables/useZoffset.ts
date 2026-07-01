import { computed } from 'vue'
import { usePrinterStore } from '@/store/printer'

/** Replaces the Vue 2 `ZoffsetMixin` class component. */
export function useZoffset() {
    const printerStore = usePrinterStore()

    const homing_origin = computed<number[]>(() => printerStore.gcode_move?.homing_origin ?? [])
    const z_gcode_offset = computed(() => (homing_origin.value.length > 1 ? Math.round(homing_origin.value[2] * 1000) / 1000 : 0))
    const commands = computed(() => printerStore.gcode?.commands ?? {})
    const settings = computed(() => printerStore.configfile?.settings ?? {})
    const kinematics = computed(() => settings.value.printer?.kinematics ?? 'cartesian')

    const stepper_name = computed(() => {
        if (kinematics.value === 'delta') return 'stepper_a'
        if (kinematics.value === 'generic_cartesian') return 'carriage carriage_z'

        return 'stepper_z'
    })

    const endstop_pin = computed(() => settings.value[stepper_name.value]?.endstop_pin?.trim() ?? null)
    const zOffset = computed<number>(() => printerStore.gcode_move?.homing_origin[2].toFixed(3))

    const isEndstopProbe = computed(() => (endstop_pin.value ?? '').replaceAll(' ', '').search('probe:z_virtual_endstop') !== -1)

    const existZOffsetApplyProbe = computed(() => 'Z_OFFSET_APPLY_PROBE' in commands.value)
    const existZOffsetApplyEndstop = computed(() => 'Z_OFFSET_APPLY_ENDSTOP' in commands.value)

    const showSaveButton = computed(() => {
        if (z_gcode_offset.value === 0) return false

        if (isEndstopProbe.value && existZOffsetApplyProbe.value) return true

        return !isEndstopProbe.value && existZOffsetApplyEndstop.value
    })

    const autoSaveZOffsetOption = computed(() => {
        if (isEndstopProbe.value && existZOffsetApplyProbe.value) return 'Z_OFFSET_APPLY_PROBE'

        return 'Z_OFFSET_APPLY_ENDSTOP'
    })

    return {
        homing_origin,
        z_gcode_offset,
        commands,
        settings,
        kinematics,
        stepper_name,
        endstop_pin,
        zOffset,
        isEndstopProbe,
        existZOffsetApplyProbe,
        existZOffsetApplyEndstop,
        showSaveButton,
        autoSaveZOffsetOption,
    }
}
