import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import { useToast } from 'vue-toast-notification'
import axios, { type AxiosProgressEvent, type CancelTokenSource } from 'axios'
import { sha256 } from 'js-sha256'
import type { EditorState } from '@/store/editor/types'
import i18n from '@/plugins/i18n'
import { escapePath, formatFilesize, windowBeforeUnloadFunction } from '@/plugins/helpers'
import { resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'
import { useGuiStore } from '@/store/gui'

const t = i18n.global.t

export const getDefaultState = (): EditorState => ({
    bool: false,
    filename: '',
    permissions: '',
    fileroot: '',
    filepath: '',
    sourcecode: '',
    loaderBool: false,
    loaderProgress: {
        direction: 'downloading',
        loaded: 0,
        total: 0,
        speed: '',
    },
    cancelToken: null,
    loadedHash: '',
    changed: false,
})

export const useEditorStore = defineStore('editor', () => {
    const state = reactive<EditorState>(getDefaultState())

    const getKlipperRestartMethod = computed(() => useGuiStore().editor.klipperRestartMethod ?? 'FIRMWARE_RESTART')

    const reset = () => resetState(state, getDefaultState)

    const clearLoader = () => {
        state.loaderBool = false
        state.loaderProgress = { direction: 'downloading', loaded: 0, total: 0, speed: '' }
    }

    const downloadProgress = (payload: { progressEvent: AxiosProgressEvent; direction: 'downloading' | 'uploading'; filesize: number | null }) => {
        state.loaderProgress = {
            direction: payload.direction,
            speed: formatFilesize(payload.progressEvent.rate ?? 0),
            loaded: payload.progressEvent.loaded,
            total: payload.filesize ?? payload.progressEvent.total ?? 0,
        }
    }

    const cancelLoad = () => {
        if (state.cancelToken) {
            state.cancelToken.cancel('User canceled upload/download')
            state.cancelToken = null
            clearLoader()
        }
    }

    const close = () => {
        reset()
        window.removeEventListener('beforeunload', windowBeforeUnloadFunction)
    }

    const updateSourcecode = (payload: string) => {
        state.sourcecode = payload
        state.changed = sha256(payload) != state.loadedHash
    }

    const openFile = (payload: { root: string; path: string; filename: string; permissions: string; size: number | null }) => {
        const fullFilepathArray = [payload.root]
        let path = payload.path
        if (path.slice(0, 1) === '/') path = path.slice(1)
        if (path.slice(-1) === '/') path = path.slice(0, -1)
        if (path !== '') fullFilepathArray.push(path)
        fullFilepathArray.push(payload.filename)

        const fullFilepath = fullFilepathArray.join('/')
        const url = useSocketStore().getUrl + '/server/files/' + escapePath(fullFilepath) + `?${Date.now()}`

        if (state.cancelToken) cancelLoad()

        const source: CancelTokenSource = axios.CancelToken.source()
        state.cancelToken = source
        state.loaderBool = true

        state.filename = payload.filename
        state.permissions = payload.permissions

        axios
            .get(url, {
                cancelToken: source.token,
                onDownloadProgress: (progressEvent) =>
                    downloadProgress({ progressEvent, direction: 'downloading', filesize: payload.size }),
                responseType: 'blob',
            })
            .then((res) => res.data.text())
            .then((file: string) => {
                state.filename = payload.filename
                state.fileroot = payload.root
                state.filepath = path
                state.sourcecode = file

                // Because the used editor converts all Windows-Style line endings with
                // unix ones on load, the hash is computed with the source always having
                // unix-style line endings.
                // https://github.com/codemirror/CodeMirror/issues/3395
                state.loadedHash = sha256(file.replace(/(?:\r\n|\r|\n)/g, '\n'))
                state.changed = false
                state.bool = true
            })
            .finally(() => {
                setTimeout(() => {
                    clearLoader()
                }, 100)
            })
    }

    const saveFile = async (payload: { content: string; restartServiceName: string | null }) => {
        const content = new Blob([payload.content], { type: 'text/plain' })
        const formData = new FormData()
        formData.append('file', content, state.filename)
        formData.append('root', state.fileroot)
        formData.append('path', state.filepath)
        formData.append('checksum', sha256(payload.content))

        const url = useSocketStore().getUrl + '/server/files/upload'
        if (state.cancelToken) cancelLoad()
        const source: CancelTokenSource = axios.CancelToken.source()
        state.cancelToken = source
        state.loaderBool = true

        axios
            .post(url, formData, {
                cancelToken: source.token,
                onUploadProgress: (progressEvent) => downloadProgress({ progressEvent, direction: 'uploading', filesize: null }),
            })
            .then((response) => response.data)
            .then((data) => {
                clearLoader()
                useToast().success(t('Editor.SuccessfullySaved', { filename: data.item.path }))

                if (payload.restartServiceName === 'klipper') {
                    webSocketClient.emit('printer.gcode.script', { script: getKlipperRestartMethod.value })
                } else if (payload.restartServiceName === 'moonraker') {
                    webSocketClient.emit('server.restart', {})
                } else if (payload.restartServiceName !== null) {
                    webSocketClient.emit('machine.services.restart', { service: payload.restartServiceName })
                }

                state.loadedHash = sha256(payload.content.replace(/(?:\r\n|\r|\n)/g, '\n'))
                state.changed = false

                if (payload.restartServiceName !== null) close()
            })
            .catch((error) => {
                window.console.log(error.response?.data.error)
                clearLoader()
                useToast().error(t('Editor.FailedSave', { filename: state.filename }))
            })
    }

    return {
        ...toRefs(state),
        getKlipperRestartMethod,
        reset,
        downloadProgress,
        openFile,
        saveFile,
        cancelLoad,
        clearLoader,
        close,
        updateSourcecode,
    }
})
