<template>
    <div v-if="['printing', 'paused'].includes(printer_state) && printing_objects.length">
        <v-container class="py-0">
            <div class="d-flex flex-row flex-nowrap justify-space-between">
                <div class="py-2" style="width: calc(100% - 25px)">
                    <span class="subtitle-2 d-block px-0 text-disabled text-truncate">
                        <v-icon class="mr-2" size="small">{{ mdiPrinter3dNozzle }}</v-icon>
                        {{ current_object !== null ? current_object : '--' }}
                    </span>
                </div>
                <div class="py-2 pl-0">
                    <v-icon v-if="current_object !== null" class="text-disabled cursor-pointer" size="small" @click="openCancelObjectDialog(current_object)">
                        {{ mdiSelectionRemove }}
                    </v-icon>
                </div>
            </div>
        </v-container>
        <v-divider class="mt-0 mb-0" />
        <confirmation-dialog
            v-model="boolShowExcludeObjectDialog"
            :title="t('Panels.StatusPanel.ExcludeObject.ExcludeObjectHeadline')"
            :text="t('Panels.StatusPanel.ExcludeObject.ExcludeObjectText', { name: excludeObjectDialogName })"
            :action-button-text="t('Panels.StatusPanel.ExcludeObject.ExcludeObject')"
            action-button-color="primary"
            @action="cancelObject" />
        <status-panel-exclude-object-dialog
            v-model:show-dialog="showDialogPass"
            :exclude-object-dialog-name="excludeObjectDialogName"
            :exclude-object-dialog-bool="boolShowExcludeObjectDialog"
            @update:name="updateExcludeObjectDialogName"
            @update:bool="updateExcludeObjectDialogBool" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StatusPanelExcludeObjectDialog from '@/components/panels/Status/ExcludeObjectDialog.vue'
import { mdiPrinter3dNozzle, mdiSelectionRemove } from '@mdi/js'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import { useBase } from '@/composables/useBase'
import { usePrinterStore } from '@/store/printer'
import { webSocketClient } from '@/plugins/webSocketClient'

const props = defineProps<{
    showDialog: boolean
}>()

const emit = defineEmits<{
    'update:showDialog': [value: boolean]
}>()

const { t } = useI18n()
const { printer_state } = useBase()
const printerStore = usePrinterStore()

const boolShowExcludeObjectDialog = ref(false)
const excludeObjectDialogName = ref('')

const showDialogPass = computed<boolean>({
    get: () => props.showDialog,
    set: (newVal) => emit('update:showDialog', newVal),
})

const printing_objects = computed<{ name: string }[]>(() => printerStore.exclude_object?.objects ?? [])

const current_object = computed<string | null>(() => printerStore.exclude_object?.current_object ?? null)

function updateExcludeObjectDialogName(newVal: string) {
    excludeObjectDialogName.value = newVal
}

function updateExcludeObjectDialogBool(newVal: boolean) {
    boolShowExcludeObjectDialog.value = newVal
}

function openCancelObjectDialog(objectName: string) {
    excludeObjectDialogName.value = objectName
    boolShowExcludeObjectDialog.value = true
}

function cancelObject() {
    webSocketClient.emit('printer.gcode.script', { script: 'EXCLUDE_OBJECT NAME=' + excludeObjectDialogName.value })
}
</script>
