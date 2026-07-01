<template>
    <div>
        <v-dialog v-model="showDialogPass" width="900" persistent :fullscreen="isMobile">
            <panel :title="t('Panels.StatusPanel.ExcludeObject.ExcludeObject')" :icon="mdiSelectionRemove" card-class="exclude-object-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon="" variant="text" @click="hideDialog">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-container>
                    <v-row>
                        <v-col class="col-12 col-sm-6 pb-0 pb-sm-3">
                            <status-panel-exclude-object-dialog-map :hover-name="hoverName" @update:name="updateExcludeObjectDialogName" @update:bool="updateExcludeObjectDialogBool" />
                        </v-col>
                        <v-col class="col-12 col-sm-6 pt-0 pt-sm-3">
                            <status-panel-exclude-object-dialog-list
                                :hover-name="hoverName"
                                @update:name="updateExcludeObjectDialogName"
                                @update:hover-name="updateHoverObjectDialogName"
                                @update:bool="updateExcludeObjectDialogBool" />
                        </v-col>
                    </v-row>
                </v-container>
            </panel>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiCloseThick, mdiSelectionRemove } from '@mdi/js'
import StatusPanelExcludeObjectDialogMap from '@/components/panels/Status/ExcludeObjectDialogMap.vue'
import StatusPanelExcludeObjectDialogList from '@/components/panels/Status/ExcludeObjectDialogList.vue'
import Panel from '@/components/ui/Panel.vue'
import { useBase } from '@/composables/useBase'

const props = defineProps<{
    showDialog: boolean
    excludeObjectDialogBool: boolean
    excludeObjectDialogName: string
}>()

const emit = defineEmits<{
    'update:showDialog': [value: boolean]
    'update:name': [name: string]
    'update:bool': [value: boolean]
}>()

const { t } = useI18n()
const { isMobile } = useBase()

const hoverName = ref('')

const showDialogPass = computed<boolean>({
    get: () => props.showDialog,
    set: (newVal) => emit('update:showDialog', newVal),
})

function hideDialog() {
    emit('update:showDialog', false)
}

function updateExcludeObjectDialogBool(newVal: boolean) {
    emit('update:bool', newVal)
}

function updateExcludeObjectDialogName(newVal: string) {
    emit('update:name', newVal)
}

function updateHoverObjectDialogName(newVal: string) {
    hoverName.value = newVal
}
</script>
