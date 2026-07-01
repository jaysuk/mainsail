<template>
    <v-dialog v-model="showDialog" width="400">
        <panel :title="t('Files.RenameFile')" card-class="gcodefiles-rename-file-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="showDialog = false">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>
                <v-text-field ref="inputFieldRenameFile" v-model="name" :label="t('Files.Name')" required :rules="nameInputRules" @update:error="updateIsInvalidName" @keydown.enter="renameFileAction" />
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="showDialog = false">{{ t('Buttons.Cancel') }}</v-btn>
                <v-btn :disabled="isInvalidName || name.length === 0" color="primary" variant="text" @click="renameFileAction">
                    {{ t('Files.Rename') }}
                </v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FocusableRef } from '@/types/vuetify'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick } from '@mdi/js'
import type { FileStateGcodefile } from '@/store/files/types'
import { useGcodefiles } from '@/composables/useGcodefiles'
import { webSocketClient } from '@/plugins/webSocketClient'

const props = defineProps<{
    item: FileStateGcodefile
}>()

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()
const { currentPath, existsFilename } = useGcodefiles()

const name = ref('')
const isInvalidName = ref(true)
const inputFieldRenameFile = ref<FocusableRef | null>(null)

const nameInputRules = [(value: string) => !!value || t('Files.InvalidNameEmpty'), (value: string) => !existsFilename(value) || t('Files.InvalidNameAlreadyExists')]

function updateIsInvalidName(value: boolean) {
    isInvalidName.value = value
}

function renameFileAction() {
    webSocketClient.emit(
        'server.files.move',
        {
            source: 'gcodes' + currentPath.value + '/' + props.item.filename,
            dest: 'gcodes' + currentPath.value + '/' + name.value,
        },
        { action: 'files/getMove' }
    )

    showDialog.value = false
}

watch(showDialog, (newVal) => {
    if (!newVal) return

    name.value = props.item.filename
    isInvalidName.value = true

    setTimeout(() => {
        inputFieldRenameFile.value?.focus()
    }, 200)
})
</script>
