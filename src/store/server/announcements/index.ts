import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type { ServerAnnouncementsState, ServerAnnouncementsStateEntry } from '@/store/server/announcements/types'
import { resetState } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'

export const getDefaultState = (): ServerAnnouncementsState => ({
    entries: [],
    feeds: [],
})

export const useServerAnnouncementsStore = defineStore('serverAnnouncements', () => {
    const state = reactive<ServerAnnouncementsState>(getDefaultState())

    const getAnnouncements = computed(() => state.entries.filter((entry) => !entry.dismissed))

    const reset = () => resetState(state, getDefaultState)

    const init = () => {
        webSocketClient.emit('server.announcements.list', {}, { action: 'server/announcements/getList' })
    }

    const setDismissed = (payload: { entry_id: string; status: boolean }) => {
        const index = state.entries.findIndex((entry) => entry.entry_id === payload.entry_id)
        if (index === -1) return

        state.entries[index].dismissed = payload.status
        if (!payload.status) {
            state.entries[index].date_dismissed = null
            state.entries[index].dismiss_wake = null
        } else {
            state.entries[index].date_dismissed = new Date()
        }
    }

    const getList = (payload: {
        entries?: { date: number; date_dismissed: number; dismiss_wake: number }[]
        feeds?: string[]
        date_dismissed?: number
        dismiss_wake?: number
    }) => {
        if (payload.entries) {
            state.entries = payload.entries.map((entry) => {
                const date = new Date(entry.date * 1000)
                const date_dismissed = payload.date_dismissed ? new Date(entry.date_dismissed * 1000) : null
                const dismiss_wake = payload.dismiss_wake ? new Date(entry.dismiss_wake * 1000) : null

                return { ...entry, date, date_dismissed, dismiss_wake } as unknown as ServerAnnouncementsStateEntry
            })
        }
        if (payload.feeds) state.feeds = payload.feeds

        useSocketStore().removeInitModule('server/announcements/init')
    }

    const getDismissed = (payload: { entry_id: string }) => {
        setDismissed({ entry_id: payload.entry_id, status: true })
    }

    const getWaked = (payload: { entry_id: string }) => {
        setDismissed({ entry_id: payload.entry_id, status: false })
    }

    const close = (payload: { entry_id: string }) => {
        webSocketClient.emit('server.announcements.dismiss', { entry_id: payload.entry_id })
    }

    const dismiss = (payload: { entry_id: string; time: number | null }) => {
        webSocketClient.emit('server.announcements.dismiss', { entry_id: payload.entry_id, wake_time: payload.time })
    }

    return {
        ...toRefs(state),
        getAnnouncements,
        reset,
        init,
        setDismissed,
        getList,
        getDismissed,
        getWaked,
        close,
        dismiss,
    }
})
