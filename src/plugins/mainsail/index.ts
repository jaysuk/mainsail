import { markRaw, reactive, type Component } from 'vue'
import { useLayoutStore } from '@/store/layout'
import { usePrinterStore } from '@/store/printer'
import { useSocketStore } from '@/store/socket'
import { webSocketClient } from '@/plugins/webSocketClient'
import router from '@/plugins/router'
import { pluginNaviPoints } from '@/composables/useNavigation'
import { on, off, emit } from '@/plugins/mainsail/eventBus'
import type { MainsailPluginApi, PluginPageConfig, PluginSettingsTabConfig } from '@/plugins/mainsail/types'

export { on, off, emit, CLOSE_CONTEXT_MENU } from '@/plugins/mainsail/eventBus'
export type { MainsailPluginApi, MainsailPluginModule, PluginEventHandler } from '@/plugins/mainsail/types'

// Generic, arbitrary-slot component registry for extension points other than
// dashboard panels (which already have their own registry: useLayoutStore).
// Not consumed anywhere in core Mainsail today - it exists purely as the
// documented, stable surface third-party plugins register into.
const componentRegistry = new Map<string, Map<string, Component>>()

function registerComponent(slot: string, name: string, component: Component): void {
    if (!componentRegistry.has(slot)) componentRegistry.set(slot, new Map())
    componentRegistry.get(slot)?.set(name, markRaw(component))
}

function unregisterComponent(slot: string, name: string): void {
    componentRegistry.get(slot)?.delete(name)
}

function getComponents(slot: string): ReadonlyMap<string, Component> {
    return componentRegistry.get(slot) ?? new Map()
}

function registerDashboardPanel(name: string, component: Component): void {
    useLayoutStore().registerPanel(name, component)
}

function unregisterDashboardPanel(name: string): void {
    useLayoutStore().unregisterPanel(name)
}

function subscribeToPrinterObject(callback: Parameters<MainsailPluginApi['subscribeToPrinterObject']>[0]): () => void {
    return usePrinterStore().subscribeToUpdates(callback)
}

function sendGcode(script: string): void {
    usePrinterStore().sendGcode(script)
}

// registerPage() adds a real Vue Router route (so /path navigation and
// refresh-on-that-URL work) plus a sidebar entry. Core routes' sidebar labels
// are looked up through Mainsail's own i18n as `Router.<title>`
// (useNavigation.ts) - plugin pages sidestep that entirely and are kept in
// their own reactive list (`pluginNaviPoints`, exported from useNavigation.ts
// and merged into the real nav list there), the same way user-supplied
// external nav links already bypass the i18n lookup.
function registerPage(config: PluginPageConfig): () => void {
    router.addRoute({ name: config.name, path: config.path, component: config.component })

    const naviPoint = reactive({
        type: 'route' as const,
        title: config.title,
        icon: config.icon ?? '',
        to: config.path,
        position: config.position ?? 999,
        visible: true,
    })
    pluginNaviPoints.push(naviPoint)

    return () => {
        router.removeRoute(config.name)
        const index = pluginNaviPoints.indexOf(naviPoint)
        if (index !== -1) pluginNaviPoints.splice(index, 1)
    }
}

// Vue Router replaces an existing named route in place when addRoute() is
// called again with the same name, so overriding the Dashboard is just
// re-registering it - no manual removal step. Restoring uses a fresh lazy
// import rather than trying to recover the original route's internal
// (normalized) component reference, which Vue Router doesn't expose in a
// simple re-usable form.
function overrideDashboard(component: Component): () => void {
    router.addRoute({ name: 'dashboard', path: '/', component })

    return () => {
        router.addRoute({ name: 'dashboard', path: '/', component: () => import('@/pages/Dashboard.vue') })
    }
}

// Reactive so TheSettingsMenu.vue's tab list picks up registrations/removals
// without needing the dialog to be closed and reopened.
const settingsTabRegistry = reactive(new Map<string, PluginSettingsTabConfig>())

function registerSettingsTab(key: string, config: PluginSettingsTabConfig): () => void {
    settingsTabRegistry.set(key, { ...config, component: markRaw(config.component) })

    return () => {
        settingsTabRegistry.delete(key)
    }
}

async function getPluginData<T = unknown>(pluginId: string, key: string): Promise<T | undefined> {
    const url = `${useSocketStore().getUrl}/server/database/item?namespace=pluginData&key=${encodeURIComponent(pluginId + '.' + key)}`

    try {
        const response = await fetch(url)
        if (!response.ok) return undefined

        const body = await response.json()
        return body?.result?.value as T | undefined
    } catch {
        return undefined
    }
}

async function setPluginData(pluginId: string, key: string, value: unknown): Promise<void> {
    webSocketClient.emit('server.database.post_item', {
        namespace: 'pluginData',
        key: pluginId + '.' + key,
        value,
    })
}

export const mainsailApi: MainsailPluginApi = {
    get version() {
        return (import.meta.env.PACKAGE_VERSION as string) || '0.0.0'
    },
    registerDashboardPanel,
    unregisterDashboardPanel,
    registerComponent,
    unregisterComponent,
    getComponents,
    on,
    off,
    emit,
    subscribeToPrinterObject,
    sendGcode,
    registerPage,
    overrideDashboard,
    registerSettingsTab,
    getPluginData,
    setPluginData,
}

/**
 * Internal-only accessor for TheSettingsMenu.vue to read the reactive
 * plugin-registered settings-tab registry. Not part of the public
 * MainsailPluginApi surface - core Mainsail code should use this directly
 * rather than going through window.Mainsail.
 */
export function getRegisteredSettingsTabs(): ReadonlyMap<string, PluginSettingsTabConfig> {
    return settingsTabRegistry
}

/** Installs the `window.Mainsail` plugin API gateway. Called once from main.ts. */
export function installMainsailApi(): void {
    if (typeof window === 'undefined') return

    window.Mainsail = mainsailApi
}
