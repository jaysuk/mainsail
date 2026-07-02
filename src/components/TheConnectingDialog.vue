<template>
    <v-dialog :model-value="showDialog" persistent :width="400">
        <panel :title="titleText" :icon="mdiConnection" card-class="the-connection-dialog" :margin-bottom="false">
            <v-card-text v-if="connectingFailed" class="pt-5">
                <connection-status :moonraker="false" />
                <p class="text-center mt-3 mb-0">
                    {{ t('ConnectionDialog.CannotConnectTo', { host: formatHostname }) }}
                </p>
                <p v-if="connectionFailedMessage" class="text-center mt-1 text-error">
                    {{ t('ConnectionDialog.ErrorMessage', { message: connectionFailedMessage }) }}
                </p>
                <template v-if="counter > 2">
                    <v-divider class="my-3" />
                    <p>{{ t('ConnectionDialog.CheckMoonrakerLog') }}</p>
                    <ul>
                        <li>~/printer_data/logs/moonraker.log</li>
                    </ul>
                    <v-divider class="mt-4 mb-5" />
                </template>
                <div class="text-center mt-3">
                    <v-btn v-if="helpButtonUrl" class="text-disabled mr-3" :href="helpButtonUrl" target="_blank">
                        <v-icon start>{{ mdiHelp }}</v-icon>
                        {{ t('ConnectionDialog.Help') }}
                    </v-btn>
                    <v-btn class="text-primary" @click="reconnect">{{ t('ConnectionDialog.TryAgain') }}</v-btn>
                </div>
            </v-card-text>
            <v-card-text v-else class="pt-5">
                <v-progress-linear :color="progressBarColor" indeterminate />
            </v-card-text>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import ConnectionStatus from '@/components/ui/ConnectionStatus.vue'
import { mdiConnection, mdiHelp } from '@mdi/js'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { useBase } from '@/composables/useBase'
import { useSocketStore } from '@/store/socket'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { progressBarColor } = useMainsailTheme()
const { guiIsReady } = useBase()
const socketStore = useSocketStore()

const counter = ref(0)

const hostname = computed(() => socketStore.hostname)
const port = computed(() => socketStore.port)
const path = computed(() => socketStore.path)

const formatHostname = computed(() => (parseInt(String(port.value)) !== 80 && String(port.value) !== '' ? hostname.value + ':' + port.value + path.value : hostname.value + path.value))

const isConnecting = computed(() => socketStore.isConnecting)
const connectingFailed = computed(() => socketStore.connectingFailed)
// Always true: App.vue only mounts this component at all while the app is in
// a not-yet-connected/not-yet-ready state (v-else against that gate), so the
// dialog should always be visible for as long as this component exists.
const showDialog = computed(() => true)

const titleText = computed(() => {
    if (connectingFailed.value) return t('ConnectionDialog.Failed', { host: formatHostname.value })
    if (isConnecting.value) return t('ConnectionDialog.Connecting', { host: formatHostname.value })
    if (!guiIsReady.value) return t('ConnectionDialog.Initializing')

    return formatHostname.value
})

const connectionFailedMessage = computed(() => socketStore.connectionFailedMessage ?? null)

const helpButtonUrl = computed(() => {
    if (!socketStore.connectionFailedMessage) return null

    return `https://docs.mainsail.xyz/faq/mainsail_errors/connection-${connectionFailedMessage.value?.toLowerCase()}`
})

function reconnect() {
    counter.value++
    socketStore.setData({ connectingFailed: false })
    webSocketClient.connect()
}
</script>
