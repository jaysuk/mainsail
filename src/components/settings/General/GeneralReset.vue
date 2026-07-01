<template>
    <div>
        <v-btn color="error" size="small" @click="openDialog">
            {{ t('Settings.GeneralTab.FactoryReset') }}
        </v-btn>
        <v-dialog v-model="showDialog" persistent :width="360">
            <panel :title="t('Settings.GeneralTab.FactoryReset')" card-class="mainsail-reset-dialog" :margin-bottom="false" :icon="mdiHelpCircle">
                <template #buttons>
                    <v-btn icon="" variant="text" @click="closeDialog">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-row>
                        <v-col>
                            <p class="mb-0">{{ t('Settings.GeneralTab.FactoryDialog') }}</p>
                        </v-col>
                    </v-row>
                    <v-row>
                        <checkbox-list :options="resetableNamespaces" select-all @update:selectedCheckboxes="onSelectResetCheckboxes" />
                    </v-row>
                    <v-row>
                        <v-col class="text-center">
                            <v-btn color="red" :loading="loadings.includes('resetMainsail')" @click="resetMainsailAction">
                                {{ t('Settings.GeneralTab.Reset') }}
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
const { loadings, moonrakerComponents } = useBase()
const { loadBackupableNamespaces } = useSettingsGeneralDatabase()
const guiStore = useGuiStore()

const showDialog = ref(false)
const resetableNamespaces = ref<{ value: string; label: string }[]>([])
const resetCheckboxes = ref<string[]>([])

function onSelectResetCheckboxes(checkboxes: string[]) {
    resetCheckboxes.value = checkboxes
}

function resetMainsailAction() {
    useSocketStore().addLoading('resetMainsail')
    guiStore.resetMoonrakerDB(resetCheckboxes.value)
}

async function loadResetableNamespaces() {
    resetableNamespaces.value = await loadBackupableNamespaces()

    // stop if history is not enabled
    if (!moonrakerComponents.value.includes('history')) return

    resetableNamespaces.value.push({
        value: 'history_jobs',
        label: t('Settings.GeneralTab.DbHistoryJobs'),
    })

    resetableNamespaces.value.push({
        value: 'history_totals',
        label: t('Settings.GeneralTab.DbHistoryTotals'),
    })
}

async function openDialog() {
    await loadResetableNamespaces()
    showDialog.value = true
}

function closeDialog() {
    showDialog.value = false
}

onMounted(async () => {
    await loadResetableNamespaces()
})
</script>
