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
}

/** The shape every dynamically-loaded plugin module must export. */
export interface MainsailPluginModule {
    install(api: MainsailPluginApi): void
}

declare global {
    interface Window {
        Mainsail?: MainsailPluginApi
    }
}
