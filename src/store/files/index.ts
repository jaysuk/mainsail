import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import { useToast } from 'vue-toast-notification'
import axios, { type AxiosProgressEvent, type AxiosResponse, type CancelTokenSource } from 'axios'
import type {
    ApiGetDirectoryReturn,
    ApiGetDirectoryReturnDir,
    ApiGetDirectoryReturnFile,
    FileState,
    FileStateFile,
    FileStateGcodefile,
} from '@/store/files/types'
import type { ServerHistoryStateJob } from '@/store/server/history/types'
import i18n from '@/plugins/i18n'
import { allowedMetadata, hiddenDirectories, themeDir, thumbnailBigMin, thumbnailSmallMax, thumbnailSmallMin, validGcodeExtensions } from '@/store/variables'
import { escapePath, findDirectory as findDirectoryDeep } from '@/plugins/helpers'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient, type BatchMessage } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'
import { useServerStore } from '@/store/server'
import { useServerHistoryStore } from '@/store/server/history'
import { usePrinterStore } from '@/store/printer'

const t = i18n.global.t

export const getDefaultState = (): FileState => ({
    filetree: [],
    upload: {
        show: false,
        filename: '',
        currentNumber: 0,
        maxNumber: 0,
        cancelTokenSource: null,
        percent: 0,
        speed: 0,
    },
})

export const useFilesStore = defineStore('files', () => {
    const state = reactive<FileState>(getDefaultState())

    // --- getters ---
    const getDirectory = (requestedPath: string): FileStateFile | null => {
        if (requestedPath.startsWith('/')) requestedPath = requestedPath.substring(1)
        if (requestedPath.endsWith('/')) requestedPath = requestedPath.substring(0, requestedPath.length - 1)

        const walk = (filetree: FileStateFile, pathArray: string[]): FileStateFile | null => {
            if (pathArray.length) {
                const newFiletree = filetree?.childrens?.find(
                    (element: FileStateFile) => element.isDirectory && element.filename === pathArray[0]
                )

                if (!newFiletree) return null

                pathArray.shift()
                return walk(newFiletree, pathArray)
            }

            return filetree
        }

        return walk({ childrens: state.filetree } as FileStateFile, requestedPath.split('/'))
    }

    const getFile = (requestedFilename: string) => {
        const path = requestedFilename.slice(0, requestedFilename.lastIndexOf('/'))
        const filename = requestedFilename.slice(requestedFilename.lastIndexOf('/') + 1)
        const directory = getDirectory(path)

        return directory?.childrens?.find((file: FileStateFile) => file.filename === filename && !file.isDirectory)
    }

    const getGcodeFiles = (path: string | null, boolShowHiddenFiles: boolean, boolShowPrintedFiles: boolean): FileStateGcodefile[] => {
        const rootGcodes = getDirectory('gcodes')
        if (rootGcodes === null) return []

        let files: FileStateFile[] = []

        if (path !== null) {
            const directory = getDirectory('gcodes' + path)
            files = directory?.childrens ?? []
        } else {
            const searchGcodes = (directory: FileStateFile, currentPath: string) => {
                if (directory.isDirectory && directory.childrens?.length) {
                    directory.childrens?.forEach((file) => {
                        if (!file.isDirectory) {
                            const tmp = { ...file }
                            tmp.filename = currentPath + file.filename
                            files.push(tmp)
                        } else searchGcodes(file, currentPath + file.filename + '/')
                    })
                }
            }

            searchGcodes(rootGcodes, '')
        }

        files = files.filter((file: FileStateFile) => {
            if (!boolShowHiddenFiles && (file.filename === 'thumbs' || file.filename.startsWith('.'))) return false

            if (file.isDirectory) return true

            const pos = file.filename.lastIndexOf('.')
            const extension = file.filename.slice(pos)

            return validGcodeExtensions.includes(extension)
        })

        const gcodes = Object.keys(usePrinterStore().gcode?.commands ?? {})
        const preheat_gcode_objects = [
            { name: 'first_layer_extr_temp', gcode: 'M104' },
            { name: 'first_layer_bed_temp', gcode: 'M140' },
            { name: 'chamber_temp', gcode: 'M141' },
        ].filter((obj) => gcodes.includes(obj.gcode))

        const historyStore = useServerHistoryStore()
        const output: FileStateGcodefile[] = []
        files.forEach((file: FileStateFile) => {
            const fileTimestamp = typeof file.modified.getTime === 'function' ? file.modified.getTime() : 0
            const tmp: FileStateGcodefile = {
                ...file,
                full_filename: path ? path + '/' + file.filename : file.filename,
                preheat_gcode: null,
                count_printed: 0,
                last_start_time: null,
                last_end_time: null,
                last_filament_used: null,
                last_status: null,
                last_print_duration: null,
                last_total_duration: null,
            }

            const preheat_gcode_array: string[] = []
            preheat_gcode_objects.forEach((object) => {
                if (object.name in file && file[object.name] > 1) {
                    preheat_gcode_array.push(`${object.gcode} S${file[object.name]}`)
                }
            })

            if (preheat_gcode_array.length) {
                tmp.preheat_gcode = preheat_gcode_array.join('\n')
            }

            let histories: ServerHistoryStateJob[] = historyStore.getPrintJobsForGcodes(
                tmp.full_filename,
                fileTimestamp,
                file.size ?? 0,
                file.uuid ?? null,
                file.job_id ?? null
            )

            if (histories && histories.length) {
                histories = histories.sort((a, b) => b.start_time - a.start_time)

                const histories_completed = histories.filter((history) => history.status === 'completed')

                const last_history = [...histories].shift()
                if (last_history) {
                    tmp.last_status = last_history.status
                    tmp.count_printed = histories_completed.length
                    tmp.last_start_time = new Date(last_history.start_time * 1000)
                }

                if (tmp.count_printed > 0) {
                    const history_completed = histories_completed[0]
                    tmp.last_start_time = new Date(history_completed.start_time * 1000)
                    tmp.last_end_time = new Date(history_completed.end_time * 1000)
                    tmp.last_filament_used = history_completed.filament_used
                    tmp.last_print_duration = history_completed.print_duration
                    tmp.last_total_duration = history_completed.total_duration
                }
            }

            if (boolShowPrintedFiles) output.push(tmp)
            else if (tmp.count_printed === 0) output.push(tmp)
        })

        return output
    }

    const getAllGcodes = () => getGcodeFiles(null, false, true)

    const getThemeFileUrl = (acceptName: string, acceptExtensions: string[]) => {
        const directory = getDirectory('config/' + themeDir)

        const file = directory?.childrens?.find(
            (element: FileStateFile) =>
                element.filename?.slice(0, element.filename?.lastIndexOf('.')) === acceptName &&
                acceptExtensions.includes(element.filename?.slice(element.filename?.lastIndexOf('.') + 1))
        )
        if (!file) return null

        return `${useSocketStore().getUrl}/server/files/config/${themeDir}/${file.filename}?timestamp=${file.modified.getTime()}`
    }

    const getSidebarLogo = () => getThemeFileUrl('sidebar-logo', ['svg', 'jpg', 'jpeg', 'png', 'gif']) ?? ''

    const getCustomSidebarBackground = () => getThemeFileUrl('sidebar-background', ['jpg', 'jpeg', 'png', 'gif', 'svg']) ?? null

    const getMainBackground = () => getThemeFileUrl('main-background', ['jpg', 'jpeg', 'png', 'gif', 'svg'])

    const getCustomStylesheet = () => getThemeFileUrl('custom', ['css']) ?? null

    const getCustomNaviPoints = () => getThemeFileUrl('navi', ['json']) ?? null

    const getCustomFavicons = () => {
        const acceptExtensions = ['png', 'svg']
        const favicon16 = getThemeFileUrl('favicon-32x32', acceptExtensions)
        const favicon32 = getThemeFileUrl('favicon-32x32', acceptExtensions)

        if (favicon16 && favicon32) return [favicon16, favicon32]
        else if (favicon16) return [favicon16, favicon16]
        else if (favicon32) return [favicon32, favicon32]

        return null
    }

    const getDiskUsage = (path: string) => {
        if (path.indexOf('/') === 0) path = path.substr(1)
        if (path.indexOf('/') !== -1) path = path.substr(0, path.indexOf('/'))

        const dir = state.filetree.find((dir) => dir.filename === path)
        if (dir && 'disk_usage' in dir) return dir.disk_usage

        return null
    }

    const checkConfigFile = (acceptName: string) => {
        const directory = getDirectory('config')

        return (
            directory?.childrens?.findIndex(
                (element: FileStateFile) => element.filename !== undefined && element.filename === acceptName
            ) !== -1
        )
    }

    const getSmallThumbnail = (item: FileStateFile, currentPath: string) => {
        if ('thumbnails' in item && item.thumbnails?.length) {
            const thumbnail = item.thumbnails.find(
                (thumb) =>
                    thumb.width >= thumbnailSmallMin &&
                    thumb.width <= thumbnailSmallMax &&
                    thumb.height >= thumbnailSmallMin &&
                    thumb.height <= thumbnailSmallMax
            )

            if (thumbnail && 'relative_path' in thumbnail) {
                return `${useSocketStore().getUrl}/server/files/${escapePath(currentPath)}/${escapePath(thumbnail.relative_path)}?timestamp=${item.modified.getTime()}`
            }
        }

        return ''
    }

    const getBigThumbnail = (item: FileStateFile, currentPath: string) => {
        if ('thumbnails' in item && item.thumbnails?.length) {
            const thumbnail = item.thumbnails.find((thumb) => thumb.width >= thumbnailBigMin)

            if (thumbnail && 'relative_path' in thumbnail) {
                return `${useSocketStore().getUrl}/server/files/${escapePath(currentPath)}/${escapePath(thumbnail.relative_path)}?timestamp=${item.modified.getTime()}`
            }
        }

        return ''
    }

    // --- internal state setters (former mutations) ---
    const createRootDir = (payload: { name: string; permissions: string }) => {
        state.filetree.push({
            isDirectory: true,
            filename: payload.name,
            modified: new Date(),
            permissions: payload.permissions,
            childrens: [],
            disk_usage: { free: 0, total: 0, used: 0 },
        })
    }

    const setMetadataRequested = (payload: { filename: string }) => {
        let filename = 'gcodes/' + payload.filename
        const dirArray = filename.split('/')
        filename = dirArray[dirArray.length - 1]
        const path = findDirectoryDeep(state.filetree, dirArray)

        const fileIndex = path?.findIndex((element: FileStateFile) => element.filename === filename)
        if (path && fileIndex !== undefined && fileIndex !== -1) {
            path[fileIndex].metadataRequested = true
        } else window.console.error('file not found in filetree: ' + payload.filename)
    }

    const setMetadata = (payload: Record<string, unknown> & { filename: string }) => {
        let filename = 'gcodes/' + payload.filename
        const dirArray = filename.split('/')
        filename = dirArray[dirArray.length - 1]
        const path = findDirectoryDeep(state.filetree, dirArray)

        const fileIndex = path?.findIndex((element: FileStateFile) => element.filename === filename)
        if (path && fileIndex !== undefined && fileIndex !== -1) {
            const currentFile = path[fileIndex]
            allowedMetadata.forEach((key: string) => {
                if (key in payload) currentFile[key] = payload[key]
            })
            currentFile.metadataRequested = true
            currentFile.metadataPulled = true
        } else window.console.error('file not found in filetree: ' + payload.filename)
    }

    const setCreateFile = (payload: { item: { path: string; root: string; permissions: string; modified: number; size: number } }) => {
        let filename = payload.item.path
        if (payload.item.path.lastIndexOf('/') >= 0)
            filename = payload.item.path.substr(payload.item.path.lastIndexOf('/')).replace('/', '')
        const path = payload.item.path.substr(0, payload.item.path.lastIndexOf('/'))
        const parent = findDirectoryDeep(state.filetree, (payload.item.root + '/' + path).split('/'))

        if (parent) {
            const indexFile = parent.findIndex((element: FileStateFile) => !element.isDirectory && element.filename === filename)

            if (indexFile === -1) {
                parent.push({
                    isDirectory: false,
                    filename: filename,
                    modified: new Date(payload.item.modified * 1000),
                    permissions: payload.item.permissions,
                    size: payload.item.size,
                    metadataRequested: false,
                    metadataPulled: false,
                })
            } else {
                parent[indexFile].modified = new Date(payload.item.modified * 1000)
                parent[indexFile].size = payload.item.size
                parent[indexFile].metadataRequested = false
                parent[indexFile].metadataPulled = false

                const extension = filename.substring(filename.lastIndexOf('.') + 1)
                if (payload.item.root === 'gcodes' && extension === 'gcode') {
                    webSocketClient.emit('server.files.metadata', { filename: payload.item.path }, { action: 'files/getMetadata' })
                }
            }
        }
    }

    const setMoveFile = (payload: { source_item: { path: string; root: string }; item: { path: string; root: string } }) => {
        let filenameOld = payload.source_item.path
        let pathnameOld = payload.source_item.root

        const lastSlashOld = payload.source_item.path.lastIndexOf('/')
        if (lastSlashOld !== -1) {
            filenameOld = payload.source_item.path.substring(lastSlashOld + 1)
            pathnameOld = payload.source_item.root + '/' + payload.source_item.path.substring(0, lastSlashOld)
        }

        let filenameNew = payload.item.path
        let pathnameNew = payload.item.root

        const lastSlashNew = payload.item.path.lastIndexOf('/')
        if (lastSlashNew !== -1) {
            filenameNew = payload.item.path.substring(lastSlashNew + 1)
            pathnameNew = payload.item.root + '/' + payload.item.path.substring(0, lastSlashNew)
        }

        const pathOld = findDirectoryDeep(state.filetree, pathnameOld.split('/'))
        const indexFile = pathOld?.findIndex((element: FileStateFile) => element.filename === filenameOld)

        if (indexFile === undefined || indexFile === -1 || pathOld === null) return

        const file = pathOld.splice(indexFile, 1)[0]
        file.filename = filenameNew

        if (pathnameOld !== pathnameNew && 'metadataPulled' in file && file.metadataPulled && 'thumbnails' in file) {
            file.metadataPulled = false
            delete file.thumbnails
        }

        const newPath = findDirectoryDeep(state.filetree, pathnameNew.split('/'))
        newPath?.push(file)
    }

    const setModifyFile = (payload: { item: { path: string; root: string; modified: number; size: number } }) => {
        let filename = payload.item.path
        let filepath = payload.item.root

        const lastSlash = payload.item.path.lastIndexOf('/')
        if (lastSlash !== -1) {
            filename = payload.item.path.substr(lastSlash + 1)
            filepath = payload.item.root + '/' + payload.item.path.substr(0, lastSlash + 1)
        }

        const path = findDirectoryDeep(state.filetree, filepath.split('/'))
        const indexFile = path?.findIndex((element: FileStateFile) => element.filename === filename)

        if (indexFile !== undefined && indexFile > -1 && path && path[indexFile]) {
            if ('metadataPulled' in path[indexFile] && path[indexFile].metadataPulled) {
                path[indexFile].metadataPulled = false

                if ('thumbnails' in path[indexFile]) delete path[indexFile].thumbnails
            }

            path[indexFile].modified = new Date(payload.item.modified * 1000)
            path[indexFile].size = payload.item.size
        }
    }

    const setMoveDir = (payload: { source_item: { path: string; root: string }; item: { path: string; root: string } }) => {
        let dirnameOld = payload.source_item.path
        let pathnameOld = payload.source_item.root

        const lastSlashOld = payload.source_item.path.lastIndexOf('/')
        if (lastSlashOld !== -1) {
            dirnameOld = payload.source_item.path.substr(lastSlashOld + 1)
            pathnameOld = payload.source_item.root + '/' + payload.source_item.path.substr(0, lastSlashOld + 1)
        }

        let dirnameNew = payload.item.path
        let pathnameNew = payload.item.root

        const lastSlashNew = payload.item.path.lastIndexOf('/')
        if (lastSlashNew !== -1) {
            dirnameNew = payload.item.path.substr(lastSlashNew + 1)
            pathnameNew = payload.item.root + '/' + payload.item.path.substr(0, lastSlashNew + 1)
        }

        const pathOld = findDirectoryDeep(state.filetree, pathnameOld.split('/'))
        const indexDir = pathOld?.findIndex((element: FileStateFile) => element.filename === dirnameOld)

        if (indexDir !== undefined && pathOld && pathOld[indexDir]) {
            const dir = pathOld.splice(indexDir, 1)[0]
            dir.filename = dirnameNew

            const pathNew = findDirectoryDeep(state.filetree, pathnameNew.split('/'))
            pathNew?.push(dir)
        }
    }

    const setDeleteFile = (payload: { item: { path: string; root: string } }) => {
        let currentPath: string | FileStateFile[] = payload.item.path.substr(0, payload.item.path.lastIndexOf('/'))
        const delPath = payload.item.path.substr(payload.item.path.lastIndexOf('/') + 1)
        currentPath = findDirectoryDeep(state.filetree, (payload.item.root + '/' + currentPath).split('/')) ?? []
        const index = currentPath.findIndex((element: FileStateFile) => element.filename === delPath)

        if (index >= 0 && currentPath[index]) currentPath.splice(index, 1)
    }

    const setCreateDir = (payload: { item: { path: string; root: string; permissions: string; modified?: number } }) => {
        const dirname = payload.item.path.substr(payload.item.path.lastIndexOf('/') + 1)
        const path = payload.item.path.substr(0, payload.item.path.lastIndexOf('/'))
        const parent = findDirectoryDeep(state.filetree, (payload.item.root + '/' + path).split('/'))

        if (parent) {
            parent.push({
                isDirectory: true,
                filename: dirname,
                modified: payload.item.modified ? new Date(payload.item.modified) : new Date(),
                permissions: payload.item.permissions,
                childrens: [],
            })
        }
    }

    const setDeleteDir = (payload: { item: { path: string; root: string } }) => {
        let currentPath: string | FileStateFile[] = payload.item.path.substr(0, payload.item.path.lastIndexOf('/'))
        const delPath = payload.item.path.substr(payload.item.path.lastIndexOf('/') + 1)
        currentPath = findDirectoryDeep(state.filetree, (payload.item.root + '/' + currentPath).split('/')) ?? []
        const index = currentPath.findIndex((element: FileStateFile) => element.filename === delPath)

        if (index >= 0 && currentPath[index]) currentPath.splice(index, 1)
    }

    const setRootUpdate = (payload: { item: { root: string } }) => {
        const index = state.filetree.findIndex((root) => root.filename === payload.item.root)
        if (index !== -1 && state.filetree[index].childrens?.length) {
            state.filetree[index].childrens?.splice(0, state.filetree[index].childrens?.length)
        }
    }

    const setDiskUsage = (payload: { path: string; disk_usage: FileStateFile['disk_usage'] }) => {
        const parentPath = payload.path.substr(0, payload.path.lastIndexOf('/'))
        const pathName = payload.path.substr(payload.path.lastIndexOf('/') + 1)
        const parent = findDirectoryDeep(state.filetree, parentPath.split('/'))
        const directory = parent?.find((element) => element.isDirectory && element.filename === pathName)

        if (directory) directory.disk_usage = payload.disk_usage
    }

    const setRootPermissions = (payload: { name: string; permissions: string }) => {
        const rootDir = state.filetree.find((dir: FileStateFile) => dir.filename === payload.name)
        if (rootDir) rootDir.permissions = payload.permissions
    }

    const uploadClearState = () => {
        state.upload.show = false
        state.upload.filename = ''
        state.upload.cancelTokenSource = null
        state.upload.speed = 0
        state.upload.percent = 0
    }

    // --- actions ---
    const reset = () => resetState(state, getDefaultState)

    const setData = (payload: Partial<FileState>) => deepMerge(state, payload)

    const initRootDirs = (dirs: string[]) => {
        dirs.forEach((dirname: string) => {
            if (state.filetree.findIndex((tmp: FileStateFile) => tmp.filename === dirname) === -1) {
                createRootDir({ name: dirname, permissions: 'r' })
                webSocketClient.emit('server.files.get_directory', { path: dirname }, { action: 'files/getDirectory' })
            }
        })
    }

    // RPC-result handler (legacy action path 'files/getDirectory'); named
    // distinctly from the `getDirectory` getter to avoid a Pinia member clash.
    const getDirectoryResponse = (payload: ApiGetDirectoryReturn) => {
        const requestPath = (payload.requestParams?.path ?? '') as string
        const pathArray = requestPath.split('/')
        const root = pathArray.length ? pathArray[0] : requestPath

        const slashIndex = requestPath.indexOf('/')
        const path = slashIndex > 1 ? requestPath.slice(slashIndex + 1) : ''
        const directory = getDirectory(root + '/' + path)

        if (directory?.childrens?.length) {
            directory?.childrens.forEach((item: FileStateFile) => {
                if (
                    item?.isDirectory &&
                    (payload.dirs?.findIndex((element: ApiGetDirectoryReturnDir) => element.dirname === item.filename) ?? -1) < 0
                ) {
                    setDeleteDir({ item: { path: path.length ? path + '/' + item.filename : item.filename, root } })
                } else if (
                    !item?.isDirectory &&
                    (payload.files?.findIndex((element: ApiGetDirectoryReturnFile) => element.filename === item.filename) ?? -1) < 0
                ) {
                    setDeleteFile({ item: { path: path.length ? path + '/' + item.filename : item.filename, root } })
                }
            })
        }

        if (payload.dirs?.length) {
            payload.dirs
                .filter((dir) => !hiddenDirectories.includes(dir.dirname))
                .forEach((dir: ApiGetDirectoryReturnDir) => {
                    if (
                        directory?.childrens?.findIndex(
                            (element: FileStateFile) => element.isDirectory && element.filename === dir.dirname
                        ) === -1
                    ) {
                        setCreateDir({
                            item: {
                                path: path.length ? path + '/' + dir.dirname : dir.dirname,
                                root,
                                permissions: dir.permissions,
                                modified: dir.modified * 1000,
                            },
                        })

                        webSocketClient.emit(
                            'server.files.get_directory',
                            { path: requestPath + '/' + dir.dirname },
                            { action: 'files/getDirectory' }
                        )
                    }
                })
        }

        if (payload.files?.length) {
            payload.files.forEach((file: ApiGetDirectoryReturnFile) => {
                const existingFile = directory?.childrens?.find(
                    (element: FileStateFile) => !element.isDirectory && element.filename === file.filename
                )

                if (
                    existingFile &&
                    (existingFile.size !== file.size ||
                        existingFile.modified.getTime() !== new Date(file.modified * 1000).getTime())
                ) {
                    setModifyFile({
                        item: { path: path.length ? path + '/' + file.filename : file.filename, root, modified: file.modified, size: file.size },
                    })
                } else if (!existingFile) {
                    setCreateFile({
                        item: {
                            path: path.length ? path + '/' + file.filename : file.filename,
                            root,
                            permissions: file.permissions,
                            modified: file.modified,
                            size: file.size,
                        },
                    })
                }
            })
        }

        if (payload?.root_info?.name) {
            const rootDir = state.filetree.find((dir: FileStateFile) => dir.filename === payload?.root_info?.name)
            if (rootDir && rootDir.permissions !== payload.root_info?.permissions) setRootPermissions(payload.root_info)
        }

        if (payload.requestParams?.path && payload.disk_usage) {
            setDiskUsage({ disk_usage: payload.disk_usage, path: payload.requestParams.path as string })
        }
    }

    const scanMetadata = (payload: { filename: string }) => {
        const rootPath = payload.filename.slice(0, payload.filename.indexOf('/'))
        if (rootPath === 'gcodes') {
            const requestFilename = payload.filename.slice(7)
            setMetadataRequested({ filename: requestFilename })
            webSocketClient.emit('server.files.metascan', { filename: requestFilename }, { action: 'files/getScanMetadata' })
        }
    }

    const getMetadata = (payload: Record<string, unknown> & { filename: string }) => {
        if (payload === null || payload === undefined || payload.filename === '') return

        const printerStore = usePrinterStore()
        if (payload.filename === printerStore.print_stats?.filename) {
            printerStore.clearCurrentFile()
            printerStore.setData({ current_file: payload })
        }

        setMetadata(payload)
    }

    const getScanMetadata = (payload: { filename: string }) => {
        if (payload !== undefined && payload.filename !== '') {
            getMetadata(payload as never)

            const filename = payload.filename
            useToast().success(t('Files.ScanMetaSuccess', { filename }))
        }
    }

    const requestMetadata = (payload: { filename: string }[]) => {
        // request file metadata in batches to reduce the number of table re-renders when responses are received
        let messages: BatchMessage[] = []
        for (const { filename } of payload) {
            if (messages.length >= 100) {
                webSocketClient.emitBatch(messages)
                messages = []
            }
            const rootPath = filename.slice(0, filename.indexOf('/'))
            if (rootPath === 'gcodes') {
                const requestFilename = filename.slice(7)
                setMetadataRequested({ filename: requestFilename })
                messages.push({
                    method: 'server.files.metadata',
                    params: { filename: requestFilename },
                    emitOptions: { action: 'files/getMetadata' },
                })
            }
        }
        webSocketClient.emitBatch(messages)
    }

    const getMetadataCurrentFile = (payload: Record<string, unknown>) => {
        const printerStore = usePrinterStore()
        printerStore.clearCurrentFile()
        printerStore.setData({ current_file: payload })
    }

    const filelistChanged = async (payload: {
        action: string
        item: { path: string; root: string }
        source_item?: { path: string; root: string }
    }) => {
        switch (payload.action) {
            case 'create_file':
                setCreateFile(payload as never)
                break

            case 'move_file':
                if (payload.source_item?.path === 'printer_autosave.cfg' && payload.source_item?.root === 'config') {
                    setCreateFile(payload as never)
                    return
                }

                setMoveFile(payload as never)
                if (
                    payload.item.root === 'gcodes' &&
                    validGcodeExtensions.includes(payload.item.path.slice(payload.item.path.lastIndexOf('.')))
                ) {
                    requestMetadata([{ filename: 'gcodes/' + payload.item.path }])
                }
                break

            case 'delete_file':
                setDeleteFile(payload as never)
                break

            case 'modify_file':
                setModifyFile(payload as never)
                break

            case 'create_dir':
                setCreateDir(payload as never)

                webSocketClient.emit(
                    'server.files.get_directory',
                    { path: `${payload.item.root}/${payload.item.path}` },
                    { action: 'files/getDirectory' }
                )
                break

            case 'move_dir':
                setMoveDir(payload as never)
                break

            case 'delete_dir':
                setDeleteDir(payload as never)
                break

            case 'root_update':
                useServerStore().addRootDirectory(payload as never)
                setRootUpdate(payload as never)
                break

            default:
                window.console.error('Unknown filelist_changed action: ' + payload.action)
                break
        }
    }

    const getMove = (payload: { error?: { message: string }; requestParams: { dest: string; source: string } }) => {
        if (payload.error) {
            useToast().error(payload.error.message)
        } else {
            const filename = payload.requestParams.dest.substr(payload.requestParams.dest.lastIndexOf('/')).replace('/', '')
            const sourceDir = payload.requestParams.source.substr(0, payload.requestParams.source.lastIndexOf('/'))
            const destDir = payload.requestParams.dest.substr(0, payload.requestParams.dest.lastIndexOf('/'))

            if (sourceDir === destDir) useToast().success(t('Files.SuccessfullyRenamed', { filename }))
            else useToast().success(t('Files.SuccessfullyMoved', { filename }))
        }
    }

    const getCreateDir = (payload: { error?: { message: string }; requestParams: { path: string } }) => {
        if (payload.error) {
            useToast().error(payload.error.message)
        } else {
            const newPath = payload.requestParams.path.substr(payload.requestParams.path.lastIndexOf('/') + 1)
            useToast().success(t('Files.SuccessfullyCreated', { filename: newPath }))
        }
    }

    const getDeleteDir = (payload: { error?: { message: string }; requestParams: { path: string } }) => {
        if (payload.error) {
            useToast().error(payload.error.message)
        } else {
            const delPath = payload.requestParams.path.substr(payload.requestParams.path.lastIndexOf('/') + 1)
            useToast().success(t('Files.SuccessfullyDeleted', { filename: delPath }))
        }
    }

    const getDeleteFile = (payload: { error?: { message: string }; item: { path: string; root: string } }) => {
        if (payload.error) {
            useToast().error(payload.error.message)
        } else {
            const delPath = payload.item.path.substr(payload.item.path.lastIndexOf('/') + 1)
            const fileExtension = payload.item.path.substr(payload.item.path.lastIndexOf('.') + 1)

            if (!(payload.item.root === 'timelapse' && fileExtension === 'jpg'))
                useToast().success(t('Files.SuccessfullyDeleted', { filename: delPath }))
        }
    }

    const uploadFile = (payload: { file: File; path: string; root: 'gcodes' | 'config' }): Promise<string | false> => {
        const apiUrl = useSocketStore().getUrl
        const formData = new FormData()
        formData.append('file', payload.file, payload.file.name)
        formData.append('root', payload.root)
        formData.append('path', payload.path)
        const cancelTokenSource: CancelTokenSource = axios.CancelToken.source()

        uploadClearState()
        state.upload.cancelTokenSource = cancelTokenSource
        state.upload.filename = payload.file.name
        state.upload.show = true

        return new Promise((resolve) => {
            axios
                .post(apiUrl + '/server/files/upload', formData, {
                    cancelToken: cancelTokenSource.token,
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                        const percent = (progressEvent.progress ?? 0) * 100
                        if (state.upload.percent !== percent) state.upload.percent = percent

                        const rate = progressEvent.rate ?? 0
                        if (state.upload.speed !== rate) state.upload.speed = rate
                    },
                })
                .then((result: AxiosResponse<{ item: { path: string } }>) => {
                    state.upload.show = false
                    const lastPos = result.data.item.path.lastIndexOf('/')
                    const filename = result.data.item.path.slice(lastPos + 1)
                    resolve(filename)
                })
                .catch(() => {
                    state.upload.show = false
                    useToast().error(t('FullscreenUpload.CannotUploadFile'))
                    resolve(false)
                })
        })
    }

    const uploadSetShow = (payload: boolean) => {
        state.upload.show = payload
    }

    const uploadSetCurrentNumber = (payload: number) => {
        state.upload.currentNumber = payload
    }

    const uploadIncrementCurrentNumber = () => {
        state.upload.currentNumber = state.upload.currentNumber + 1
    }

    const uploadSetMaxNumber = (payload: number) => {
        state.upload.maxNumber = payload
    }

    const downloadZip = (payload: { destination: { root: string; path: string } }) => {
        const apiUrl = useSocketStore().getUrl
        const url = `${apiUrl}/server/files/${payload.destination.root}/${encodeURI(payload.destination.path)}`
        window.open(url)
    }

    const rolloverLog = (payload: { rolled_over: string[]; failed: Record<string, string> }) => {
        payload.rolled_over.forEach((name: string) => {
            useToast().success(t('Machine.LogfilesPanel.RolloverToastSuccessful', { name }))
        })

        Object.keys(payload.failed).forEach((name: string) => {
            const message = payload.failed[name]
            useToast().error(t('Machine.LogfilesPanel.RolloverToastFailed', { name, message }))
        })

        setTimeout(() => {
            webSocketClient.emit('server.files.get_directory', { path: 'logs' }, { action: 'files/getDirectory' })
        }, 500)
    }

    return {
        ...toRefs(state),
        getDirectory,
        getFile,
        getGcodeFiles,
        getAllGcodes,
        getThemeFileUrl,
        getSidebarLogo,
        getCustomSidebarBackground,
        getMainBackground,
        getCustomStylesheet,
        getCustomNaviPoints,
        getCustomFavicons,
        getDiskUsage,
        checkConfigFile,
        getSmallThumbnail,
        getBigThumbnail,
        reset,
        setData,
        initRootDirs,
        getDirectoryResponse,
        scanMetadata,
        getScanMetadata,
        requestMetadata,
        setMetadata,
        getMetadata,
        getMetadataCurrentFile,
        filelistChanged,
        getMove,
        getCreateDir,
        getDeleteDir,
        getDeleteFile,
        uploadFile,
        uploadSetShow,
        uploadSetCurrentNumber,
        uploadIncrementCurrentNumber,
        uploadSetMaxNumber,
        downloadZip,
        rolloverLog,
    }
})
