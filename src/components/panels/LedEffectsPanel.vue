<template>
    <panel v-if="klipperReadyForGui" :icon="mdiLedStrip" :title="t('Panels.LedEffectsPanel.Headline')" :collapsible="true" card-class="led-effects-panel">
        <template #buttons>
            <v-tooltip location="left">
                <template #activator="{ props: activatorProps }">
                    <v-btn v-bind="activatorProps" icon="" variant="text" :loading="isLoadingAllEffects" :disabled="printerIsPrintingOnly" @click="stopAllEffects">
                        <v-icon>{{ mdiStop }}</v-icon>
                    </v-btn>
                </template>
                <span>{{ t('Panels.LedEffectsPanel.StopAll') }}</span>
            </v-tooltip>
        </template>
        <v-card-text class="py-2">
            <v-row>
                <v-col class="text-center">
                    <led-effect-button v-for="name in ledEffects" :key="'led_effect_' + name" :name="name" class="mx-1 my-1" />
                </v-col>
            </v-row>
        </v-card-text>
    </panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import LedEffectButton from '@/components/inputs/LedEffectButton.vue'
import { mdiLedStrip, mdiStop } from '@mdi/js'
import { useBase } from '@/composables/useBase'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const STOP_LED_EFFECTS_COMMAND = 'STOP_LED_EFFECTS'

const { t } = useI18n()
const { klipperReadyForGui, printerIsPrintingOnly, loadings } = useBase()
const printerStore = usePrinterStore()

const ledEffects = computed(() => {
    const prefix = 'led_effect '
    const prefixLength = prefix.length

    return Object.keys(printerStore)
        .filter((prop) => prop.toLowerCase().startsWith(prefix))
        .map((prop) => prop.slice(prefixLength))
        .filter((name) => !name.startsWith('_'))
        .sort((a, b) => a.localeCompare(b))
})

const isLoadingAllEffects = computed(() => loadings.value.includes(STOP_LED_EFFECTS_COMMAND))

function stopAllEffects() {
    useServerStore().addEvent({ message: STOP_LED_EFFECTS_COMMAND, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: STOP_LED_EFFECTS_COMMAND }, { loading: STOP_LED_EFFECTS_COMMAND })
}
</script>
