<template>
    <panel v-if="klipperReadyForGui && macros.length > 0" :icon="mdiCodeTags" :title="t('Panels.MacrosPanel.Headline')" :collapsible="true" card-class="macros-panel">
        <v-card-text class="py-2">
            <v-row>
                <v-col class="text-center">
                    <macro-button v-for="(macro, index) in macros" :key="'macro_' + index" :macro="macro" color="primary" class="mx-1 my-1" />
                </v-col>
            </v-row>
        </v-card-text>
    </panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import MacroButton from '@/components/inputs/MacroButton.vue'
import { mdiCodeTags } from '@mdi/js'
import type { PrinterStateMacro } from '@/store/printer/types'
import { useBase } from '@/composables/useBase'
import { usePrinterStore } from '@/store/printer'
import { useGuiMacrosStore } from '@/store/gui/macros'

const { t } = useI18n()
const { klipperReadyForGui } = useBase()
const printerStore = usePrinterStore()
const guiMacrosStore = useGuiMacrosStore()

const hiddenMacros = computed(() => (guiMacrosStore.hiddenMacros ?? []).map((name: string) => name.toLowerCase()))

const macros = computed(() => {
    const macros = printerStore.getMacros

    return macros.filter((macro: PrinterStateMacro) => !hiddenMacros.value.includes(macro.name.toLowerCase()))
})
</script>
