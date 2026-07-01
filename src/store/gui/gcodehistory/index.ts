import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import type { GuiGcodehistoryState } from '@/store/gui/gcodehistory/types'
import { maxGcodeHistory } from '@/store/variables'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'

export const getDefaultState = (): GuiGcodehistoryState => ({
    entries: [],
})

export const useGuiGcodehistoryStore = defineStore('guiGcodehistory', () => {
    const state = reactive<GuiGcodehistoryState>(getDefaultState())

    const reset = () => resetState(state, getDefaultState)

    const setData = (payload: Partial<GuiGcodehistoryState>) => deepMerge(state, payload)

    const upload = () => {
        webSocketClient.emit('server.database.post_item', {
            namespace: 'mainsail',
            key: 'gcodehistory.entries',
            value: state.entries,
        })
    }

    const addToHistory = (payload: string) => {
        state.entries.push(payload)
        while (state.entries.length > maxGcodeHistory) state.entries.splice(0, 1)

        upload()
    }

    return {
        ...toRefs(state),
        reset,
        setData,
        upload,
        addToHistory,
    }
})
