import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { GuiMacrosState, GuiMacrosStateMacrogroup, GuiMacrosStateMacrogroupMacro } from '@/store/gui/macros/types'
import type { GuiStateDashboardLayoutKey, GuiStateLayoutoption } from '@/store/gui/types'
import { caseInsensitiveSort } from '@/plugins/helpers'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useGuiStore } from '@/store/gui'

export const getDefaultState = (): GuiMacrosState => ({
    mode: 'simple',
    hiddenMacros: [],
    macrogroups: {},
})

export const useGuiMacrosStore = defineStore('guiMacros', () => {
    const state = reactive<GuiMacrosState>(getDefaultState())

    const getAllMacrogroups = computed<GuiMacrosStateMacrogroup[]>(() => {
        const macrogroups: GuiMacrosStateMacrogroup[] = []

        Object.keys(state.macrogroups).forEach((id: string) => {
            macrogroups.push({ ...state.macrogroups[id], id })
        })

        return caseInsensitiveSort(macrogroups, 'name')
    })

    const getMacrogroup = (id: string) => state.macrogroups[id]

    const reset = () => resetState(state, getDefaultState)

    const setData = (payload: Partial<GuiMacrosState>) => deepMerge(state, payload)

    const saveSetting = (payload: { name: string; value: unknown }) => {
        useGuiStore().saveSetting({ name: 'macros.' + payload.name, value: payload.value })
    }

    const groupUpload = (id: string) => {
        webSocketClient.emit('server.database.post_item', {
            namespace: 'mainsail',
            key: 'macros.macrogroups.' + id,
            value: state.macrogroups[id],
        })
    }

    const groupStore = (payload: { values: GuiMacrosStateMacrogroup }): string => {
        const id = uuidv4()

        state.macrogroups[id] = payload.values
        groupUpload(id)

        return id
    }

    const groupUpdate = (payload: { id: string; values: Partial<GuiMacrosStateMacrogroup> }) => {
        if (payload.id in state.macrogroups) {
            Object.assign(state.macrogroups[payload.id], payload.values)
            groupUpload(payload.id)
        }
    }

    const addMacroToMacrogroup = (payload: { id: string; macro: string }) => {
        const macros = [...(state.macrogroups[payload.id]?.macros ?? [])]

        const newMacro: GuiMacrosStateMacrogroupMacro = {
            pos: 1,
            name: payload.macro,
            color: 'group',
            showInStandby: true,
            showInPrinting: true,
            showInPause: true,
        }

        if (macros.length) newMacro.pos = Math.max(...macros.map((m) => m.pos)) + 1
        macros.push(newMacro)

        state.macrogroups[payload.id].macros = macros
        groupUpload(payload.id)
    }

    const updateMacroFromMacrogroup = <K extends keyof GuiMacrosStateMacrogroupMacro>(payload: {
        option: K
        value: GuiMacrosStateMacrogroupMacro[K]
        id: string
        macro: string
    }) => {
        const macros = [...(state.macrogroups[payload.id]?.macros ?? [])]
        const updateMacroIndex = macros.findIndex((m) => m.name === payload.macro)
        if (updateMacroIndex === -1) return

        const macro = { ...macros[updateMacroIndex] }
        macro[payload.option] = payload.value
        macros[updateMacroIndex] = macro
        state.macrogroups[payload.id].macros = macros
        groupUpload(payload.id)
    }

    const removeMacroFromMacrogroup = (payload: { id: string; macro: string }) => {
        const macros = [...(state.macrogroups[payload.id]?.macros ?? [])]
        const deletedMacroIndex = macros.findIndex((m) => m.name === payload.macro)
        if (deletedMacroIndex !== -1) {
            const oldPos = macros[deletedMacroIndex].pos
            macros.splice(deletedMacroIndex, 1)

            macros
                .filter((macro) => macro.pos > oldPos)
                .forEach((macro) => {
                    macro.pos = macro.pos - 1
                })
        }

        state.macrogroups[payload.id].macros = macros
        groupUpload(payload.id)
    }

    const groupDelete = (id: string) => {
        if (id in state.macrogroups) delete state.macrogroups[id]

        webSocketClient.emit('server.database.delete_item', { namespace: 'mainsail', key: 'macros.macrogroups.' + id })

        const guiStore = useGuiStore()
        const layouts: GuiStateDashboardLayoutKey[] = [
            'mobileLayout',
            'tabletLayout1',
            'tabletLayout2',
            'desktopLayout1',
            'desktopLayout2',
            'widescreenLayout1',
            'widescreenLayout2',
            'widescreenLayout3',
        ]

        layouts.forEach((layoutname) => {
            const dashboard = guiStore.dashboard
            if (!dashboard) return

            const layoutArray = [...(dashboard[layoutname] as GuiStateLayoutoption[])]
            const index = layoutArray.findIndex((layoutPos) => layoutPos.name === 'macrogroup_' + id)
            if (index === -1) return

            guiStore.deleteFromDashboardLayout({ layoutname, index })
            guiStore.updateSettings({ keyName: 'dashboard.' + layoutname, newVal: dashboard[layoutname] })
        })
    }

    return {
        ...toRefs(state),
        getAllMacrogroups,
        getMacrogroup,
        reset,
        setData,
        saveSetting,
        groupUpload,
        groupStore,
        groupUpdate,
        addMacroToMacrogroup,
        updateMacroFromMacrogroup,
        removeMacroFromMacrogroup,
        groupDelete,
    }
})
