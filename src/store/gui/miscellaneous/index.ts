import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type {
    GuiMiscellaneousState,
    GuiMiscellaneousStateEntry,
    GuiMiscellaneousStateEntryLightgroup,
    GuiMiscellaneousStateEntryPreset,
} from '@/store/gui/miscellaneous/types'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'

export const getDefaultState = (): GuiMiscellaneousState => ({
    entries: {},
})

export const useGuiMiscellaneousStore = defineStore('guiMiscellaneous', () => {
    const state = reactive<GuiMiscellaneousState>(getDefaultState())

    const getEntries = () => {
        const output: GuiMiscellaneousStateEntry[] = []

        Object.entries(state.entries).forEach(([key, values]) => {
            output.push({
                id: key,
                name: values.name,
                type: values.type,
                lightgroups: { ...values.lightgroups },
                presets: { ...values.presets },
            })
        })

        return output
    }

    const getEntry = (payload: { type: string; name: string }) =>
        getEntries().find((entry) => entry.name === payload.name && entry.type === payload.type)

    const getId = (payload: { type: string; name: string }) => getEntry(payload)?.id ?? null

    const findEntryId = (payload: { type: string; name: string }): string | null =>
        Object.keys(state.entries).find(
            (key) => state.entries[key].type === payload.type && state.entries[key].name === payload.name
        ) ?? null

    const reset = () => resetState(state, getDefaultState)

    const setData = (payload: Partial<GuiMiscellaneousState>) => deepMerge(state, payload)

    const upload = (id: string) => {
        webSocketClient.emit('server.database.post_item', {
            namespace: 'mainsail',
            key: 'miscellaneous.entries.' + id,
            value: state.entries[id],
        })
    }

    const store = (payload: { type: string; name: string }): string => {
        const id = uuidv4()

        state.entries[id] = { name: payload.name, type: payload.type, lightgroups: {}, presets: {} }
        upload(id)

        return id
    }

    const storeLightgroup = (payload: { type: string; name: string; lightgroup: GuiMiscellaneousStateEntryLightgroup }) => {
        let entryId = findEntryId(payload)

        if (entryId === null) {
            entryId = uuidv4()
            state.entries[entryId] = { name: payload.name, type: payload.type, lightgroups: {}, presets: {} }
        }

        const lightgroupId = uuidv4()
        state.entries[entryId].lightgroups[lightgroupId] = payload.lightgroup
        upload(entryId)
    }

    const updateLightgroup = (payload: {
        type: string
        name: string
        lightgroupId: string
        lightgroup: GuiMiscellaneousStateEntryLightgroup
    }) => {
        const entryId = findEntryId(payload)
        if (entryId === null) return

        state.entries[entryId].lightgroups[payload.lightgroupId] = payload.lightgroup
        upload(entryId)
    }

    const deleteLightgroup = (payload: { type: string; name: string; lightgroupId: string }) => {
        const entryId = findEntryId(payload)
        if (entryId === null) return

        delete state.entries[entryId].lightgroups[payload.lightgroupId]
        upload(entryId)
    }

    const storePreset = (payload: { type: string; name: string; preset: GuiMiscellaneousStateEntryPreset }) => {
        let entryId = findEntryId(payload)

        if (entryId === null) {
            entryId = uuidv4()
            state.entries[entryId] = { name: payload.name, type: payload.type, lightgroups: {}, presets: {} }
        }

        const presetId = uuidv4()
        state.entries[entryId].presets[presetId] = payload.preset
        upload(entryId)
    }

    const updatePreset = (payload: {
        type: string
        name: string
        presetId: string
        preset: GuiMiscellaneousStateEntryPreset
    }) => {
        const entryId = findEntryId(payload)
        if (entryId === null) return

        state.entries[entryId].presets[payload.presetId] = payload.preset
        upload(entryId)
    }

    const deletePreset = (payload: { type: string; name: string; presetId: string }) => {
        const entryId = findEntryId(payload)
        if (entryId === null) return

        delete state.entries[entryId].presets[payload.presetId]
        upload(entryId)
    }

    return {
        ...toRefs(state),
        getEntries,
        getEntry,
        getId,
        reset,
        setData,
        upload,
        store,
        storeLightgroup,
        updateLightgroup,
        deleteLightgroup,
        storePreset,
        updatePreset,
        deletePreset,
    }
})
