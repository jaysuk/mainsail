<template>
    <panel v-if="klipperReadyForGui && macros.length > 0 && macrogroupStatus" :icon="mdiCodeTags" :title="macrogroup.name" :collapsible="true" :card-class="'macrogroup_' + panelId + '_panel'">
        <v-card-text class="py-2">
            <v-row>
                <v-col class="text-center">
                    <macro-button v-for="(macro, index) in macros" :key="'macroparam_' + index" :macro="macro" :color="getColor(macro)" class="mx-1 my-1" />
                </v-col>
            </v-row>
        </v-card-text>
    </panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Panel from '@/components/ui/Panel.vue'
import MacroButton from '@/components/inputs/MacroButton.vue'
import type { PrinterStateMacro } from '@/store/printer/types'
import type { GuiMacrosStateMacrogroupMacro } from '@/store/gui/macros/types'
import { mdiCodeTags } from '@mdi/js'
import { useBase } from '@/composables/useBase'
import { usePrinterStore } from '@/store/printer'
import { useGuiMacrosStore } from '@/store/gui/macros'

const props = defineProps<{
    panelId: string
}>()

const { klipperReadyForGui, printer_state } = useBase()
const printerStore = usePrinterStore()
const guiMacrosStore = useGuiMacrosStore()

const macrogroup = computed(() => guiMacrosStore.getMacrogroup(props.panelId))

const allMacros = computed(() => printerStore.getMacros ?? [])

const macros = computed(() => {
    let macros = macrogroup.value?.macros ?? []

    macros = macros.filter((macro: GuiMacrosStateMacrogroupMacro) => {
        if (!allMacros.value.find((existMacro: PrinterStateMacro) => existMacro.name.toLowerCase() === macro.name.toLowerCase())) return false

        return (
            (macro.showInStandby && ['standby', 'cancelled', 'complete', 'error'].includes(printer_state.value)) ||
            (macro.showInPause && printer_state.value === 'paused') ||
            (macro.showInPrinting && printer_state.value === 'printing')
        )
    })

    return macros.sort((a: GuiMacrosStateMacrogroupMacro, b: GuiMacrosStateMacrogroupMacro) => a.pos - b.pos)
})

const macrogroupStatus = computed(
    () =>
        (macrogroup.value.showInStandby && ['standby', 'cancelled', 'complete', 'error'].includes(printer_state.value)) ||
        (macrogroup.value.showInPause && printer_state.value === 'paused') ||
        (macrogroup.value.showInPrinting && printer_state.value === 'printing')
)

function getColor(macro: GuiMacrosStateMacrogroupMacro) {
    if (macro.color === 'group') {
        if (macrogroup.value.color === 'custom') return macrogroup.value.colorCustom
        else return macrogroup.value.color
    }

    return macro.color
}
</script>
