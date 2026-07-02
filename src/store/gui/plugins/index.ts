import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type { GuiPluginsState, GuiPluginsStatePlugin } from '@/store/gui/plugins/types'
import { caseInsensitiveSort } from '@/plugins/helpers'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { loadPlugins, unloadPlugin } from '@/plugins/mainsail/pluginLoader'
import { useToast } from 'vue-toast-notification'
import i18n from '@/plugins/i18n'
import type { PluginManifest } from '@/plugins/mainsail/packageInstall'

const t = i18n.global.t

export const getDefaultState = (): GuiPluginsState => ({
    plugins: {},
})

export const useGuiPluginsStore = defineStore('guiPlugins', () => {
    const state = reactive<GuiPluginsState>(getDefaultState())

    const getPlugins = computed<GuiPluginsStatePlugin[]>(() => {
        const plugins = Object.values(state.plugins)

        return caseInsensitiveSort(plugins, 'name')
    })

    const reset = () => resetState(state, getDefaultState)

    const setData = (payload: Partial<GuiPluginsState>) => deepMerge(state, payload)

    const upload = (payload: { id: string; value: GuiPluginsStatePlugin }) => {
        webSocketClient.emit('server.database.post_item', {
            namespace: 'mainsail',
            key: 'plugins.plugins.' + payload.id,
            value: payload.value,
        })
    }

    // Keyed by the plugin's own manifest id (not a fresh uuid like other
    // settings lists use) - reinstalling the same plugin should overwrite
    // its existing entry, not create a duplicate.
    const install = async (payload: { manifest: PluginManifest; entryUrl: string }) => {
        const plugin: GuiPluginsStatePlugin = {
            id: payload.manifest.id,
            name: payload.manifest.name,
            author: payload.manifest.author,
            version: payload.manifest.version,
            license: payload.manifest.license,
            homepage: payload.manifest.homepage,
            entryUrl: payload.entryUrl,
            enabled: true,
        }

        state.plugins[plugin.id] = plugin
        upload({ id: plugin.id, value: plugin })

        await loadPlugins([plugin.entryUrl])
    }

    const toggleEnabled = async (id: string) => {
        const plugin = state.plugins[id]
        if (!plugin) return

        plugin.enabled = !plugin.enabled
        upload({ id, value: plugin })

        if (plugin.enabled) {
            await loadPlugins([plugin.entryUrl])
            return
        }

        const cleanlyUnloaded = await unloadPlugin(plugin.entryUrl)
        if (!cleanlyUnloaded) useToast().warning(t('Settings.PluginsTab.ReloadRequired'))
    }

    const uninstall = async (id: string) => {
        const plugin = state.plugins[id]
        if (!plugin) return

        const cleanlyUnloaded = await unloadPlugin(plugin.entryUrl)
        if (!cleanlyUnloaded) useToast().warning(t('Settings.PluginsTab.ReloadRequired'))

        webSocketClient.emit('server.files.delete_directory', { path: 'config/plugins/' + id, force: true })
        webSocketClient.emit('server.database.delete_item', { namespace: 'mainsail', key: 'plugins.plugins.' + id })

        delete state.plugins[id]
    }

    return {
        ...toRefs(state),
        getPlugins,
        reset,
        setData,
        install,
        toggleEnabled,
        uninstall,
    }
})
