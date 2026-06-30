import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type { ServerSensorState, ServerSensorStateSensor } from '@/store/server/sensor/types'
import { resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'

export const getDefaultState = (): ServerSensorState => ({
    sensors: {},
})

export const useServerSensorStore = defineStore('serverSensor', () => {
    const state = reactive<ServerSensorState>(getDefaultState())

    const getSensors = computed(() => Object.keys(state.sensors))

    const reset = () => resetState(state, getDefaultState)

    const init = () => {
        webSocketClient.emit('server.sensors.list', {}, { action: 'server/sensor/getSensors' })
    }

    // RPC-result handler (legacy action path 'server/sensor/getSensors'); named
    // distinctly from the `getSensors` getter to avoid a Pinia member clash.
    const getSensorsResponse = (payload: { sensors: Record<string, ServerSensorStateSensor> }) => {
        state.sensors = payload.sensors
        useSocketStore().removeInitModule('server/sensor/init')
    }

    const updateSensors = (payload: Record<string, Record<string, number>>) => {
        Object.keys(payload).forEach((key) => {
            if (key in state.sensors) state.sensors[key].values = payload[key]
        })
    }

    return {
        ...toRefs(state),
        getSensors,
        reset,
        init,
        getSensorsResponse,
        updateSensors,
    }
})
