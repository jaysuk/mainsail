import { unzipSync } from 'fflate'
import { useFilesStore } from '@/store/files'
import { useSocketStore } from '@/store/socket'

/**
 * Mirrors DuetWebControl's plugin.json manifest, trimmed to the fields that
 * make sense for Mainsail's client-side-only plugin model (no SBC/DSF
 * equivalent - Mainsail has no server-side plugin execution).
 */
export interface PluginManifest {
    id: string
    name: string
    author: string
    version: string
    license?: string
    homepage?: string
    mainsailVersion?: string
}

export class PluginPackageError extends Error {}

const MANIFEST_FILENAME = 'plugin.json'
const ASSET_DIR = 'mainsail/'
const ENTRY_FILENAME = 'index.js'

const ID_PATTERN = /^[a-zA-Z0-9_]+$/

function isPluginManifest(value: unknown): value is PluginManifest {
    if (typeof value !== 'object' || value === null) return false

    const candidate = value as Record<string, unknown>

    return (
        typeof candidate.id === 'string' &&
        ID_PATTERN.test(candidate.id) &&
        typeof candidate.name === 'string' &&
        candidate.name.length > 0 &&
        typeof candidate.author === 'string' &&
        candidate.author.length > 0 &&
        typeof candidate.version === 'string' &&
        candidate.version.length > 0
    )
}

/**
 * Parses+validates an uploaded plugin .zip: reads plugin.json, rejects
 * malformed/missing manifests, and rejects any entry path containing `..`
 * (the same directory-traversal guard DuetWebControl's own plugin installer
 * documents) before any file is ever uploaded to Moonraker. Only files under
 * `mainsail/` (the DWC `dwc/`-directory equivalent) are treated as web
 * assets - anything else in the zip is ignored, matching DWC's
 * directory-scoped install.
 */
export function parsePluginPackage(zipBytes: Uint8Array): { manifest: PluginManifest; files: { path: string; data: Uint8Array }[] } {
    let entries: Record<string, Uint8Array>

    try {
        entries = unzipSync(zipBytes)
    } catch {
        throw new PluginPackageError('notAZip')
    }

    for (const path of Object.keys(entries)) {
        if (path.split('/').includes('..')) throw new PluginPackageError('pathTraversal')
    }

    const manifestBytes = entries[MANIFEST_FILENAME]
    if (!manifestBytes) throw new PluginPackageError('missingManifest')

    let manifest: unknown
    try {
        manifest = JSON.parse(new TextDecoder().decode(manifestBytes))
    } catch {
        throw new PluginPackageError('invalidManifest')
    }

    if (!isPluginManifest(manifest)) throw new PluginPackageError('invalidManifest')

    const files = Object.keys(entries)
        .filter((path) => path.startsWith(ASSET_DIR) && !path.endsWith('/'))
        .map((path) => ({ path: path.slice(ASSET_DIR.length), data: entries[path] }))

    if (!files.some((file) => file.path === ENTRY_FILENAME)) throw new PluginPackageError('missingEntryFile')

    return { manifest, files }
}

/**
 * Extracts an uploaded plugin package client-side, uploads its web assets to
 * Moonraker through the existing /server/files/upload endpoint (the same one
 * every config-file operation already uses - no Moonraker changes), and
 * returns the manifest plus the fetchable URL for the plugin's entry file.
 */
export async function installPluginPackage(zipFile: File): Promise<PluginManifest & { entryUrl: string }> {
    const zipBytes = new Uint8Array(await zipFile.arrayBuffer())
    const { manifest, files } = parsePluginPackage(zipBytes)

    const filesStore = useFilesStore()
    const pluginPath = 'plugins/' + manifest.id

    for (const file of files) {
        const filename = file.path.includes('/') ? file.path.slice(file.path.lastIndexOf('/') + 1) : file.path
        const subPath = file.path.includes('/') ? pluginPath + '/' + file.path.slice(0, file.path.lastIndexOf('/')) : pluginPath

        // fflate's Uint8Array results are always backed by a real ArrayBuffer
        // at runtime; the ArrayBufferLike-vs-ArrayBuffer generic mismatch here
        // is TS's typed-array types being broader than what unzipSync can
        // actually produce.
        const uploaded = await filesStore.uploadFile({
            file: new File([file.data as Uint8Array<ArrayBuffer>], filename),
            root: 'config',
            path: subPath,
        })

        if (uploaded === false) throw new PluginPackageError('uploadFailed')
    }

    const apiUrl = useSocketStore().getUrl
    const entryUrl = `${apiUrl}/server/files/config/${pluginPath}/${ENTRY_FILENAME}`

    return { ...manifest, entryUrl }
}
