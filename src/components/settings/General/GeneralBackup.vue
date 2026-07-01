<template>
    <div>
        <v-btn :loading="loadings.includes('backupDbButton')" size="small" @click="openDialog">
            {{ t('Settings.GeneralTab.Backup') }}
        </v-btn>
        <v-dialog v-model="showDialog" persistent :width="360">
            <panel :title="t('Settings.GeneralTab.Backup')" card-class="mainsail-backup-dialog" :margin-bottom="false" :icon="mdiHelpCircle">
                <template #buttons>
                    <v-btn icon="" variant="text" @click="closeDialog">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-row>
                        <v-col>
                            <p class="mb-0">{{ t('Settings.GeneralTab.BackupDialog') }}</p>
                        </v-col>
                    </v-row>
                    <v-row>
                        <checkbox-list :options="backupableNamespaces" select-all @update:selectedCheckboxes="onSelectBackupCheckboxes" />
                    </v-row>
                    <v-row>
                        <v-col class="text-center">
                            <v-btn color="red" :loading="loadings.includes('backupMainsail')" @click="backupMainsail">
                                {{ t('Settings.GeneralTab.Backup') }}
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-card-text>
            </panel>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick, mdiHelpCircle } from '@mdi/js'
import CheckboxList from '@/components/inputs/CheckboxList.vue'
import { useBase } from '@/composables/useBase'
import { useSettingsGeneralDatabase } from '@/composables/useSettingsGeneralDatabase'
import { useSocketStore } from '@/store/socket'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { loadings } = useBase()
const { loadBackupableNamespaces } = useSettingsGeneralDatabase()
const guiStore = useGuiStore()

const showDialog = ref(false)
const backupableNamespaces = ref<{ value: string; label: string }[]>([])
const backupCheckboxes = ref<string[]>([])

function onSelectBackupCheckboxes(checkboxes: string[]) {
    backupCheckboxes.value = checkboxes
}

async function backupMainsail() {
    const socketStore = useSocketStore()
    socketStore.addLoading('backupMainsail')
    await guiStore.backupMoonrakerDB(backupCheckboxes.value)
    socketStore.removeLoading('backupMainsail')
    closeDialog()
}

async function openDialog() {
    backupableNamespaces.value = await loadBackupableNamespaces()
    showDialog.value = true
}

function closeDialog() {
    showDialog.value = false
}

onMounted(async () => {
    backupableNamespaces.value = await loadBackupableNamespaces()
})
</script>
