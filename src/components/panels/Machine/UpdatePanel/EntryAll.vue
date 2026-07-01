<template>
    <div>
        <v-row class="pt-3">
            <v-col class="text-center">
                <v-btn variant="text" color="primary" size="small" :disabled="['printing', 'paused'].includes(printer_state)" @click="clickUpdate">
                    <v-icon start>{{ mdiProgressUpload }}</v-icon>
                    {{ t('Machine.UpdatePanel.UpdateAll') }}
                </v-btn>
            </v-col>
        </v-row>
        <update-hint-all v-model="boolShowDialog" @update-all="updateAll" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiProgressUpload } from '@mdi/js'
import UpdateHintAll from '@/components/panels/Machine/UpdatePanel/UpdateHintAll.vue'
import { useBase } from '@/composables/useBase'
import { useGuiStore } from '@/store/gui'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { printer_state } = useBase()
const guiStore = useGuiStore()

const boolShowDialog = ref(false)

const hideUpdateWarning = computed(() => guiStore.uiSettings.hideUpdateWarnings ?? false)

function clickUpdate() {
    if (hideUpdateWarning.value) {
        updateAll()
        return
    }

    boolShowDialog.value = true
}

function updateAll() {
    webSocketClient.emit('machine.update.full', {})
}
</script>

<style scoped></style>
