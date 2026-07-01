import { computed } from 'vue'
import { usePrinterStore } from '@/store/printer'
import { useGuiConsoleStore } from '@/store/gui/console'
import { useGuiGcodehistoryStore } from '@/store/gui/gcodehistory'
import type { GuiConsoleStateFilter } from '@/store/gui/console/types'

/** Replaces the Vue 2 `ConsoleMixin` class component. */
export function useConsole() {
    const printerStore = usePrinterStore()
    const consoleStore = useGuiConsoleStore()
    const gcodehistoryStore = useGuiGcodehistoryStore()

    const helplist = computed(() => {
        const commands: Record<string, { help?: string }> = printerStore.gcode?.commands ?? {}
        const output: { command: string; help: string }[] = []

        for (const [key, values] of Object.entries(commands)) {
            output.push({ command: key, help: values.help ?? '' })
        }

        return output
    })

    const consoleDirection = computed(() => consoleStore.direction ?? 'table')
    const customFilters = computed(() => consoleStore.consolefilters ?? {})
    const lastCommands = computed<string[]>(() => gcodehistoryStore.entries ?? [])

    const hideWaitTemperatures = computed<boolean>({
        get: () => consoleStore.hideWaitTemperatures,
        set: (newVal) => consoleStore.saveSetting({ name: 'hideWaitTemperatures', value: newVal }),
    })

    const hideTlCommands = computed<boolean>({
        get: () => consoleStore.hideTlCommands,
        set: (newVal) => consoleStore.saveSetting({ name: 'hideTlCommands', value: newVal }),
    })

    const autoscroll = computed<boolean>({
        get: () => consoleStore.autoscroll ?? true,
        set: (newVal) => consoleStore.saveSetting({ name: 'autoscroll', value: newVal }),
    })

    const rawOutput = computed<boolean>({
        get: () => consoleStore.rawOutput ?? false,
        set: (newVal) => consoleStore.saveSetting({ name: 'rawOutput', value: newVal }),
    })

    const toggleFilter = (id: string | number, filter: GuiConsoleStateFilter) => {
        consoleStore.filterUpdate({ id: String(id), values: filter })
    }

    const clearConsole = () => {
        consoleStore.clear()
    }

    return {
        helplist,
        consoleDirection,
        hideWaitTemperatures,
        hideTlCommands,
        customFilters,
        autoscroll,
        rawOutput,
        lastCommands,
        toggleFilter,
        clearConsole,
    }
}
