import { defineStore } from 'pinia'
import { reactive, markRaw, type Component } from 'vue'
import { useGuiStore } from '@/store/gui'
import type { GuiStateLayoutoption } from '@/store/gui/types'

/**
 * Dynamic dashboard panel registry.
 *
 * Panel *layout* (order, visibility, which viewport/column a panel sits in)
 * is already owned by useGuiStore's `dashboard` state and `getPanels()`
 * getter -- that's DB-persisted per-user config and shouldn't be duplicated
 * here. What this store adds is the missing piece for genuine dynamic
 * mounting: an explicit `name -> component` registry that `<component :is>`
 * resolves against, replacing the Vue 2 pattern of building a kebab-case
 * string (`extractPanelName`) and relying on Vue's implicit local-component
 * name matching. An explicit registry object is also the injection point
 * Phase 4's `window.Mainsail.registerDashboardPanel` plugin API needs --
 * there's no way to push a new entry into Vue 2's implicit string-matching
 * scheme from outside the component that declared it.
 */
export const useLayoutStore = defineStore('layout', () => {
    const registry = reactive(new Map<string, Component>())

    const registerPanel = (name: string, component: Component) => {
        // components are plain render definitions, not reactive state --
        // markRaw avoids wrapping them in a reactive proxy for no benefit
        registry.set(name, markRaw(component))
    }

    const unregisterPanel = (name: string) => {
        registry.delete(name)
    }

    const resolvePanelComponent = (panelName: string): Component | undefined => {
        // macrogroup panels are all rendered by the single MacrogroupPanel
        // component, differentiated at runtime via the panel-id prop
        const registryKey = panelName.startsWith('macrogroup_') ? 'macrogroup' : panelName
        return registry.get(registryKey)
    }

    const extractPanelId = (name: string): string | null => name.split('_')[1] ?? null

    // pass-through accessors so components have one place to ask "what
    // panels, in what order, for this viewport" without reaching into two
    // different stores
    const getPanels = (viewport: string, column: number, onlyVisible = false): GuiStateLayoutoption[] =>
        useGuiStore().getPanels(viewport, column, onlyVisible)

    const getPanelExpand = (name: string, viewport: string): boolean => useGuiStore().getPanelExpand(name, viewport)

    return {
        registerPanel,
        unregisterPanel,
        resolvePanelComponent,
        extractPanelId,
        getPanels,
        getPanelExpand,
    }
})
