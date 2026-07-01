import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useZoffset } from '@/composables/useZoffset'
import { usePrinterStore } from '@/store/printer'

const seedPrinterState = (printerState: Record<string, unknown>) => {
    setActivePinia(createPinia())
    usePrinterStore().setData(printerState)

    return useZoffset()
}

describe('useZoffset', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('uses stepper_a for delta printers', () => {
        const zoffset = seedPrinterState({
            configfile: {
                settings: {
                    printer: {
                        kinematics: 'delta',
                    },
                },
            },
        })

        expect(zoffset.stepper_name.value).toBe('stepper_a')
    })

    it('uses carriage carriage_z for generic_cartesian printers', () => {
        const zoffset = seedPrinterState({
            configfile: {
                settings: {
                    printer: {
                        kinematics: 'generic_cartesian',
                    },
                },
            },
        })

        expect(zoffset.stepper_name.value).toBe('carriage carriage_z')
    })

    it('uses stepper_z for conventional cartesian-style printers', () => {
        const zoffset = seedPrinterState({
            configfile: {
                settings: {
                    printer: {
                        kinematics: 'corexy',
                    },
                },
            },
        })

        expect(zoffset.stepper_name.value).toBe('stepper_z')
    })

    it('detects probe virtual endstops on generic_cartesian Z carriages', () => {
        const zoffset = seedPrinterState({
            configfile: {
                settings: {
                    printer: {
                        kinematics: 'generic_cartesian',
                    },
                    'carriage carriage_z': {
                        endstop_pin: 'probe:z_virtual_endstop',
                    },
                },
            },
        })

        expect(zoffset.endstop_pin.value).toBe('probe:z_virtual_endstop')
        expect(zoffset.isEndstopProbe.value).toBe(true)
    })

    it('does not throw when the Z endstop config is missing', () => {
        const zoffset = seedPrinterState({
            configfile: {
                settings: {
                    printer: {
                        kinematics: 'generic_cartesian',
                    },
                },
            },
        })

        expect(zoffset.endstop_pin.value).toBeNull()
        expect(zoffset.isEndstopProbe.value).toBe(false)
    })

    it('shows the endstop save button for non-zero generic_cartesian gcode offsets', () => {
        const zoffset = seedPrinterState({
            gcode_move: {
                homing_origin: [0, 0, -0.15],
            },
            gcode: {
                commands: {
                    Z_OFFSET_APPLY_ENDSTOP: {},
                },
            },
            configfile: {
                settings: {
                    printer: {
                        kinematics: 'generic_cartesian',
                    },
                    'carriage carriage_z': {
                        endstop_pin: '^duet:PC5',
                    },
                },
            },
        })

        expect(zoffset.showSaveButton.value).toBe(true)
        expect(zoffset.autoSaveZOffsetOption.value).toBe('Z_OFFSET_APPLY_ENDSTOP')
    })
})
