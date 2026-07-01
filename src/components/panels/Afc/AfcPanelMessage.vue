<template>
    <v-alert v-if="message" :icon="mdiAlert" :type="type" class="mt-3 align-content-center" density="compact" variant="text">
        <v-row>
            <v-col class="grow text-format">{{ message }}</v-col>
            <v-col class="shrink py-0 align-content-center">
                <v-btn icon="" variant="text" @click="clearMessage">
                    <v-icon size="small">{{ mdiClose }}</v-icon>
                </v-btn>
            </v-col>
        </v-row>
    </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiAlert, mdiClose } from '@mdi/js'
import { useAfc } from '@/composables/useAfc'
import { useControl } from '@/composables/useControl'

const { afc } = useAfc()
const { doSend } = useControl()

const afcMessage = computed(() => afc.value.message as { type?: string; message?: string } | undefined)

type AlertType = 'error' | 'warning' | 'success' | 'info'

const type = computed<AlertType>(() => {
    const type = afcMessage.value?.type ?? 'error'
    const possibleTypes: AlertType[] = ['info', 'warning', 'success', 'error']

    if (!possibleTypes.includes(type as AlertType)) {
        window.console.warn(`AfcPanelMessage: Invalid message type "${type}" detected. Defaulting to "error".`)
        return 'error'
    }

    return type as AlertType
})

const message = computed(() => afcMessage.value?.message ?? '')

function clearMessage() {
    doSend('AFC_CLEAR_MESSAGE')
}
</script>

<style scoped>
.text-format {
    white-space: break-spaces;
    font-family: 'Roboto Mono', monospace;
    font-size: 0.875rem;
}
</style>
