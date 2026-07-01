import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { GuiConsoleState, GuiConsoleStateFilter } from '@/store/gui/console/types'
import { caseInsensitiveSort } from '@/plugins/helpers'
import { timelapseConsoleFilters } from '@/store/variables'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useServerStore } from '@/store/server'
import { useGuiStore } from '@/store/gui'

export const getDefaultState = (): GuiConsoleState => ({
    hideWaitTemperatures: true,
    hideTlCommands: true,
    direction: 'table',
    entryStyle: 'default',
    height: 300,
    autoscroll: true,
    consolefilters: {},
    rawOutput: false,
})

export const useGuiConsoleStore = defineStore('guiConsole', () => {
    const state = reactive<GuiConsoleState>(getDefaultState())

    const getConsolefilters = computed<GuiConsoleStateFilter[]>(() => {
        const consolefilters: GuiConsoleStateFilter[] = []

        Object.keys(state.consolefilters).forEach((id: string) => {
            consolefilters.push({ ...state.consolefilters[id], id })
        })

        return caseInsensitiveSort(consolefilters, 'name')
    })

    const getConsolefilterRules = computed<string[]>(() => {
        const output: string[] = []

        if (state.hideWaitTemperatures) output.push('^(?:ok\\s+)?(B|C|T\\d*):')

        if (state.hideTlCommands) {
            timelapseConsoleFilters.forEach((rule: string) => {
                output.push(rule)
            })
        }

        Object.keys(state.consolefilters).forEach((id: string) => {
            const filter = state.consolefilters[id]
            if (filter.bool) {
                filter.regex.split('\n').forEach((rule: string) => {
                    if (rule !== '') output.push(rule)
                })
            }
        })

        return output
    })

    const getConsoleClearedSince = computed(() => state.cleared_since)

    const reset = () => resetState(state, getDefaultState)

    const setData = (payload: Partial<GuiConsoleState>) => deepMerge(state, payload)

    const clear = () => {
        const cleared_since = new Date().valueOf()
        webSocketClient.emit('server.database.post_item', {
            namespace: 'mainsail',
            key: 'console.cleared_since',
            value: cleared_since,
        })

        state.cleared_since = cleared_since

        useServerStore().clearGcodeStore()
        useServerStore().setConsoleClearedThisSession()
    }

    const saveSetting = (payload: { name: string; value: unknown }) => {
        useGuiStore().saveSetting({ name: 'console.' + payload.name, value: payload.value })
    }

    const filterUpload = (payload: { id: string; value: GuiConsoleStateFilter }) => {
        webSocketClient.emit('server.database.post_item', {
            namespace: 'mainsail',
            key: 'console.consolefilters.' + payload.id,
            value: payload.value,
        })
    }

    const filterStore = (payload: { values: GuiConsoleStateFilter }) => {
        const id = uuidv4()

        state.consolefilters[id] = payload.values
        filterUpload({ id, value: state.consolefilters[id] })
    }

    const filterUpdate = (payload: { id: string; values: Partial<GuiConsoleStateFilter> }) => {
        if (!(payload.id in state.consolefilters)) return

        Object.assign(state.consolefilters[payload.id], payload.values)
        filterUpload({ id: payload.id, value: state.consolefilters[payload.id] })
    }

    const filterDelete = (id: string) => {
        if (!(id in state.consolefilters)) return

        delete state.consolefilters[id]
        webSocketClient.emit('server.database.delete_item', {
            namespace: 'mainsail',
            key: 'console.consolefilters.' + id,
        })
    }

    return {
        ...toRefs(state),
        getConsolefilters,
        getConsolefilterRules,
        getConsoleClearedSince,
        reset,
        setData,
        clear,
        saveSetting,
        filterUpload,
        filterStore,
        filterUpdate,
        filterDelete,
    }
})
