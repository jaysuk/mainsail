import { markRaw, type Component } from 'vue'
import { useLayoutStore } from '@/store/layout'
import { usePrinterStore } from '@/store/printer'
import { on, off, emit } from '@/plugins/mainsail/eventBus'
import type { MainsailPluginApi } from '@/plugins/mainsail/types'

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
}

/** Installs the `window.Mainsail` plugin API gateway. Called once from main.ts. */
export function installMainsailApi(): void {
    if (typeof window === 'undefined') return

    window.Mainsail = mainsailApi
}
