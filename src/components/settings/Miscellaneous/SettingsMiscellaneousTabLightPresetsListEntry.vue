<template>
    <settings-row :title="preset.name" :sub-title="subTitle" :dynamic-slot-width="true">
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
import { mdiDelete, mdiPencil } from '@mdi/js'
import { usePrinterStore } from '@/store/printer'
import { useGuiMiscellaneousStore } from '@/store/gui/miscellaneous'
import type { GuiMiscellaneousStateEntryPreset } from '@/store/gui/miscellaneous/types'

const props = defineProps<{
    type: string
    name: string
    preset: GuiMiscellaneousStateEntryPreset
}>()

const emit = defineEmits<{
    'edit-preset': [presetId: string]
}>()

const { t } = useI18n()
const printerStore = usePrinterStore()
const guiMiscellaneousStore = useGuiMiscellaneousStore()

const settings = computed(() => {
    if (!props.type || !props.name) return null

    const key = `${props.type.toLowerCase()} ${props.name.toLowerCase()}`
    return printerStore.configfile?.settings?.[key] ?? {}
})

const colorOrder = computed(() => {
    if (props.type?.toLowerCase() === 'led') {
        let colorOrder = ''
        if (settings.value && 'red_pin' in settings.value) colorOrder += 'R'
        if (settings.value && 'green_pin' in settings.value) colorOrder += 'G'
        if (settings.value && 'blue_pin' in settings.value) colorOrder += 'B'
        if (settings.value && 'white_pin' in settings.value) colorOrder += 'W'

        return colorOrder
    }

    if (Array.isArray(settings.value?.color_order)) {
        return settings.value.color_order[0] ?? ''
    }

    return settings.value?.color_order ?? ''
})

const subTitle = computed(() => {
    const output: string[] = []

    if (colorOrder.value.includes('R')) output.push(`R: ${props.preset.red}`)
    if (colorOrder.value.includes('G')) output.push(`G: ${props.preset.green}`)
    if (colorOrder.value.includes('B')) output.push(`B: ${props.preset.blue}`)
    if (colorOrder.value.includes('W')) output.push(`W: ${props.preset.white}`)

    return output.join(', ')
})

function editPreset() {
    emit('edit-preset', props.preset.id ?? '')
}

function deletePreset() {
    guiMiscellaneousStore.deletePreset({
        type: props.type,
        name: props.name,
        presetId: props.preset.id ?? '',
    })
}
</script>
