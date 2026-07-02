import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, markRaw } from 'vue'
import { installMainsailApi, mainsailApi } from '@/plugins/mainsail'
import { on, off, emit, CLOSE_CONTEXT_MENU } from '@/plugins/mainsail'
import { loadPlugins, unloadPlugin } from '@/plugins/mainsail/pluginLoader'
import { useLayoutStore } from '@/store/layout'
import { usePrinterStore } from '@/store/printer'
import { pluginNaviPoints } from '@/composables/useNavigation'
import { webSocketClient } from '@/plugins/webSocketClient'
import router from '@/plugins/router'
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

    describe('unloadPlugin (best-effort hot teardown)', () => {
        it('calls uninstall(api) for a plugin module exporting it as a named export, and returns true', async () => {
            const uninstall = vi.fn()
            const importer = vi.fn().mockResolvedValue({ uninstall })

            const result = await unloadPlugin('https://example.com/plugin.js', importer)

            expect(importer).toHaveBeenCalledWith('https://example.com/plugin.js')
            expect(uninstall).toHaveBeenCalledWith(mainsailApi)
            expect(result).toBe(true)
        })

        it('calls uninstall(api) for a plugin module exporting it on its default export', async () => {
            const uninstall = vi.fn()
            const importer = vi.fn().mockResolvedValue({ default: { uninstall } })

            const result = await unloadPlugin('https://example.com/plugin.js', importer)

            expect(uninstall).toHaveBeenCalledWith(mainsailApi)
            expect(result).toBe(true)
        })

        it('actually tears down what the plugin registered during install(), not just calls the hook', async () => {
            const importer = vi.fn().mockResolvedValue({
                install: (api: MainsailPluginApi) => api.registerDashboardPanel('unload-test-panel', FakePanel),
                uninstall: (api: MainsailPluginApi) => api.unregisterDashboardPanel('unload-test-panel'),
            })

            await loadPlugins(['https://example.com/plugin.js'], importer)
            expect(useLayoutStore().resolvePanelComponent('unload-test-panel')).toBe(FakePanel)

            await unloadPlugin('https://example.com/plugin.js', importer)
            expect(useLayoutStore().resolvePanelComponent('unload-test-panel')).toBeUndefined()
        })

        it('returns false without erroring for a plugin with no uninstall() export', async () => {
            const importer = vi.fn().mockResolvedValue({ install: vi.fn() })

            const result = await unloadPlugin('https://example.com/plugin.js', importer)

            expect(result).toBe(false)
        })

        it('returns false and logs an error for a plugin whose import() rejects', async () => {
            const errorSpy = vi.spyOn(window.console, 'error').mockImplementation(() => {})
            const importer = vi.fn().mockRejectedValue(new Error('network error'))

            const result = await unloadPlugin('https://example.com/broken.js', importer)

            expect(result).toBe(false)
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to unload Mainsail plugin'), expect.any(Error))
            errorSpy.mockRestore()
        })
    })

    describe('sendGcode', () => {
        it('sends a script through the same path as the console (printer.gcode.script)', () => {
            const emitSpy = vi.spyOn(webSocketClient, 'emit').mockImplementation(() => {})

            mainsailApi.sendGcode('G28')

            expect(emitSpy).toHaveBeenCalledWith('printer.gcode.script', { script: 'G28' }, expect.anything())
            emitSpy.mockRestore()
        })

        it('special-cases M112 to the dedicated emergency-stop RPC, matching the console', () => {
            const emitSpy = vi.spyOn(webSocketClient, 'emit').mockImplementation(() => {})

            mainsailApi.sendGcode('M112')

            expect(emitSpy).toHaveBeenCalledWith('printer.emergency_stop', {}, expect.anything())
            emitSpy.mockRestore()
        })
    })

    describe('registerPage', () => {
        afterEach(() => {
            if (router.hasRoute('plugin-test-page')) router.removeRoute('plugin-test-page')
            pluginNaviPoints.splice(0, pluginNaviPoints.length)
        })

        it('adds a real Vue Router route reachable by path', () => {
            mainsailApi.registerPage({ name: 'plugin-test-page', title: 'Test Page', path: '/plugin-test-page', component: FakePanel })

            const resolved = router.resolve('/plugin-test-page')
            expect(resolved.name).toBe('plugin-test-page')
            expect(resolved.matched).toHaveLength(1)
        })

        it('adds a sidebar nav entry, bypassing the core-route i18n lookup', () => {
            mainsailApi.registerPage({ name: 'plugin-test-page', title: 'Test Page', path: '/plugin-test-page', component: FakePanel, icon: 'mdi-test' })

            expect(pluginNaviPoints).toHaveLength(1)
            expect(pluginNaviPoints[0]).toMatchObject({ type: 'route', title: 'Test Page', to: '/plugin-test-page', icon: 'mdi-test' })
        })

        it('the returned unregister function removes both the route and the nav entry', () => {
            const unregister = mainsailApi.registerPage({ name: 'plugin-test-page', title: 'Test Page', path: '/plugin-test-page', component: FakePanel })

            unregister()

            expect(router.hasRoute('plugin-test-page')).toBe(false)
            expect(pluginNaviPoints).toHaveLength(0)
        })
    })

    describe('overrideDashboard', () => {
        it('replaces what the dashboard route resolves to', () => {
            mainsailApi.overrideDashboard(FakePanel)

            const resolved = router.resolve('/')
            expect(resolved.matched[0]?.components?.default).toBe(FakePanel)
        })

        it('the returned restore function points the dashboard route at a component again', () => {
            const restore = mainsailApi.overrideDashboard(FakePanel)

            restore()

            const resolved = router.resolve('/')
            expect(resolved.matched[0]?.components?.default).not.toBe(FakePanel)
        })
    })

    describe('registerSettingsTab', () => {
        it('is discoverable via getRegisteredSettingsTabs', async () => {
            const { getRegisteredSettingsTabs } = await import('@/plugins/mainsail')

            const unregister = mainsailApi.registerSettingsTab('my-plugin-tab', { title: 'My Plugin', icon: 'mdi-test', component: FakePanel })

            expect(getRegisteredSettingsTabs().get('my-plugin-tab')).toMatchObject({ title: 'My Plugin', icon: 'mdi-test' })

            unregister()
            expect(getRegisteredSettingsTabs().has('my-plugin-tab')).toBe(false)
        })
    })

    describe('getPluginData / setPluginData', () => {
        it('setPluginData persists via server.database.post_item under the pluginData namespace', async () => {
            const emitSpy = vi.spyOn(webSocketClient, 'emit').mockImplementation(() => {})

            await mainsailApi.setPluginData('my_plugin', 'settings', { foo: 'bar' })

            expect(emitSpy).toHaveBeenCalledWith('server.database.post_item', {
                namespace: 'pluginData',
                key: 'my_plugin.settings',
                value: { foo: 'bar' },
            })
            emitSpy.mockRestore()
        })

        it('getPluginData reads via the REST endpoint and unwraps result.value', async () => {
            const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ result: { value: { foo: 'bar' } } }) })
            vi.stubGlobal('fetch', fetchSpy)

            const result = await mainsailApi.getPluginData('my_plugin', 'settings')

            expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('namespace=pluginData&key=my_plugin.settings'))
            expect(result).toEqual({ foo: 'bar' })
            vi.unstubAllGlobals()
        })

        it('getPluginData resolves undefined when nothing has been stored yet', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

            const result = await mainsailApi.getPluginData('my_plugin', 'settings')

            expect(result).toBeUndefined()
            vi.unstubAllGlobals()
        })
    })
})
