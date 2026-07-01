// Vue 3 removes the `new Vue()` event-bus pattern. This minimal emitter is
// the single shared event bus for both internal app code and externally
// loaded plugins - internal code imports `on`/`off`/`emit` directly from
// this module, external plugins reach the same instance through
// `window.Mainsail.on`/`off`/`emit`. Replaces the old src/plugins/eventBus.ts.
export type PluginEventHandler = (...args: unknown[]) => void

class Emitter {
    private handlers = new Map<string, Set<PluginEventHandler>>()

    on(event: string, handler: PluginEventHandler): void {
        if (!this.handlers.has(event)) this.handlers.set(event, new Set())
        this.handlers.get(event)?.add(handler)
    }

    off(event: string, handler?: PluginEventHandler): void {
        if (!handler) {
            this.handlers.delete(event)
            return
        }

        this.handlers.get(event)?.delete(handler)
    }

    emit(event: string, ...args: unknown[]): void {
        this.handlers.get(event)?.forEach((handler) => handler(...args))
    }
}

const emitter = new Emitter()

export const on = emitter.on.bind(emitter)
export const off = emitter.off.bind(emitter)
export const emit = emitter.emit.bind(emitter)

export const CLOSE_CONTEXT_MENU = 'close-context-menu'
