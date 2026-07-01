<template>
    <panel :title="t('Timelapse.Status')" :icon="mdiInformation" card-class="timelapse-status-panel">
        <v-card-text v-if="framesCount">
            <v-row v-if="frameUrl">
                <v-col class="pb-0">
                    <load-image :src="frameUrl" class="d-flex align-center justify-center">
                        <template #image>
                            <img ref="timelapsePreview" :src="frameUrl" :alt="t('Timelapse.Preview')" class="w-100" :style="webcamStyle" @load="calcRatio" />
                        </template>
                        <template #preloader>
                            <v-progress-circular indeterminate color="primary" />
                        </template>
                        <template #error>
                            <v-icon>{{ mdiFile }}</v-icon>
                        </template>
                    </load-image>
                </v-col>
            </v-row>
            <v-row>
                <v-col class="text-medium-emphasis">
                    <settings-row :title="t('Timelapse.Frames')" :dynamic-slot-width="true">
                        {{ framesCount }}
                    </settings-row>
                    <v-divider class="my-2" />
                    <settings-row :title="t('Timelapse.EstimatedLength')" :dynamic-slot-width="true">
                        {{ estimatedVideoLength }}
                    </settings-row>
                    <template v-if="!['printing', 'paused'].includes(printer_state)">
                        <v-divider class="mt-2 mb-4" />
                        <v-row>
                            <v-col class="text-center py-1">
                                <v-btn variant="text" color="primary" :disabled="disableRenderButton" @click="boolDialogRendersettings = true">
                                    {{ t('Timelapse.Render') }}
                                </v-btn>
                                <v-btn variant="text" color="primary" :loading="loadings.includes('timelapse_saveframes')" @click="saveFrames">
                                    {{ t('Timelapse.SaveFrames') }}
                                </v-btn>
                            </v-col>
                        </v-row>
                    </template>
                </v-col>
            </v-row>
        </v-card-text>
        <v-card-text v-else class="">
            <p class="text-center my-0 font-italic">{{ t('Timelapse.NoActiveTimelapse') }}</p>
        </v-card-text>
        <v-card-text v-if="['printing', 'paused'].includes(printer_state)" class="pt-0">
            <v-divider class="mt-0 mb-2" />
            <settings-row :title="t('Timelapse.Enabled')" :dynamic-slot-width="true">
                <v-switch v-model="enabled" hide-details class="mt-0" />
            </settings-row>
            <template v-if="enabled">
                <v-divider class="my-2" />
                <settings-row :title="t('Timelapse.Autorender')" :dynamic-slot-width="true">
                    <v-switch v-model="autorender" hide-details class="mt-0" />
                </settings-row>
            </template>
        </v-card-text>
        <timelapse-renderingsettings-dialog v-model="boolDialogRendersettings" />
    </panel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import Panel from '@/components/ui/Panel.vue'
import LoadImage from '@/components/ui/LoadImage.vue'
import { mdiFile, mdiInformation } from '@mdi/js'
import TimelapseRenderingsettingsDialog from '@/components/dialogs/TimelapseRenderingsettingsDialog.vue'
import { useBase } from '@/composables/useBase'
import { useTimelapse } from '@/composables/useTimelapse'
import { useWebcam } from '@/composables/useWebcam'
import { useServerStore } from '@/store/server'
import { useGuiWebcamsStore } from '@/store/gui/webcams'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { apiUrl, printer_state, loadings } = useBase()
const { framesCount, estimatedVideoLength, enabled, autorender } = useTimelapse()
const { generateTransform } = useWebcam()
const serverStore = useServerStore()
const guiWebcamsStore = useGuiWebcamsStore()

const boolDialogRendersettings = ref(false)
const scale = ref(1)
const timelapsePreview = ref<HTMLImageElement | null>(null)

const frameUrl = computed(() => {
    const frame = serverStore.timelapse?.lastFrame?.file ?? null

    if (frame) {
        return apiUrl.value + '/server/files/timelapse_frames/' + frame
    }

    return null
})

const disableRenderButton = computed(() => (serverStore.timelapse?.rendering.status ?? '') === 'running')

const existsSnapshoturlInMoonrakerConfig = computed(() => 'snapshoturl' in serverStore.config.orig.timelapse)

const moonrakerTimelapseConfig = computed(() => serverStore.config.config.timelapse ?? {})

const camId = computed(() => serverStore.timelapse?.settings.camera ?? '')

const camSettings = computed(() => guiWebcamsStore.getWebcam(camId.value))

const webcamStyle = computed(() => {
    // if the snapshoturl is set in moonraker config,
    // we also use the flip_x and flip_y values from the moonraker config
    if (existsSnapshoturlInMoonrakerConfig.value) {
        return {
            transform: generateTransform((moonrakerTimelapseConfig.value.flip_x as boolean | undefined) ?? false, (moonrakerTimelapseConfig.value.flip_y as boolean | undefined) ?? false, 0),
        }
    }

    if (!camSettings.value) return {}

    return {
        transform: generateTransform(camSettings.value.flip_horizontal ?? false, camSettings.value.flip_vertical ?? false, camSettings.value.rotation ?? 0),
    }
})

function saveFrames() {
    webSocketClient.emit('machine.timelapse.saveframes', {}, { loading: 'timelapse_saveframes' })
}

function calcRatio() {
    if (!timelapsePreview.value) return

    scale.value = timelapsePreview.value.naturalHeight / timelapsePreview.value.naturalWidth

    if (scale.value > 1) {
        scale.value = timelapsePreview.value.naturalWidth / timelapsePreview.value.naturalHeight
    }
}
</script>
