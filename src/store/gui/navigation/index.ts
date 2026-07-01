import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import type { GuiNavigationState, GuiNavigationStateEntry } from '@/store/gui/navigation/types'
import type { NaviPoint } from '@/components/mixins/navigation'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'

export const getDefaultState = (): GuiNavigationState => ({
    entries: [],
})

export const useGuiNavigationStore = defineStore('guiNavigation', () => {
    const state = reactive<GuiNavigationState>(getDefaultState())

    const reset = () => resetState(state, getDefaultState)

    const setData = (payload: Partial<GuiNavigationState>) => deepMerge(state, payload)

    const upload = () => {
        webSocketClient.emit('server.database.post_item', {
            namespace: 'mainsail',
            key: 'navigation.entries',
            value: state.entries,
        })
    }

    const updatePos = (payload: GuiNavigationStateEntry) => {
        const index = state.entries.findIndex((entry) => entry.type === payload.type && entry.title === payload.title)

        if (index !== -1) {
            state.entries[index].position = payload.position
            return
        }

        state.entries.push({
            type: payload.type,
            title: payload.title,
            visible: payload.visible,
            position: payload.position,
        })
    }

    const changeVisibility = (payload: NaviPoint) => {
        const title = payload.orgTitle ?? payload.title

        const index = state.entries.findIndex((entry) => entry.type === payload.type && entry.title === title)

        if (index !== -1) {
            state.entries[index].visible = !payload.visible
        } else {
            state.entries.push({
                type: payload.type,
                title,
                visible: !payload.visible,
                position: payload.position,
            })
        }

        upload()
    }

    return {
        ...toRefs(state),
        reset,
        setData,
        upload,
        updatePos,
        changeVisibility,
    }
})
