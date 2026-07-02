<template>
    <div>
        <v-card flat>
            <v-card-text>
                <settings-row :title="t('Settings.EditorTab.UseEscToClose')" :sub-title="t('Settings.EditorTab.UseEscToCloseDescription')" :dynamic-slot-width="true">
                    <v-switch v-model="escToClose" hide-details class="mt-0" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.EditorTab.ConfirmUnsavedChanges')" :sub-title="t('Settings.EditorTab.ConfirmUnsavedChangesDescription')" :dynamic-slot-width="true">
                    <v-switch v-model="confirmUnsavedChanges" hide-details class="mt-0" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.EditorTab.KlipperDocsTooltips')" :sub-title="t('Settings.EditorTab.KlipperDocsTooltipsDescription')" :dynamic-slot-width="true">
                    <v-switch v-model="klipperDocsTooltips" hide-details class="mt-0" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.EditorTab.TabSize')" :sub-title="t('Settings.EditorTab.TabSizeDescription')" :dynamic-slot-width="true">
                    <v-select v-model="tabSize" :items="tabSizes" hide-details variant="outlined" density="compact" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.EditorTab.KlipperRestartMethod')" :sub-title="t('Settings.EditorTab.KlipperRestartMethodDescription')">
                    <v-select v-model="klipperRestartMethod" :items="klipperRestartMethods" hide-details variant="outlined" density="compact" />
                </settings-row>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const guiStore = useGuiStore()

const klipperRestartMethods = [
    { title: 'FIRMWARE_RESTART', value: 'FIRMWARE_RESTART' },
    { title: 'RESTART', value: 'RESTART' },
]

const tabSizes = computed(() => {
    const spaces = [2, 4, 6, 8]
    return spaces.map((space) => ({
        title: t('Settings.EditorTab.Spaces', { count: space }),
        value: space,
    }))
})

const escToClose = computed({
    get: () => guiStore.editor.escToClose,
    set: (newVal) => guiStore.saveSetting({ name: 'editor.escToClose', value: newVal }),
})

const klipperDocsTooltips = computed({
    get: () => guiStore.editor.klipperDocsTooltips,
    set: (newVal) => guiStore.saveSetting({ name: 'editor.klipperDocsTooltips', value: newVal }),
})

const confirmUnsavedChanges = computed({
    get: () => guiStore.editor.confirmUnsavedChanges,
    set: (newVal) => guiStore.saveSetting({ name: 'editor.confirmUnsavedChanges', value: newVal }),
})

const tabSize = computed({
    get: () => guiStore.editor.tabSize || 2,
    set: (newVal) => guiStore.saveSetting({ name: 'editor.tabSize', value: newVal }),
})

const klipperRestartMethod = computed({
    get: () => guiStore.editor.klipperRestartMethod,
    set: (newVal) => guiStore.saveSetting({ name: 'editor.klipperRestartMethod', value: newVal }),
})
</script>
