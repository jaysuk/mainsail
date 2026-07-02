import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { zipSync, strToU8 } from 'fflate'
import { parsePluginPackage, installPluginPackage, PluginPackageError } from '@/plugins/mainsail/packageInstall'
import { useFilesStore } from '@/store/files'

const validManifest = {
    id: 'my_plugin',
    name: 'My Plugin',
    author: 'Someone',
    version: '1.0.0',
}

function buildZip(overrides: {
    manifest?: unknown
    entryFile?: string | null
    extraFiles?: Record<string, string>
    manifestFilename?: string
}): Uint8Array {
    const files: Record<string, Uint8Array> = {}

    if (overrides.manifest !== undefined) {
        files[overrides.manifestFilename ?? 'plugin.json'] = strToU8(JSON.stringify(overrides.manifest))
    }

    if (overrides.entryFile !== null) {
        files['mainsail/index.js'] = strToU8(overrides.entryFile ?? 'export function install() {}')
    }

    for (const [path, content] of Object.entries(overrides.extraFiles ?? {})) {
        files[path] = strToU8(content)
    }

    return zipSync(files)
}

describe('parsePluginPackage', () => {
    it('parses a valid package into its manifest and mainsail/-relative asset files', () => {
        const zip = buildZip({ manifest: validManifest, extraFiles: { 'mainsail/style.css': 'body {}' } })

        const { manifest, files } = parsePluginPackage(zip)

        expect(manifest).toEqual(validManifest)
        expect(files.map((f) => f.path).sort()).toEqual(['index.js', 'style.css'])
    })

    it('ignores files outside the mainsail/ directory (directory-scoped install, matches DWC)', () => {
        const zip = buildZip({ manifest: validManifest, extraFiles: { 'README.md': 'hi' } })

        const { files } = parsePluginPackage(zip)

        expect(files.some((f) => f.path === 'README.md')).toBe(false)
    })

    it('rejects a non-zip payload', () => {
        expect(() => parsePluginPackage(new Uint8Array([1, 2, 3]))).toThrow(PluginPackageError)
    })

    it('rejects a package with no plugin.json', () => {
        const zip = buildZip({})

        expect(() => parsePluginPackage(zip)).toThrow(PluginPackageError)
    })

    it('rejects an unparsable plugin.json', () => {
        const zip = zipSync({ 'plugin.json': strToU8('not json'), 'mainsail/index.js': strToU8('') })

        expect(() => parsePluginPackage(zip)).toThrow(PluginPackageError)
    })

    it.each(['id', 'name', 'author', 'version'])('rejects a manifest missing required field "%s"', (field) => {
        const manifest = { ...validManifest } as Record<string, unknown>
        delete manifest[field]
        const zip = buildZip({ manifest })

        expect(() => parsePluginPackage(zip)).toThrow(PluginPackageError)
    })

    it('rejects a manifest id containing non-alphanumeric/underscore characters', () => {
        const zip = buildZip({ manifest: { ...validManifest, id: '../evil' } })

        expect(() => parsePluginPackage(zip)).toThrow(PluginPackageError)
    })

    it('rejects a package with a path-traversal entry', () => {
        const zip = buildZip({ manifest: validManifest, extraFiles: { 'mainsail/../../../etc/passwd': 'nope' } })

        expect(() => parsePluginPackage(zip)).toThrow(PluginPackageError)
    })

    it('rejects a package missing the mainsail/index.js entry file', () => {
        const zip = buildZip({ manifest: validManifest, entryFile: null })

        expect(() => parsePluginPackage(zip)).toThrow(PluginPackageError)
    })
})

describe('installPluginPackage', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('uploads every mainsail/ asset file and returns the manifest plus a fetchable entry URL', async () => {
        const zip = buildZip({ manifest: validManifest, extraFiles: { 'mainsail/style.css': 'body {}' } })
        const zipFile = new File([zip as Uint8Array<ArrayBuffer>], 'plugin.zip')

        const uploadFile = vi.spyOn(useFilesStore(), 'uploadFile').mockResolvedValue('index.js')

        const result = await installPluginPackage(zipFile)

        expect(uploadFile).toHaveBeenCalledTimes(2)
        expect(uploadFile).toHaveBeenCalledWith(expect.objectContaining({ root: 'config', path: 'plugins/my_plugin' }))
        expect(result).toMatchObject(validManifest)
        expect(result.entryUrl).toContain('/server/files/config/plugins/my_plugin/index.js')
    })

    it('throws if a file upload fails', async () => {
        const zip = buildZip({ manifest: validManifest })
        const zipFile = new File([zip as Uint8Array<ArrayBuffer>], 'plugin.zip')

        vi.spyOn(useFilesStore(), 'uploadFile').mockResolvedValue(false)

        await expect(installPluginPackage(zipFile)).rejects.toThrow(PluginPackageError)
    })
})
