<template>
    <settings-row :title="preset.name" :sub-title="subTitle">
        <v-btn size="small" variant="outlined" class="ml-3" @click="editPreset">
            <v-icon start size="small">{{ mdiPencil }}</v-icon>
            {{ t('Settings.Edit') }}
        </v-btn>
        <v-btn size="small" variant="outlined" class="ml-3 minwidth-0 px-2" color="error" @click="deletePreset">
            <v-icon size="small">{{ mdiDelete }}</v-icon>
        </v-btn>
    </settings-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import type { GuiPresetsStatePreset } from '@/store/gui/presets/types'
import { convertName } from '@/plugins/helpers'
import { mdiDelete, mdiPencil } from '@mdi/js'
import { useGuiPresetsStore } from '@/store/gui/presets'

const props = defineProps<{
    preset: GuiPresetsStatePreset
}>()

const emit = defineEmits<{
    edit: [preset: GuiPresetsStatePreset]
}>()

const { t } = useI18n()
const guiPresetsStore = useGuiPresetsStore()

const subTitle = computed(() => {
    const output: string[] = []

    Object.keys(props.preset.values).forEach((key: string) => {
        const values = props.preset.values[key]

        if (values.bool) {
            const name = key.indexOf(' ') ? key.slice(key.indexOf(' ') + 1) : key

            output.push(convertName(name) + ': ' + values.value + '°C')
        }
    })

    if (props.preset.gcode) output.push(t('Settings.PresetsTab.CustomGCode'))

    return output.join(', ')
})

function editPreset() {
    emit('edit', props.preset)
}

function deletePreset() {
    guiPresetsStore.delete(props.preset.id ?? '')
}
</script>
