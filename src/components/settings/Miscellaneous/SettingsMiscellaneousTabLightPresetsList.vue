<template>
    <div>
        <v-card-text>
            <h3 class="text-h5 mb-3">{{ t('Settings.MiscellaneousTab.LightPresets', { name }) }}</h3>
            <template v-if="presets.length">
                <div v-for="(preset, index) in presets" :key="preset.id">
                    <v-divider v-if="index" class="my-2" />
                    <settings-miscellaneous-tab-light-presets-list-entry :type="type" :name="name" :preset="preset" @edit-preset="editPreset" />
                </div>
            </template>
            <p v-else class="mb-0 text-center font-italic">{{ t('Settings.MiscellaneousTab.NoPresetFound') }}</p>
        </v-card-text>
        <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="close">{{ t('Buttons.Close') }}</v-btn>
            <v-btn variant="text" color="primary" @click="createPreset">{{ t('Settings.MiscellaneousTab.AddPreset') }}</v-btn>
        </v-card-actions>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsMiscellaneousTabLightPresetsListEntry from '@/components/settings/Miscellaneous/SettingsMiscellaneousTabLightPresetsListEntry.vue'
import { caseInsensitiveSort } from '@/plugins/helpers'
import { useGuiMiscellaneousStore } from '@/store/gui/miscellaneous'
import type { GuiMiscellaneousStateEntryPreset } from '@/store/gui/miscellaneous/types'

const props = defineProps<{
    type: string
    name: string
}>()

const emit = defineEmits<{
    'edit-preset': [presetId: string]
    close: []
    'create-preset': []
}>()

const { t } = useI18n()
const guiMiscellaneousStore = useGuiMiscellaneousStore()

const entry = computed(() => guiMiscellaneousStore.getEntry({ type: props.type, name: props.name }))

const presets = computed(() => {
    const presets = entry.value?.presets ?? {}

    const output: GuiMiscellaneousStateEntryPreset[] = Object.keys(presets).map((key) => ({
        ...presets[key],
        id: key,
    }))

    return caseInsensitiveSort(output, 'name')
})

function editPreset(presetId: string) {
    emit('edit-preset', presetId)
}

function close() {
    emit('close')
}

function createPreset() {
    emit('create-preset')
}
</script>
