import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type { GuiWebcamState, GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'
import { useServerStore } from '@/store/server'
import { useServerTimelapseStore } from '@/store/server/timelapse'

export const getDefaultState = (): GuiWebcamState => ({
    webcams: [],
})

export const useGuiWebcamsStore = defineStore('guiWebcams', () => {
    const state = reactive<GuiWebcamState>(getDefaultState())

    const getWebcams = computed<GuiWebcamStateWebcam[]>(() => state.webcams.filter((webcam) => webcam.enabled))

    const getWebcam = (name: string) => getWebcams.value.find((webcam) => webcam.name === name)

    const reset = () => resetState(state, getDefaultState)

    const setData = (payload: Partial<GuiWebcamState>) => deepMerge(state, payload)

    const init = () => {
        window.console.debug('init gui/webcams')
        webSocketClient.emit('server.webcams.list', {}, { action: 'gui/webcams/initStore' })
    }

    const initStore = (payload: { webcams: GuiWebcamStateWebcam[] }) => {
        reset()
        state.webcams = payload.webcams
        useSocketStore().removeInitModule('gui/webcam/init')
    }

    const store = (payload: GuiWebcamStateWebcam) => {
        webSocketClient.emit('server.webcams.post_item', payload)
    }

    const deleteWebcam = (name: string) => {
        webSocketClient.emit('server.webcams.delete_item', { name })
    }

    const update = (payload: { webcam: GuiWebcamStateWebcam; oldWebcamName: string }) => {
        webSocketClient.emit('server.webcams.post_item', payload.webcam)
        if (payload.webcam.name !== payload.oldWebcamName) deleteWebcam(payload.oldWebcamName)

        if (!useServerStore().components.includes('timelapse')) return

        useServerTimelapseStore().updateCamSettings({ newName: payload.webcam.name, oldName: payload.oldWebcamName })
    }

    return {
        ...toRefs(state),
        getWebcams,
        getWebcam,
        reset,
        setData,
        init,
        initStore,
        store,
        update,
        delete: deleteWebcam,
    }
})
