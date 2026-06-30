// Vue 3 removes the `new Vue()` event-bus pattern. This is a minimal drop-in
// emitter that preserves the `$on` / `$off` / `$emit` API the existing call
// sites rely on, so components can be migrated incrementally. Phase 4 replaces
// this with the `window.Mainsail` plugin event bus.
type EventHandler = (...args: unknown[]) => void

class Emitter {
    private handlers = new Map<string, Set<EventHandler>>()

    $on(event: string, handler: EventHandler): void {
        if (!this.handlers.has(event)) this.handlers.set(event, new Set())
        this.handlers.get(event)?.add(handler)
    }

    $off(event: string, handler?: EventHandler): void {
        if (!handler) {
            this.handlers.delete(event)
            return
        }

        this.handlers.get(event)?.delete(handler)
    }

    $emit(event: string, ...args: unknown[]): void {
        this.handlers.get(event)?.forEach((handler) => handler(...args))
    }
}

export const EventBus = new Emitter()

export const CLOSE_CONTEXT_MENU = 'close-context-menu'
