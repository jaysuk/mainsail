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
