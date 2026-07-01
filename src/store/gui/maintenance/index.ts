import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { GuiMaintenanceState, GuiMaintenanceStateEntry, MaintenanceJson } from '@/store/gui/maintenance/types'
import { themeDir } from '@/store/variables'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'
import { useServerHistoryStore } from '@/store/server/history'

export const getDefaultState = (): GuiMaintenanceState => ({
    entries: {},
})

export const useGuiMaintenanceStore = defineStore('guiMaintenance', () => {
    const state = reactive<GuiMaintenanceState>(getDefaultState())

    const getEntries = computed<GuiMaintenanceStateEntry[]>(() => {
        const entries: GuiMaintenanceStateEntry[] = []

        Object.keys(state.entries).forEach((id: string) => {
            entries.push({ ...state.entries[id], id })
        })

        return entries
    })

    const getOverdueEntries = computed<GuiMaintenanceStateEntry[]>(() => {
        const historyStore = useServerHistoryStore()
        const currentTotalPrintTime = historyStore.job_totals.total_print_time ?? 0
        const currentTotalFilamentUsed = historyStore.job_totals.total_filament_used ?? 0
        const currentDate = new Date().getTime() / 1000

        return getEntries.value.filter((entry) => {
            if (entry.reminder.type === null || entry.end_time !== null) return false

            if (entry.reminder.filament.bool) {
                const end = entry.start_filament + (entry.reminder.filament.value ?? 0) * 1000
                if (end <= currentTotalFilamentUsed) return true
            }

            if (entry.reminder.printtime.bool) {
                const end = entry.start_printtime + (entry.reminder.printtime.value ?? 0) * 3600
                if (end <= currentTotalPrintTime) return true
            }

            if (entry.reminder.date.bool) {
                const end = entry.start_time + (entry.reminder.date.value ?? 0) * 24 * 60 * 60
                if (end <= currentDate) return true
            }

            return false
        })
    })

    const reset = () => resetState(state, getDefaultState)

    const setData = (payload: Partial<GuiMaintenanceState>) => deepMerge(state, payload)

    const init = () => {
        webSocketClient.emit('server.database.get_item', { namespace: 'maintenance' }, { action: 'gui/maintenance/initStore' })
    }

    const upload = (payload: { id: string; value: GuiMaintenanceStateEntry }) => {
        webSocketClient.emit('server.database.post_item', {
            namespace: 'maintenance',
            key: payload.id,
            value: payload.value,
        })
    }

    const store = (payload: { entry: GuiMaintenanceStateEntry }) => {
        const id = uuidv4()

        state.entries[id] = payload.entry
        upload({ id, value: state.entries[id] })
    }

    const update = (payload: GuiMaintenanceStateEntry & { id: string }) => {
        const id = payload.id
        const entry = { ...payload }
        delete (entry as { id?: string }).id

        if (!(id in state.entries)) return

        Object.assign(state.entries[id], entry)
        upload({ id, value: entry as GuiMaintenanceStateEntry })
    }

    const deleteEntry = (id: string) => {
        if (id in state.entries) delete state.entries[id]
        webSocketClient.emit('server.database.delete_item', { namespace: 'maintenance', key: id })
    }

    const perform = (payload: { id: string; note: string }) => {
        const entry = state.entries[payload.id]
        if (!entry) return

        const historyStore = useServerHistoryStore()
        const totalFilament = historyStore.job_totals.total_filament_used ?? 0
        const totalPrintTime = historyStore.job_totals.total_print_time ?? 0

        entry.id = payload.id
        entry.end_time = Date.now() / 1000
        entry.end_filament = totalFilament
        entry.end_printtime = totalPrintTime
        entry.perform_note = payload.note.trim() || null

        update(entry as GuiMaintenanceStateEntry & { id: string })

        if (entry.reminder.type === 'repeat') {
            const date = new Date()

            store({
                entry: {
                    name: entry.name,
                    note: entry.note,
                    start_time: date.getTime() / 1000,
                    end_time: null,
                    start_filament: totalFilament,
                    end_filament: null,
                    start_printtime: totalPrintTime,
                    end_printtime: null,
                    last_entry: payload.id,
                    reminder: { ...entry.reminder },
                } as GuiMaintenanceStateEntry,
            })
        }
    }

    const initStore = (payload: { value: Record<string, GuiMaintenanceStateEntry> }) => {
        reset()

        const entries = payload.value ?? {}
        const initKey = Object.keys(entries).find((key) => entries[key]?.name === 'MAINTENANCE_INIT')
        if (initKey) delete entries[initKey]

        state.entries = entries
        useSocketStore().removeInitModule('gui/maintenance/init')
    }

    const initDb = async () => {
        const baseUrl = useSocketStore().getUrl
        const url = `${baseUrl}/server/files/config/${themeDir}/maintenance.json?time=${Date.now()}`

        const defaults: MaintenanceJson = await fetch(url)
            .then((response) => {
                if (response.status !== 200) return { entries: [] }
                return response.json()
            })
            .catch((e) => {
                window.console.error('maintenance.json cannot be parsed', e)
                return { entries: [] }
            })

        const entries = defaults.entries ?? []
        if (entries.length === 0) {
            webSocketClient.emit('server.database.post_item', {
                namespace: 'maintenance',
                key: uuidv4(),
                value: { name: 'MAINTENANCE_INIT' },
            })

            return
        }

        const totals = await fetch(`${baseUrl}/server/history/totals`)
            .then(async (response) => {
                if (response.status !== 200) return {}

                const payload = (await response.json()) as unknown
                return (
                    (payload as { result?: { job_totals?: { total_filament_used?: number; total_print_time?: number } } })
                        .result?.job_totals ?? {}
                )
            })
            .catch((e) => {
                window.console.debug('History totals could not be loaded', e)
                return {} as { total_filament_used?: number; total_print_time?: number }
            })

        const total_filament = totals.total_filament_used ?? 0
        const total_print_time = totals.total_print_time ?? 0
        const date = new Date().getTime() / 1000

        entries.forEach((entry) => {
            store({
                entry: {
                    name: entry.name,
                    note: entry.note ?? '',
                    start_time: date,
                    end_time: null,
                    start_filament: total_filament,
                    end_filament: null,
                    start_printtime: total_print_time,
                    end_printtime: null,
                    last_entry: null,
                    reminder: {
                        type: entry.reminder?.type ?? null,
                        filament: {
                            bool: entry.reminder?.filament?.bool ?? false,
                            value: entry.reminder?.filament?.value ?? null,
                        },
                        printtime: {
                            bool: entry.reminder?.printtime?.bool ?? false,
                            value: entry.reminder?.printtime?.value ?? null,
                        },
                        date: {
                            bool: entry.reminder?.date?.bool ?? false,
                            value: entry.reminder?.date?.value ?? null,
                        },
                    },
                } as GuiMaintenanceStateEntry,
            })
        })
    }

    return {
        ...toRefs(state),
        getEntries,
        getOverdueEntries,
        reset,
        setData,
        init,
        upload,
        store,
        update,
        delete: deleteEntry,
        perform,
        initStore,
        initDb,
    }
})
