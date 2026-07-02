import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePrinterStore } from '@/store/printer'

// Regression test for a real bug found while building Phase 4's test kit:
// PrinterState mirrors Klipper's fully dynamic object model, so
// getDefaultState() is `{}` - no key exists until real Moonraker traffic
// streams in. Pinia's setup-store mechanism only exposes properties present
// on the object returned by defineStore's setup() function, snapshotted once
// at store-creation time. Mutating the internal `state` reactive object
// (via deepMerge) is real, but was invisible to any usePrinterStore().xyz
// consumer for any key that didn't exist at that snapshot moment - i.e.
// every single Klipper object (configfile, toolhead, extruder, ...), since
// none of them exist at store construction. This means the printer store's
// data essentially never reached components. See src/store/printer/index.ts
// for the bridgeKeys() fix.
describe('printer store reactivity bridging', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('exposes a brand new top-level key introduced after store construction', () => {
        const store = usePrinterStore()

        expect(store.configfile).toBeUndefined()

        store.setData({ configfile: { settings: { printer: { kinematics: 'generic_cartesian' } } } })

        expect(store.configfile).toEqual({ settings: { printer: { kinematics: 'generic_cartesian' } } })
    })

    it('keeps deep-merging into an already-bridged key across multiple updates', () => {
        const store = usePrinterStore()

        store.setData({ configfile: { settings: { printer: { kinematics: 'generic_cartesian' } } } })
        store.setData({ configfile: { settings: { extruder: { nozzle_diameter: 0.4 } } } })

        expect(store.configfile).toEqual({
            settings: {
                printer: { kinematics: 'generic_cartesian' },
                extruder: { nozzle_diameter: 0.4 },
            },
        })
    })

    it('bridges keys set outside of setData (clearCurrentFile, setEndstopStatus)', () => {
        const store = usePrinterStore()

        store.clearCurrentFile()
        expect(store.current_file).toEqual({})

        store.setEndstopStatus({ x: 'open' })
        expect(store.endstops).toEqual({ x: 'open' })
    })

    it('removes bridged keys on reset so stale data does not linger after reconnect', () => {
        const store = usePrinterStore()

        store.setData({ configfile: { settings: {} } })
        expect(store.configfile).toBeDefined()

        store.reset()

        expect(store.configfile).toBeUndefined()
    })

    // Regression test for a real bug found while auditing sluggish/hanging
    // behaviour on real hardware: reset()'s stale-key cleanup computed
    // `Object.keys(state)` to find bridged Klipper data to scrub off the
    // exposed store - but every action/getter (getData, getInfo, initGcodes,
    // even reset/init themselves) also lives on that same `state` object
    // (that's how they get smuggled past Pinia's setup-store snapshot in the
    // first place). Since getDefaultState() is `{}`, every one of those
    // action names looked "stale" too, so reset() deleted them from
    // usePrinterStore() on every single Klipper reconnect - the store worked
    // once, then every notify_klippy_ready silently bricked it. See
    // src/store/printer/index.ts's `reservedKeys` fix.
    it('keeps every action/getter callable after reset (not just cleared of data)', () => {
        const store = usePrinterStore()

        store.setData({ configfile: { settings: {} } })
        store.reset()

        expect(typeof store.reset).toBe('function')
        expect(typeof store.init).toBe('function')
        expect(typeof store.getData).toBe('function')
        expect(typeof store.getInfo).toBe('function')
        expect(typeof store.initGcodes).toBe('function')
        expect(typeof store.setData).toBe('function')
        expect(typeof store.sendGcode).toBe('function')

        // and a second reset (mirroring repeated reconnects) must not
        // compound the damage
        store.reset()
        expect(typeof store.getData).toBe('function')
    })
})
