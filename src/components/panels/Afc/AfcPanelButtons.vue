<template>
    <v-menu :close-on-content-click="false" :title="t('Panels.AfcPanel.Functions')" location="bottom end">
        <template #activator="{ props: activatorProps }">
            <v-btn icon="" variant="text" v-bind="activatorProps">
                <v-icon>{{ mdiDotsVertical }}</v-icon>
            </v-btn>
        </template>
        <v-list density="compact">
            <v-list-item v-for="macro in macros" :key="macro.macroName">
                <macro-button :macro="macro.macro" :alias="macro.text" :icon="macro.icon" :disabled="macro.disabled" color="" class="w-100" />
            </v-list-item>
            <v-list-item>
                <v-btn class="w-100" size="small" @click="showAfcSettings = true">
                    <v-icon size="small" start>{{ mdiVariable }}</v-icon>
                    {{ t('Panels.AfcPanel.AfcSettings') }}
                </v-btn>
                <afc-settings-dialog v-model="showAfcSettings" />
            </v-list-item>
            <v-list-item>
                <v-btn class="w-100" size="small" @click="downloadDebugJson">
                    <v-icon size="small" start>{{ mdiArrowDownBold }}</v-icon>
                    {{ t('Panels.AfcPanel.DebugJson') }}
                </v-btn>
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiArrowDownBold, mdiDotsVertical, mdiLightbulbOnOutline, mdiLightbulbOutline, mdiVariable, mdiWrench } from '@mdi/js'
import type { PrinterStateMacro } from '@/store/printer/types'
import MacroButton from '@/components/inputs/MacroButton.vue'
import AfcSettingsDialog from '@/components/dialogs/AfcSettingsDialog.vue'
import { useBase } from '@/composables/useBase'
import { useAfc } from '@/composables/useAfc'
import { usePrinterStore } from '@/store/printer'

const { t } = useI18n()
const { printerIsPrintingOnly } = useBase()
const { afc } = useAfc()
const printerStore = usePrinterStore()

const showAfcSettings = ref(false)

const macros = computed(() => {
    const macros = printerStore.getMacros
    const settings = printerStore.configfile?.settings?.afc ?? {}
    const ledState = afc.value.led_state ?? false

    const afcMacros: {
        icon: string | null
        text: string
        macroName: string
        disabled: boolean
    }[] = [
        {
            icon: mdiWrench,
            text: t('Panels.AfcPanel.Calibrate'),
            macroName: 'AFC_CALIBRATION',
            disabled: printerIsPrintingOnly.value,
        },
        {
            icon: ledState ? mdiLightbulbOnOutline : mdiLightbulbOutline,
            text: ledState ? t('Panels.AfcPanel.LedOff') : t('Panels.AfcPanel.LedOn'),
            macroName: ledState ? 'TURN_OFF_AFC_LED' : 'TURN_ON_AFC_LED',
            disabled: false,
        },
    ]

    if (afc.value?.td1_present) {
        afcMacros.push({
            icon: null,
            text: t('Panels.AfcPanel.CaptureTD'),
            macroName: 'AFC_GET_TD_ONE_DATA',
            disabled: printerIsPrintingOnly.value,
        })
    }

    if (settings.wipe) {
        afcMacros.push({
            icon: null,
            text: t('Panels.AfcPanel.BrushNozzle'),
            macroName: settings?.wipe_cmd || 'AFC_BRUSH',
            disabled: printerIsPrintingOnly.value,
        })
    }

    if (settings.park) {
        afcMacros.push({
            icon: null,
            text: t('Panels.AfcPanel.ParkNozzle'),
            macroName: settings?.park_cmd || 'AFC_PARK',
            disabled: printerIsPrintingOnly.value,
        })
    }

    return afcMacros
        .map((button) => {
            return {
                ...button,
                macro: macros.find((macro: PrinterStateMacro) => macro.name.toLowerCase() === button.macroName.toLowerCase()) ?? null,
            }
        })
        .filter((button) => button.macro !== null)
})

function downloadDebugJson() {
    const AFC_DEBUG_FILENAME = 'afc_debug.json'
    const output: {
        config: Record<string, unknown>
        settings: Record<string, unknown>
        printer: Record<string, unknown>
    } = {
        config: {},
        settings: {},
        printer: {},
    }
    const printer = printerStore as unknown as Record<string, unknown>
    const config = (printerStore.configfile?.config ?? {}) as Record<string, unknown>
    const settings = (printerStore.configfile?.settings ?? {}) as Record<string, unknown>

    Object.keys(config)
        .filter((key) => key.toLowerCase().startsWith('afc'))
        .forEach((name) => {
            output.config[name] = { ...(config[name] as Record<string, unknown>) }
        })

    Object.keys(settings)
        .filter((key) => key.toLowerCase().startsWith('afc'))
        .forEach((name) => {
            output.settings[name] = { ...(settings[name] as Record<string, unknown>) }
        })

    Object.keys(printer)
        .filter((key) => key.toLowerCase().startsWith('afc'))
        .forEach((name) => {
            output.printer[name] = { ...(printer[name] as Record<string, unknown>) }
        })

    const jsonString = JSON.stringify(output, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = AFC_DEBUG_FILENAME

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
}
</script>
