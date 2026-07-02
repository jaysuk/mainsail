import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGuiPluginsStore } from '@/store/gui/plugins'
import { webSocketClient } from '@/plugins/webSocketClient'
import { loadPlugins, unloadPlugin } from '@/plugins/mainsail/pluginLoader'

vi.mock('@/plugins/mainsail/pluginLoader', () => ({
    loadPlugins: vi.fn().mockResolvedValue(undefined),
    unloadPlugin: vi.fn().mockResolvedValue(true),
}))

const manifest = { id: 'my_plugin', name: 'My Plugin', author: 'Someone', version: '1.0.0' }
const entryUrl = 'http://printer.local/server/files/config/plugins/my_plugin/index.js'

describe('gui/plugins store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('install() persists the entry keyed by the manifest id, and loads it live', async () => {
        const emitSpy = vi.spyOn(webSocketClient, 'emit').mockImplementation(() => {})
        const store = useGuiPluginsStore()

        await store.install({ manifest, entryUrl })

        expect(store.getPlugins).toHaveLength(1)
        expect(store.getPlugins[0]).toMatchObject({ id: 'my_plugin', name: 'My Plugin', enabled: true, entryUrl })
        expect(emitSpy).toHaveBeenCalledWith(
            'server.database.post_item',
            expect.objectContaining({ namespace: 'mainsail', key: 'plugins.plugins.my_plugin' })
        )
        expect(loadPlugins).toHaveBeenCalledWith([entryUrl])
    })

    it('installing the same plugin id again overwrites the existing entry instead of duplicating it', async () => {
        vi.spyOn(webSocketClient, 'emit').mockImplementation(() => {})
        const store = useGuiPluginsStore()

        await store.install({ manifest, entryUrl })
        await store.install({ manifest: { ...manifest, version: '2.0.0' }, entryUrl })

        expect(store.getPlugins).toHaveLength(1)
        expect(store.getPlugins[0].version).toBe('2.0.0')
    })

    it('toggleEnabled(id) flips enabled, re-persists, and loads/unloads accordingly', async () => {
        const emitSpy = vi.spyOn(webSocketClient, 'emit').mockImplementation(() => {})
        const store = useGuiPluginsStore()
        await store.install({ manifest, entryUrl })
        vi.clearAllMocks()

        await store.toggleEnabled('my_plugin')

        expect(store.getPlugins[0].enabled).toBe(false)
        expect(unloadPlugin).toHaveBeenCalledWith(entryUrl)
        expect(emitSpy).toHaveBeenCalledWith('server.database.post_item', expect.objectContaining({ key: 'plugins.plugins.my_plugin' }))

        await store.toggleEnabled('my_plugin')

        expect(store.getPlugins[0].enabled).toBe(true)
        expect(loadPlugins).toHaveBeenCalledWith([entryUrl])
    })

    it('uninstall(id) deletes the directory and database entry, and removes it from state', async () => {
        const emitSpy = vi.spyOn(webSocketClient, 'emit').mockImplementation(() => {})
        const store = useGuiPluginsStore()
        await store.install({ manifest, entryUrl })
        vi.clearAllMocks()

        await store.uninstall('my_plugin')

        expect(store.getPlugins).toHaveLength(0)
        expect(unloadPlugin).toHaveBeenCalledWith(entryUrl)
        expect(emitSpy).toHaveBeenCalledWith('server.files.delete_directory', { path: 'config/plugins/my_plugin', force: true })
        expect(emitSpy).toHaveBeenCalledWith('server.database.delete_item', { namespace: 'mainsail', key: 'plugins.plugins.my_plugin' })
    })

    it('getPlugins is sorted case-insensitively by name', async () => {
        vi.spyOn(webSocketClient, 'emit').mockImplementation(() => {})
        const store = useGuiPluginsStore()

        await store.install({ manifest: { ...manifest, id: 'zzz', name: 'zebra plugin' }, entryUrl })
        await store.install({ manifest: { ...manifest, id: 'aaa', name: 'Apple Plugin' }, entryUrl })

        expect(store.getPlugins.map((p) => p.id)).toEqual(['aaa', 'zzz'])
    })
})
