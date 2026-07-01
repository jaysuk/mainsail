<template>
    <v-dialog v-model="showDialog" :max-width="700" :max-height="500">
        <panel :title="t('Timelapse.RenderSettings')" :icon="mdiTextBoxSearchOutline" card-class="timelapse-rendersettings-dialog-panel" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="close">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text class="">
                <v-row>
                    <v-col class="col-4">
                        <v-select v-model="variable_fps" :label="t('Timelapse.Type')" :items="framerateTypeOptions" variant="outlined" density="compact" hide-details />
                    </v-col>
                    <v-col class="col-4">
                        <template v-if="variable_fps">
                            <v-text-field v-model="variable_fps_min" :label="t('Timelapse.MinFramerate')" type="number" variant="outlined" density="compact" hide-details hide-spin-buttons />
                            <v-text-field v-model="variable_fps_max" :label="t('Timelapse.MaxFramerate')" type="number" variant="outlined" density="compact" hide-details hide-spin-buttons class="mt-3" />
                            <v-text-field v-model="targetlength" :label="t('Timelapse.Targetlength')" type="number" variant="outlined" density="compact" hide-details hide-spin-buttons class="mt-3" />
                        </template>
                        <v-text-field v-else v-model="output_framerate" :label="t('Timelapse.Framerate')" type="number" variant="outlined" density="compact" hide-details hide-spin-buttons />
                        <v-text-field v-model="duplicatelastframe" :label="t('Timelapse.DuplicateLastframe')" type="number" variant="outlined" density="compact" hide-details hide-spin-buttons class="mt-3" />
                    </v-col>
                    <v-col class="col-4">
                        <v-text-field v-if="variable_fps" v-model="variableTargetFps" :label="t('Timelapse.TargetFps')" type="number" variant="outlined" density="compact" hide-details readonly class="mb-3" />
                        <v-text-field v-model="estimatedVideoLength" :label="t('Timelapse.EstimatedLength')" variant="outlined" density="compact" hide-details readonly />
                    </v-col>
                </v-row>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="close">{{ t('Buttons.Cancel') }}</v-btn>
                <v-btn variant="text" color="primary" @click="startRender">{{ t('Timelapse.StartRender') }}</v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick, mdiTextBoxSearchOutline } from '@mdi/js'
import { useTimelapse } from '@/composables/useTimelapse'
import { webSocketClient } from '@/plugins/webSocketClient'

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()
const { variable_fps, variable_fps_min, variable_fps_max, targetlength, output_framerate, duplicatelastframe, variableTargetFps, estimatedVideoLength } = useTimelapse()

const framerateTypeOptions = computed(() => [
    { value: false, title: t('Timelapse.Fixed') },
    { value: true, title: t('Timelapse.Variable') },
])

function startRender() {
    webSocketClient.emit('machine.timelapse.render', {})
    close()
}

function close() {
    showDialog.value = false
}
</script>
