import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { GuiRemoteprintersState, GuiRemoteprintersStatePrinter } from '@/store/gui/remoteprinters/types'
import { caseInsensitiveSort } from '@/plugins/helpers'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
// TODO(phase-2): farm still uses Vuex dynamic per-printer module registration
// (this.registerModule/(un)registerModule); needs its own Pinia design (a
// store-of-stores keyed by printer id) when farm is ported.
import { useFarmStore } from '@/store/farm'

export const getDefaultState = (): GuiRemoteprintersState => ({
    printers: {},
})

export const useGuiRemoteprintersStore = defineStore('guiRemoteprinters', () => {
    const state = reactive<GuiRemoteprintersState>(getDefaultState())

    const getRemoteprinters = () => {
        const printers: GuiRemoteprintersStatePrinter[] = []

        Object.keys(state.printers).forEach((id: string) => {
            const socket = { ...useFarmStore().getPrinterSocketState(id) }
            printers.push({ ...state.printers[id], id, socket })
        })

        return caseInsensitiveSort(printers, 'hostname')
    }

    const reset = () => {
        Object.keys(state.printers).forEach((printerId) => {
            useFarmStore().unregisterPrinter(printerId)
        })

        resetState(state, getDefaultState)
    }

    const setData = (payload: Partial<GuiRemoteprintersState>) => deepMerge(state, payload)

    const initFromLocalstorage = (payload: { instancesDB: string; configInstances: GuiRemoteprintersStatePrinter[] }) => {
        let value: GuiRemoteprintersStatePrinter[] = payload.configInstances ?? []
        if (payload.instancesDB === 'browser') value = JSON.parse(localStorage.getItem('printers') ?? '{}')

        if (Array.isArray(value)) {
            const printers: Record<string, GuiRemoteprintersStatePrinter> = {}

            value.forEach((printer) => {
                const id = uuidv4()
                printers[id] = printer
            })

            initStore(printers)
        }
    }

    const initStore = (payload: Record<string, GuiRemoteprintersStatePrinter>) => {
        reset()

        Object.keys(payload).forEach((printerId: string) => {
            const printer = payload[printerId]
            state.printers[printerId] = printer

            useFarmStore().registerPrinter({
                id: printerId,
                hostname: printer.hostname ?? '',
                port: printer.port ?? 7125,
                path: printer.path ?? '',
                settings: printer.settings ?? {},
            })
        })
    }

    const upload = (id: string, instancesDB: string) => {
        if (instancesDB === 'browser') {
            const printers: GuiRemoteprintersStatePrinter[] = []

            Object.keys(state.printers).forEach((printerId: string) => {
                printers.push({
                    hostname: state.printers[printerId].hostname,
                    port: state.printers[printerId].port,
                    name: state.printers[printerId].name,
                    path: state.printers[printerId].path,
                    settings: state.printers[printerId].settings,
                })
            })

            localStorage.setItem('printers', JSON.stringify(printers))
        } else if (instancesDB === 'moonraker' && id in state.printers) {
            webSocketClient.emit('server.database.post_item', {
                namespace: 'mainsail',
                key: 'remoteprinters.printers.' + id,
                value: {
                    hostname: state.printers[id].hostname,
                    port: state.printers[id].port,
                    path: state.printers[id].path,
                    settings: state.printers[id].settings ?? {},
                },
            })
        }
    }

    const store = (payload: { values: GuiRemoteprintersStatePrinter }) => {
        const id = uuidv4()

        state.printers[id] = payload.values
        useFarmStore().registerPrinter({
            id,
            hostname: payload.values.hostname ?? '',
            port: payload.values.port ?? 7125,
            path: payload.values.path ?? '',
            name: payload.values.name,
        })

        return id
    }

    const update = (payload: { id: string; values: Partial<GuiRemoteprintersStatePrinter> }) => {
        if (payload.id in state.printers) {
            Object.assign(state.printers[payload.id], payload.values)
        }

        useFarmStore().updatePrinter(payload)
    }

    const updateSettings = (payload: { id: string; values: Record<string, unknown> }) => {
        if (payload.id in state.printers) {
            state.printers[payload.id].settings = payload.values
        }
    }

    const deletePrinter = (id: string, instancesDB: string) => {
        if (id in state.printers) delete state.printers[id]
        useFarmStore().unregisterPrinter(id)

        if (instancesDB === 'browser') upload('', instancesDB)
        else webSocketClient.emit('server.database.delete_item', { namespace: 'mainsail', key: 'remoteprinters.printers.' + id })
    }

    return {
        ...toRefs(state),
        getRemoteprinters,
        reset,
        setData,
        initFromLocalstorage,
        initStore,
        upload,
        store,
        update,
        updateSettings,
        delete: deletePrinter,
    }
})
