<template>
    <v-dialog v-model="showDialog" width="400" persistent>
        <panel :title="t('EmergencyStopDialog.EmergencyStop')" toolbar-color="error" card-class="emergency-stop-dialog" :icon="mdiAlertOctagonOutline" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="closePrompt">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>{{ t('EmergencyStopDialog.AreYouSure') }}</v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="closePrompt">{{ t('Buttons.No') }}</v-btn>
                <v-btn color="error" variant="text" @click="emergencyStop">{{ t('Buttons.Yes') }}</v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiAlertOctagonOutline, mdiCloseThick } from '@mdi/js'
import { webSocketClient } from '@/plugins/webSocketClient'

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()

function emergencyStop() {
    webSocketClient.emit('printer.emergency_stop', {}, { loading: 'topbarEmergencyStop' })

    closePrompt()
}

function closePrompt() {
    showDialog.value = false
}
</script>
