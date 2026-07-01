import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, markRaw } from 'vue'
import { installMainsailApi, mainsailApi } from '@/plugins/mainsail'
import { on, off, emit, CLOSE_CONTEXT_MENU } from '@/plugins/mainsail'
import { loadPlugins } from '@/plugins/mainsail/pluginLoader'
import { useLayoutStore } from '@/store/layout'
import { usePrinterStore } from '@/store/printer'
import type { MainsailPluginApi } from '@/plugins/mainsail/types'

// A minimal "mock Moonraker WebSocket fixture": rather than standing up a
// real WebSocket server, we exercise the exact same store entrypoint real
// notify_status_update traffic flows through (usePrinterStore().getData()).
// This is the same pipeline src/store/socket/index.ts's onMessage() calls
// into for every printer object-model push from Moonraker.
function pushMockPrinterUpdate(payload: Record<string, unknown>) {
    usePrinterStore().getData(payload)
}

const FakePanel = markRaw(defineComponent({ name: 'FakePanel', render: () => null }))

describe('window.Mainsail plugin API', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('installs itself onto window.Mainsail', () => {
        installMainsailApi()

        expect(window.Mainsail).toBe(mainsailApi)
        expect(window.Mainsail?.version).toBeTruthy()
    })

    describe('registerDashboardPanel', () => {
        it('resolves through useLayoutStore, the registry Dashboard.vue reads from', () => {
            mainsailApi.registerDashboardPanel('my-plugin-panel', FakePanel)

            expect(useLayoutStore().resolvePanelComponent('my-plugin-panel')).toBe(FakePanel)
        })

        it('unregisterDashboardPanel removes it again', () => {
            mainsailApi.registerDashboardPanel('my-plugin-panel', FakePanel)
            mainsailApi.unregisterDashboardPanel('my-plugin-panel')

            expect(useLayoutStore().resolvePanelComponent('my-plugin-panel')).toBeUndefined()
        })
    })

    describe('registerComponent (generic slots)', () => {
        it('registers and retrieves components by slot + name', () => {
            mainsailApi.registerComponent('settings-tabs', 'my-tab', FakePanel)

            const components = mainsailApi.getComponents('settings-tabs')
            expect(components.get('my-tab')).toBe(FakePanel)
        })

        it('returns an empty map for a slot nothing has registered into', () => {
            expect(mainsailApi.getComponents('nonexistent-slot').size).toBe(0)
        })

        it('unregisterComponent removes a single entry without touching the rest of the slot', () => {
            mainsailApi.registerComponent('settings-tabs', 'tab-a', FakePanel)
            mainsailApi.registerComponent('settings-tabs', 'tab-b', FakePanel)

            mainsailApi.unregisterComponent('settings-tabs', 'tab-a')

            const components = mainsailApi.getComponents('settings-tabs')
            expect(components.has('tab-a')).toBe(false)
            expect(components.has('tab-b')).toBe(true)
        })
    })

    describe('event bus bridge', () => {
        it('delivers events emitted through window.Mainsail to internal on() subscribers', () => {
            const handler = vi.fn()
            on(CLOSE_CONTEXT_MENU, handler)

            mainsailApi.emit(CLOSE_CONTEXT_MENU)

            expect(handler).toHaveBeenCalledOnce()
            off(CLOSE_CONTEXT_MENU, handler)
        })

        it('delivers events emitted internally to window.Mainsail.on() subscribers', () => {
            const handler = vi.fn()
            mainsailApi.on('custom-event', handler)

            emit('custom-event', 'hello', 42)

            expect(handler).toHaveBeenCalledWith('hello', 42)
            mainsailApi.off('custom-event', handler)
        })

        it('off() without a handler removes every subscriber for that event', () => {
            const handlerA = vi.fn()
            const handlerB = vi.fn()
            on('multi', handlerA)
            on('multi', handlerB)

            off('multi')
            emit('multi')

            expect(handlerA).not.toHaveBeenCalled()
            expect(handlerB).not.toHaveBeenCalled()
        })
    })

    describe('subscribeToPrinterObject (object-model subscription hook)', () => {
        it('fires with live printer state on a mock notify_status_update-style push', () => {
            const handler = vi.fn()
            const unsubscribe = mainsailApi.subscribeToPrinterObject(handler)

            pushMockPrinterUpdate({ extruder: { temperature: 210.4 } })

            expect(handler).toHaveBeenCalledOnce()
            const [receivedState] = handler.mock.calls[0]
            expect(receivedState.extruder).toEqual({ temperature: 210.4 })

            unsubscribe()
        })

        it('the returned unsubscribe function stops further callbacks', () => {
            const handler = vi.fn()
            const unsubscribe = mainsailApi.subscribeToPrinterObject(handler)

            unsubscribe()
            pushMockPrinterUpdate({ extruder: { temperature: 210.4 } })

            expect(handler).not.toHaveBeenCalled()
        })

        it('reflects through usePrinterStore() directly too (the bug this hook depends on being fixed)', () => {
            pushMockPrinterUpdate({ toolhead: { position: [1, 2, 3, 0] } })

            expect(usePrinterStore().toolhead).toEqual({ position: [1, 2, 3, 0] })
        })
    })

    describe('loadPlugins (dynamic plugin loader)', () => {
        it('calls install(api) for a plugin module exporting install() as a named export', async () => {
            const install = vi.fn()
            const importer = vi.fn().mockResolvedValue({ install })

            await loadPlugins(['https://example.com/plugin.js'], importer)

            expect(importer).toHaveBeenCalledWith('https://example.com/plugin.js')
            expect(install).toHaveBeenCalledWith(mainsailApi)
        })

        it('calls install(api) for a plugin module exporting install() on its default export', async () => {
            const install = vi.fn()
            const importer = vi.fn().mockResolvedValue({ default: { install } })

            await loadPlugins(['https://example.com/plugin.js'], importer)

            expect(install).toHaveBeenCalledWith(mainsailApi)
        })

        it('a plugin registering a dashboard panel during install() is immediately resolvable', async () => {
            const importer = vi.fn().mockResolvedValue({
                install: (api: MainsailPluginApi) => api.registerDashboardPanel('loaded-plugin-panel', FakePanel),
            })

            await loadPlugins(['https://example.com/plugin.js'], importer)

            expect(useLayoutStore().resolvePanelComponent('loaded-plugin-panel')).toBe(FakePanel)
        })

        it('logs an error and continues past a module with no install() export', async () => {
            const errorSpy = vi.spyOn(window.console, 'error').mockImplementation(() => {})
            const importer = vi.fn().mockResolvedValue({ notInstall: () => {} })

            await expect(loadPlugins(['https://example.com/bad-plugin.js'], importer)).resolves.toBeUndefined()

            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('does not export an install'))
            errorSpy.mockRestore()
        })

        it('logs an error and continues past a plugin whose import() rejects', async () => {
            const errorSpy = vi.spyOn(window.console, 'error').mockImplementation(() => {})
            const install = vi.fn()
            const importer = vi.fn().mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce({ install })

            await loadPlugins(['https://example.com/broken.js', 'https://example.com/good.js'], importer)

            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load Mainsail plugin'), expect.any(Error))
            expect(install).toHaveBeenCalledWith(mainsailApi)
            errorSpy.mockRestore()
        })
    })
})
