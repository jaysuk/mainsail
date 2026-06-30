import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type { ServerPowerState, ServerPowerStateDevice } from '@/store/server/power/types'
import { resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'

export const getDefaultState = (): ServerPowerState => ({
    devices: [],
})

export const useServerPowerStore = defineStore('serverPower', () => {
    const state = reactive<ServerPowerState>(getDefaultState())

    const getDevices = computed(() => state.devices)

    const reset = () => resetState(state, getDefaultState)

    const init = () => {
        webSocketClient.emit('machine.device_power.devices', {}, { action: 'server/power/getDevices' })
    }

    const setStatus = (payload: { device: string; status: ServerPowerStateDevice['status'] }) => {
        const devIdx = state.devices.findIndex((device) => device.device === payload.device)
        if (devIdx >= 0) state.devices[devIdx].status = payload.status
    }

    // RPC-result handler (legacy action path 'server/power/getDevices'); named
    // distinctly from the `getDevices` getter to avoid a Pinia member clash.
    const getDevicesResponse = (payload: { error?: unknown; devices?: ServerPowerStateDevice[] }) => {
        if (!payload.error && payload.devices) state.devices = payload.devices
        useSocketStore().removeInitModule('server/power/init')
    }

    const getStatus = (payload: { error?: unknown; device?: string; status?: ServerPowerStateDevice['status'] }) => {
        if (!payload.error && payload.device && payload.status) {
            setStatus({ device: payload.device, status: payload.status })
        }
    }

    const responseToggle = (payload: Record<string, unknown>) => {
        if ('requestParams' in payload) delete payload.requestParams

        for (const [key, value] of Object.entries(payload)) {
            setStatus({ device: key, status: value as ServerPowerStateDevice['status'] })
        }
    }

    return {
        ...toRefs(state),
        getDevices,
        reset,
        init,
        setStatus,
        getDevicesResponse,
        getStatus,
        responseToggle,
    }
})
