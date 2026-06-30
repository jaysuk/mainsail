// Pinia migration helpers.
//
// In Vue 3 every assignment on a reactive proxy is tracked, so the Vue 2
// `Vue.set` / `Vue.delete` pattern is no longer required. For high-frequency
// Moonraker object-model updates we merge incoming partial payloads into the
// existing reactive state *in place* (rather than replacing whole branches),
// which keeps proxy identity stable and avoids re-wrapping objects in a new
// reactive Proxy on every websocket frame.

type PlainObject = Record<string, unknown>

const isPlainObject = (value: unknown): value is PlainObject =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Recursively merge `source` into `target` in place. Nested plain objects are
 * merged key-by-key; arrays and primitives replace the previous value.
 * Returns `target` for convenience.
 */
export function deepMerge<T extends object>(target: T, source: PlainObject): T {
    const sink = target as PlainObject

    for (const key of Object.keys(source)) {
        const value = source[key]
        const existing = sink[key]

        if (isPlainObject(value) && isPlainObject(existing)) {
            deepMerge(existing, value)
        } else {
            sink[key] = value
        }
    }

    return target
}

/**
 * Reset a reactive state object back to a freshly built default, mutating in
 * place so the store's reactive reference stays intact. Keys present in the
 * current state but absent from the defaults are removed, unless their name is
 * listed in `keep`.
 */
export function resetState<T extends object>(state: T, getDefaultState: () => T, keep: string[] = []): void {
    const defaults = getDefaultState() as PlainObject
    const sink = state as PlainObject

    for (const key of Object.keys(state)) {
        if (!(key in defaults) && !keep.includes(key)) {
            delete sink[key]
        }
    }

    Object.assign(state, defaults)
}
