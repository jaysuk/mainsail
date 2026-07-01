import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import { useToast } from 'vue-toast-notification'
import type { ServerTimelapseState, ServerTimelapseSettingsState } from '@/store/server/timelapse/types'
import { resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'

export const getDefaultState = (): ServerTimelapseState => ({
    settings: {
        enabled: true,
        camera: '',
        mode: 'layermacro',
        autorender: true,
        autorenderOnce: false,
        saveframes: false,
        stream_delay_compensation: 0.05,
        gcode_verbose: true,
        parkhead: false,
        parkpos: 'back_left',
        park_custom_pos_x: 0,
        park_custom_pos_y: 0,
        park_custom_pos_dz: 0,
        park_travel_speed: 100,
        park_retract_speed: 15,
        park_retract_distance: 1,
        park_extrude_speed: 15,
        park_extrude_distance: 1,
        park_time: 0.1,
        fw_retract: false,
        hyperlapse_cycle: 30,

        constant_rate_factor: 23,
        output_framerate: 30,
        pixelformat: 'yuv420p',
        extraoutputparams: '',
        variable_fps: false,
        targetlength: 60,
        variable_fps_min: 5,
        variable_fps_max: 60,
        rotation: 0,
        duplicatelastframe: 0,
        previewimage: true,
        time_format_code: '%Y%m%d_%H%M',
        blockedsettings: [],
    },
    lastFrame: {
        count: 0,
        file: '',
    },
    rendering: {
        status: '',
        progress: 0,
        filename: '',
    },
})

export const useServerTimelapseStore = defineStore('serverTimelapse', () => {
    const state = reactive<ServerTimelapseState>(getDefaultState())

    const reset = () => resetState(state, getDefaultState)

    const init = () => {
        webSocketClient.emit('machine.timelapse.get_settings', {}, { action: 'server/timelapse/initSettings' })
        webSocketClient.emit('machine.timelapse.lastframeinfo', {}, { action: 'server/timelapse/initLastFrameinfo' })
    }

    const setSettings = (payload: Partial<ServerTimelapseSettingsState>) => {
        Object.keys(payload).forEach((key) => {
            const typedKey = key as keyof ServerTimelapseSettingsState
            if (typedKey in state.settings && state.settings[typedKey] !== payload[typedKey]) {
                ;(state.settings as Record<string, unknown>)[typedKey] = payload[typedKey]
            }
        })
    }

    const setLastFrame = (payload: { count: number; file: string }) => {
        state.lastFrame.count = payload.count
        state.lastFrame.file = payload.file
    }

    const setRenderStatus = (payload: { status: string; progress?: number; filename?: string }) => {
        state.rendering = {
            status: payload.status,
            progress: payload.progress ?? 0,
            filename: payload.filename ?? '',
        }
    }

    const resetSnackbar = () => {
        state.rendering = { status: '', progress: 0, filename: '' }
    }

    const initSettings = (payload: Partial<ServerTimelapseSettingsState> & { requestParams?: unknown }) => {
        if ('requestParams' in payload) delete payload.requestParams

        setSettings(payload)
        useSocketStore().removeInitModule('server/timelapse/init')
    }

    const initLastFrameinfo = (payload: { framecount: number; lastframefile: string }) => {
        setLastFrame({ count: payload.framecount, file: payload.lastframefile })
    }

    const getEvent = (payload: {
        action: string
        frame?: string
        framefile?: string
        status?: string
        msg?: string
        progress?: number
        filename?: string
    }) => {
        switch (payload.action) {
            case 'newframe':
                setLastFrame({ count: parseInt(payload.frame ?? '0'), file: payload.framefile ?? '' })
                break

            case 'render':
                if (payload.status === 'error') {
                    useToast().error(payload.msg ?? '')
                    resetSnackbar()
                } else {
                    setRenderStatus({
                        status: payload.status ?? '',
                        progress: payload.progress,
                        filename: payload.filename,
                    })
                }
                break

            default:
                window.console.log('unknown timelapse event', payload)
        }
    }

    const saveSetting = (payload: Partial<ServerTimelapseSettingsState>) => {
        webSocketClient.emit('machine.timelapse.post_settings', payload, { action: 'server/timelapse/initSettings' })
    }

    const updateCamSettings = (payload: { oldName: string; newName: string }) => {
        if (state.settings.camera !== payload.oldName) return
        saveSetting({ camera: payload.newName })
    }

    return {
        ...toRefs(state),
        reset,
        init,
        setSettings,
        setLastFrame,
        setRenderStatus,
        resetSnackbar,
        initSettings,
        initLastFrameinfo,
        getEvent,
        saveSetting,
        updateCamSettings,
    }
})
