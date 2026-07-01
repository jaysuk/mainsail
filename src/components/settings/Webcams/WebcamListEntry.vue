<template>
    <div>
        <v-divider v-if="boolBorderTop" class="my-2" />
        <settings-row :title="webcam.name" :icon="icon" :sub-title="subtitle">
            <template v-if="webcam.source === 'database'">
                <v-btn class="minwidth-0 px-2" size="small" variant="outlined" :color="webcam.enabled ? '' : 'secondary'" @click="toogleStatus">
                    <v-icon size="small">{{ mdiLightbulbOutline }}</v-icon>
                </v-btn>
                <v-btn class="ml-3" size="small" variant="outlined" @click="edit">
                    <v-icon size="small" start>{{ mdiPencil }}</v-icon>
                    {{ t('Settings.Edit') }}
                </v-btn>
                <v-btn size="small" variant="outlined" class="ml-3 minwidth-0 px-2" color="error" @click="deleteWebcam">
                    <v-icon size="small">{{ mdiDelete }}</v-icon>
                </v-btn>
            </template>
        </settings-row>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { mdiDelete, mdiPencil, mdiLightbulbOutline } from '@mdi/js'
import { useWebcam } from '@/composables/useWebcam'
import { useGuiWebcamsStore } from '@/store/gui/webcams'

const props = withDefaults(
    defineProps<{
        webcam: GuiWebcamStateWebcam
        boolBorderTop?: boolean
    }>(),
    { boolBorderTop: false }
)

const emit = defineEmits<{
    'edit-webcam': [webcam: GuiWebcamStateWebcam]
}>()

const { t } = useI18n()
const { convertWebcamIcon } = useWebcam()
const guiWebcamsStore = useGuiWebcamsStore()

const icon = computed(() => convertWebcamIcon(props.webcam.icon))

const subtitle = computed(() => {
    if (props.webcam.service === 'mjpegstreamer-adaptive') return `URL: ${props.webcam.snapshot_url}`

    return `URL: ${props.webcam.stream_url}`
})

function toogleStatus() {
    const webcam = { ...props.webcam }
    webcam.enabled = !webcam.enabled
    guiWebcamsStore.update({ webcam, oldWebcamName: webcam.name })
}

function edit() {
    emit('edit-webcam', props.webcam)
}

function deleteWebcam() {
    guiWebcamsStore.delete(props.webcam.name)
}
</script>
