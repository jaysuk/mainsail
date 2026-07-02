import { mainsailApi } from '@/plugins/mainsail'
import type { MainsailPluginModule } from '@/plugins/mainsail/types'

type Importer = (url: string) => Promise<unknown>

const defaultImporter: Importer = (url) => import(/* @vite-ignore */ url)

function resolveInstall(module: unknown): MainsailPluginModule['install'] | null {
    const candidate = module as { install?: unknown; default?: { install?: unknown } }

    if (typeof candidate.install === 'function') return candidate.install as MainsailPluginModule['install']
    if (typeof candidate.default?.install === 'function') return candidate.default.install as MainsailPluginModule['install']

    return null
}

function resolveUninstall(module: unknown): MainsailPluginModule['uninstall'] | null {
    const candidate = module as { uninstall?: unknown; default?: { uninstall?: unknown } }

    if (typeof candidate.uninstall === 'function') return candidate.uninstall as MainsailPluginModule['uninstall']
    if (typeof candidate.default?.uninstall === 'function') return candidate.default.uninstall as MainsailPluginModule['uninstall']

    return null
}

/**
 * Dynamically imports each plugin URL (from config.json's `plugins` list) as
 * an ES module and calls its `install(api)` export, resolving injected
 * components into the useLayoutStore registry via window.Mainsail.
 *
 * `importer` is injectable so tests can exercise this without needing a real
 * network-resolvable module URL.
 */
export async function loadPlugins(pluginUrls: string[], importer: Importer = defaultImporter): Promise<void> {
    for (const url of pluginUrls) {
        try {
            const module = await importer(url)
            const install = resolveInstall(module)

            if (!install) {
                window.console.error(`Mainsail plugin at "${url}" does not export an install(api) function - skipped`)
                continue
            }

            install(mainsailApi)
            window.console.info(`Loaded Mainsail plugin: ${url}`)
        } catch (e) {
            window.console.error(`Failed to load Mainsail plugin at "${url}"`, e)
        }
    }
}

/**
 * Best-effort hot-unload of a plugin previously loaded by `loadPlugins`.
 * Re-imports the URL (the browser's ESM module cache makes this cheap - it
 * returns the already-evaluated module record rather than re-fetching/
 * re-executing it) and calls its `uninstall(api)` export if present.
 *
 * Returns whether an `uninstall` export was actually found and called. A
 * `false` return means the plugin has no teardown hook, so whatever it
 * registered via `install()` is still live until the next page reload -
 * callers should surface that to the user rather than claiming a clean
 * removal.
 *
 * Note this only undoes what `uninstall()` itself explicitly tears down -
 * any module-scope side effect a plugin created outside of `install()`
 * (e.g. a top-level `setInterval`) is untouched, since the module isn't
 * re-executed.
 */
export async function unloadPlugin(url: string, importer: Importer = defaultImporter): Promise<boolean> {
    try {
        const module = await importer(url)
        const uninstall = resolveUninstall(module)

        if (!uninstall) return false

        uninstall(mainsailApi)
        window.console.info(`Unloaded Mainsail plugin: ${url}`)
        return true
    } catch (e) {
        window.console.error(`Failed to unload Mainsail plugin at "${url}"`, e)
        return false
    }
}
