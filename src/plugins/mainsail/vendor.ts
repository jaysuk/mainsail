/**
 * Exposes Mainsail's own Vue module instance as a stable `window` global, so externally hosted
 * plugins (loaded via pluginLoader.ts's dynamic `import(url)`) can share it instead of bundling
 * their own separate copy of Vue.
 *
 * This matters because a plugin bundling its own copy of `vue` isn't just wasteful - it actively
 * breaks anything relying on Vue's app-instance context (provide/inject, Vuetify's internal
 * injection keys, etc.), since two separate Vue module instances don't share reactivity or
 * component-tree context even when rendered into the same DOM. Browsers also have no import map
 * here, so a plugin's compiled `import { ref } from 'vue'` can't resolve a bare specifier at all
 * without something to point at.
 *
 * A plain `window` global (rather than trying to get Rollup/Vite to emit a real, stably-named ESM
 * re-export chunk plugins could `import` by URL) is the robust choice here: an attempt at the
 * URL-based approach hit Rollup/Rolldown tree-shaking away the re-export from a standalone entry
 * point with no consumers in Mainsail's own build graph, since nothing in Mainsail's own app
 * imports from it - only an external, dynamically-loaded-at-runtime plugin does, which the
 * bundler's static analysis has no way to see coming. A plugin's build resolves `vue` to a small
 * local shim (see that plugin's own build config) that reads off this global instead.
 *
 * Installed by installMainsailApi() (src/plugins/mainsail/index.ts), which runs at the very start
 * of main.ts - guaranteed to execute long before any plugin could possibly load (plugins only load
 * after the app mounts and, for database-persisted ones, after Moonraker's settings round-trip
 * resolves).
 */
import * as Vue from 'vue'

declare global {
    interface Window {
        __mainsailVendor?: {
            vue: typeof Vue
        }
    }
}

export function installVendorGlobals(): void {
    if (typeof window === 'undefined') return

    window.__mainsailVendor = {
        vue: Vue,
    }
}
