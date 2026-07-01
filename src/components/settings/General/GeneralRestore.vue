<template>
    <div>
        <input ref="uploadBackupFile" type="file" accept=".json" class="d-none" @change="uploadRestore" />
        <v-btn size="small" :loading="loadings.includes('restoreUploadButton')" class="ml-3" @click="restoreDb">
            {{ t('Settings.GeneralTab.Restore') }}
        </v-btn>
        <v-dialog :model-value="showDialog" persistent :width="360">
            <panel :title="t('Settings.GeneralTab.Restore')" card-class="mainsail-restore-dialog" :margin-bottom="false" :icon="mdiHelpCircle">
                <template #buttons>
                    <v-btn icon="" variant="text" @click="closeDialog">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-row>
                        <v-col>
                            <p class="mb-0">{{ t('Settings.GeneralTab.RestoreDialog') }}</p>
                        </v-col>
                    </v-row>
                    <v-row>
                        <checkbox-list :options="restoreableNamespaces" select-all @update:selectedCheckboxes="onSelectRestoreCheckboxes" />
                    </v-row>
                    <v-row>
                        <v-col class="text-center">
                            <v-btn color="red" :loading="loadings.includes('restoreMainsail')" @click="restoreDbAction">
                                {{ t('Settings.GeneralTab.Restore') }}
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-card-text>
            </panel>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toast-notification'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick, mdiHelpCircle } from '@mdi/js'
import CheckboxList from '@/components/inputs/CheckboxList.vue'
import { useBase } from '@/composables/useBase'
import { useSettingsGeneralDatabase } from '@/composables/useSettingsGeneralDatabase'
import { useSocketStore } from '@/store/socket'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { loadings } = useBase()
const { availableKeys, sortNamespaces } = useSettingsGeneralDatabase()
const guiStore = useGuiStore()

const uploadBackupFile = ref<HTMLInputElement | null>(null)

const showDialog = ref(false)
const restoreableNamespaces = ref<{ value: string; label: string }[]>([])
const restoreCheckboxes = ref<string[]>([])
const restoreObjects = ref<Record<string, unknown>>({})

function onSelectRestoreCheckboxes(checkboxes: string[]) {
    restoreCheckboxes.value = checkboxes
}

function openDialog() {
    showDialog.value = true
}

function closeDialog() {
    showDialog.value = false
}

async function restoreDb() {
    uploadBackupFile.value?.click()
}

function uploadRestore() {
    const backup = uploadBackupFile.value?.files?.[0]
    if (!backup) {
        window.console.error('No json uploaded')
        return
    }

    const reader = new FileReader()
    reader.readAsText(backup, 'UTF-8')
    reader.onload = (evt) => {
        restoreableNamespaces.value = []
        try {
            restoreObjects.value = JSON.parse(evt?.target?.result + '')

            const keys = Object.keys(restoreObjects.value)
            restoreableNamespaces.value = keys.map((key) => {
                const namespace = availableKeys.value.find((namespace) => namespace.value === key)
                if (namespace) return namespace

                return { value: key, label: key }
            })

            // sort restoreableNamespaces
            restoreableNamespaces.value = restoreableNamespaces.value.sort(sortNamespaces)

            openDialog()
        } catch {
            useToast().error(t('Settings.GeneralTab.CannotReadJson'))
        }
    }
    reader.onerror = (evt) => {
        window.console.error(evt)
    }

    // empty input file field
    if (uploadBackupFile.value) uploadBackupFile.value.value = ''
}

function restoreDbAction() {
    useSocketStore().addLoading('restoreDbAction')

    guiStore.restoreMoonrakerDB({
        dbCheckboxes: restoreCheckboxes.value,
        restoreObjects: restoreObjects.value as Record<string, Record<string, unknown>>,
    })
}
</script>
