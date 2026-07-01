<template>
    <v-btn :color="buttonColor" :loading="isLoading" :disabled="printerIsPrintingOnly" class="text-uppercase" size="small" @click="toggleEffect">
        {{ name }}
    </v-btn>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useBase } from '@/composables/useBase'

interface LedEffectState {
    enabled: boolean
}

const props = defineProps<{ name: string }>()

const printerStore = usePrinterStore()
const { loadings, printerIsPrintingOnly } = useBase()

const ledEffectState = computed<LedEffectState | undefined>(() => {
    const objectKey = `led_effect ${props.name}`
    return (printerStore as Record<string, unknown>)[objectKey] as LedEffectState | undefined
})

const isEnabled = computed(() => ledEffectState.value?.enabled ?? false)
const buttonColor = computed(() => (isEnabled.value ? 'success' : 'primary'))
const loadingKey = computed(() => `led_effect_${props.name}`)
const isLoading = computed(() => loadings.value.includes(loadingKey.value))

function toggleEffect() {
    let command = `SET_LED_EFFECT EFFECT="${props.name}"`
    if (isEnabled.value) command += ' STOP=1'

    useServerStore().addEvent({ message: command, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: command }, { loading: loadingKey.value })
}
</script>
