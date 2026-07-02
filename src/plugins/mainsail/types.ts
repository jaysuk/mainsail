import type { Component } from 'vue'
import type { PrinterState } from '@/store/printer/types'
import type { PluginEventHandler } from '@/plugins/mainsail/eventBus'

export type { PluginEventHandler }

/**
 * The public, stable surface exposed as `window.Mainsail` for third-party
 * plugins. Internal app code should generally prefer the more specific
 * composables/stores directly (useLayoutStore, usePrinterStore, ...) - this
 * interface exists for code that has no other way to reach into Mainsail,
 * namely plugins loaded from outside this codebase.
 */
export interface MainsailPluginApi {
    /** Mainsail's package version, e.g. "3.2.0". */
    readonly version: string

    /** Registers a component to render for a named dashboard panel entry. */
    registerDashboardPanel(name: string, component: Component): void
    /** Removes a previously registered dashboard panel. */
    unregisterDashboardPanel(name: string): void

    /**
     * Registers a component into a named, arbitrary extension slot (anything
     * other than dashboard panels - e.g. a future settings-tab or topbar-menu
     * extension point). Slots are just string identifiers; nothing in core
     * Mainsail needs to know about a slot ahead of time for plugins to use it.
     */
    registerComponent(slot: string, name: string, component: Component): void
    /** Removes a previously registered component from a slot. */
    unregisterComponent(slot: string, name: string): void
    /** Returns the components currently registered in a slot, keyed by name. */
    getComponents(slot: string): ReadonlyMap<string, Component>

    /** Subscribes to an event on the shared internal/plugin event bus. */
    on(event: string, handler: PluginEventHandler): void
    /** Unsubscribes a handler (or all handlers for `event` if omitted). */
    off(event: string, handler?: PluginEventHandler): void
    /** Emits an event on the shared internal/plugin event bus. */
    emit(event: string, ...args: unknown[]): void

    /**
     * Subscribes to live Klipper object-model updates (every
     * notify_status_update push and printer.objects.query response).
     * Returns an unsubscribe function.
     */
    subscribeToPrinterObject(callback: (printerState: PrinterState) => void): () => void

    /**
     * Sends a G-code script to Klipper, exactly as if the user had typed it into the console -
     * it's logged to the console history the same way. `M112` is special-cased to the dedicated
     * emergency-stop RPC rather than sent as a literal script, matching the console's own
     * behavior. This is the only way a plugin can command the printer - there's deliberately no
     * lower-level websocket-emit passthrough on this API surface.
     */
    sendGcode(script: string): void

    /**
     * Registers a brand-new top-level page: adds a Vue Router route and a
     * sidebar navigation entry. Returns a function that removes both.
     */
    registerPage(config: PluginPageConfig): () => void

    /**
     * Replaces the component rendered for Mainsail's Dashboard route
     * (path `/`) while the plugin is active - e.g. for a plugin providing an
     * alternate, fully custom dashboard/shell. Returns a function that
     * restores the original Dashboard component.
     */
    overrideDashboard(component: Component): () => void

    /**
     * Registers a tab in the Interface Settings dialog. Returns a function
     * that removes it.
     */
    registerSettingsTab(key: string, config: PluginSettingsTabConfig): () => void

    /**
     * Reads/writes a plugin's own persisted data, namespaced by `pluginId` so
     * different plugins' data can't collide. Backed by the same Moonraker
     * database mechanism every built-in Mainsail setting already persists
     * through - no server-side changes required. `getPluginData` resolves
     * `undefined` if nothing has been stored yet for that key.
     */
    getPluginData<T = unknown>(pluginId: string, key: string): Promise<T | undefined>
    setPluginData(pluginId: string, key: string, value: unknown): Promise<void>
}

export interface PluginPageConfig {
    /** Unique route name - must not collide with Mainsail's own route names or another plugin's. */
    name: string
    /** Sidebar label, shown as-is (not passed through Mainsail's own i18n lookup). */
    title: string
    /** URL path, e.g. "/my-plugin". */
    path: string
    component: Component
    /** MDI icon path (from `@mdi/js` or any other source), shown in the sidebar. */
    icon?: string
    /** Sidebar ordering, lower first. Defaults to appearing after all of Mainsail's own entries. */
    position?: number
}

export interface PluginSettingsTabConfig {
    /** Tab label, shown as-is (not passed through Mainsail's own i18n lookup). */
    title: string
    icon: string
    component: Component
}

/** The shape every dynamically-loaded plugin module must export. */
export interface MainsailPluginModule {
    install(api: MainsailPluginApi): void
    /**
     * Optional best-effort teardown hook, called when a plugin is disabled or
     * uninstalled from the Plugins settings tab without a page reload. A
     * well-behaved plugin should undo here whatever `install()` registered
     * (unregisterDashboardPanel/unregisterComponent/off/unsubscribe
     * callbacks). Plugins that don't export this simply won't be hot-torn-down
     * - their registrations are cleared on the next reload instead, same as
     * DuetWebControl's own plugin manager, which recommends a restart after
     * removing a plugin rather than promising seamless hot-uninstall.
     */
    uninstall?(api: MainsailPluginApi): void
}

declare global {
    interface Window {
        Mainsail?: MainsailPluginApi
    }
}
