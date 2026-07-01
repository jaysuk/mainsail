<template>
    <v-card-text>
        <v-row class="mt-6 mb-3 flex-column flex-md-row">
            <v-col class="py-0 align-content-center mb-3 mb-md-0">
                <h3 class="text-h5">{{ t('Settings.MacrosTab.Macros') }}</h3>
            </v-col>
            <v-col class="py-0">
                <v-text-field v-model="searchMacros" :append-icon="mdiMagnify" :label="t('Settings.MacrosTab.Search')" single-line variant="outlined" clearable hide-details density="compact" />
            </v-col>
        </v-row>
        <template v-if="macros.length">
            <template v-for="(macro, index) in macros" :key="index">
                <v-divider v-if="index" class="my-2" />
                <settings-row :title="macro.name" :sub-title="macro.description" :dynamic-slot-width="true">
                    <v-switch :model-value="getMacroStatus(macro.name)" hide-details class="mt-0" @update:model-value="changeMacroStatus(macro.name)" />
                </settings-row>
            </template>
        </template>
        <v-row v-else>
            <v-col>
                <p class="mb-0 text-center font-italic">{{ t('Settings.MacrosTab.NOMacros') }}</p>
            </v-col>
        </v-row>
    </v-card-text>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiMagnify } from '@mdi/js'
import type { PrinterStateMacro } from '@/store/printer/types'
import { usePrinterStore } from '@/store/printer'
import { useGuiMacrosStore } from '@/store/gui/macros'

const { t } = useI18n()
const printerStore = usePrinterStore()
const guiMacrosStore = useGuiMacrosStore()

const searchMacros = ref('')

const macros = computed(() => {
    const macros = printerStore.getMacros ?? []
    return macros.filter((macro: PrinterStateMacro) => {
        return macro.name.toLowerCase().includes(searchMacros.value.toLowerCase()) || macro.description?.toLowerCase().includes(searchMacros.value.toLowerCase())
    })
})

const hiddenMacros = computed(() => guiMacrosStore.hiddenMacros ?? [])

function getMacroStatus(name: string) {
    return !hiddenMacros.value.includes(name.toUpperCase())
}

function changeMacroStatus(name: string) {
    const newHiddenMacros = [...hiddenMacros.value]

    if (hiddenMacros.value.includes(name.toUpperCase())) newHiddenMacros.splice(newHiddenMacros.indexOf(name.toUpperCase()), 1)
    else newHiddenMacros.push(name.toUpperCase())

    guiMacrosStore.saveSetting({ name: 'hiddenMacros', value: newHiddenMacros })
}
</script>
