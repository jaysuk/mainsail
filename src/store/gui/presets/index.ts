import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { GuiPresetsState, GuiPresetsStatePreset } from '@/store/gui/presets/types'
import { caseInsensitiveSort } from '@/plugins/helpers'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'

export const getDefaultState = (): GuiPresetsState => ({
    presets: {},
    cooldownGcode: 'TURN_OFF_HEATERS',
})

export const useGuiPresetsStore = defineStore('guiPresets', () => {
    const state = reactive<GuiPresetsState>(getDefaultState())

    const getCooldownGcode = computed(() => state.cooldownGcode ?? 'TURN_OFF_HEATERS')

    const getPresets = computed<GuiPresetsStatePreset[]>(() => {
        const presets: GuiPresetsStatePreset[] = []

        Object.keys(state.presets).forEach((id: string) => {
            presets.push({ ...state.presets[id], id })
        })

        return caseInsensitiveSort(presets, 'name')
    })

    const getPresetsFromHeater = (payload: { name: string }) => {
        interface Preset {
            value: number
            text: string
        }

        const output: Preset[] = [{ value: 0, text: '0 °C' }]

        Object.keys(state.presets).forEach((id: string) => {
            const preset = state.presets[id]

            if (
                preset.values[payload.name]?.bool &&
                output.findIndex(
                    (entry) => entry.value === parseFloat(preset.values[payload.name]?.value?.toString() ?? '0')
                ) === -1
            ) {
                output.push({
                    value: Number(preset.values[payload.name].value),
                    text: preset.values[payload.name].value + ' °C',
                })
            }
        })

        return output.sort((a, b) => {
            if (a.value > b.value) return -1
            if (a.value < b.value) return 1

            return 0
        })
    }

    const reset = () => resetState(state, getDefaultState)

    const setData = (payload: Partial<GuiPresetsState>) => deepMerge(state, payload)

    const upload = (payload: { id: string; value: GuiPresetsStatePreset }) => {
        webSocketClient.emit('server.database.post_item', {
            namespace: 'mainsail',
            key: 'presets.presets.' + payload.id,
            value: payload.value,
        })
    }

    const store = (payload: { values: GuiPresetsStatePreset }) => {
        const id = uuidv4()

        state.presets[id] = { ...payload.values }
        upload({ id, value: state.presets[id] })
    }

    const update = (payload: { id: string; values: GuiPresetsStatePreset }) => {
        if (!(payload.id in state.presets)) return

        state.presets[payload.id] = payload.values
        upload({ id: payload.id, value: state.presets[payload.id] })
    }

    const deletePreset = (id: string) => {
        delete state.presets[id]
        webSocketClient.emit('server.database.delete_item', { namespace: 'mainsail', key: 'presets.presets.' + id })
    }

    const updateCooldownGcode = (payload: string) => {
        state.cooldownGcode = payload
    }

    return {
        ...toRefs(state),
        getCooldownGcode,
        getPresets,
        getPresetsFromHeater,
        reset,
        setData,
        upload,
        store,
        update,
        delete: deletePreset,
        updateCooldownGcode,
    }
})
