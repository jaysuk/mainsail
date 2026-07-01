<template>
    <panel v-if="klipperReadyForGui" :icon="mdiGamepad" :title="t('Panels.ToolheadControlPanel.Headline')" :collapsible="true" card-class="toolhead-control-panel">
        <!-- PANEL-HEADER 3-DOT-MENU -->
        <template #buttons>
            <v-menu v-if="showButtons" location="bottom end" :close-on-content-click="false" class="pa-0">
                <template #activator="{ props: activatorProps }">
                    <v-btn icon="" variant="text" v-bind="activatorProps" :disabled="['printing'].includes(printer_state)">
                        <v-icon>{{ mdiDotsVertical }}</v-icon>
                    </v-btn>
                </template>
                <v-list density="compact">
                    <v-list-item v-if="controlStyle !== 'bars' && actionButton !== 'm84'">
                        <v-btn size="small" style="width: 100%" @click="doSend('M84')">
                            <v-icon start size="small">{{ mdiEngineOff }}</v-icon>
                            {{ t('Settings.ControlTab.MotorsOff', { isDefault: '' }) }}
                        </v-btn>
                    </v-list-item>
                    <v-list-item v-if="controlStyle !== 'bars' && existsZtilt && actionButton !== 'ztilt'">
                        <v-btn size="small" style="width: 100%" @click="doZtilt">Z-Tilt Adjust</v-btn>
                    </v-list-item>
                    <v-list-item v-if="controlStyle !== 'bars' && existsQGL && actionButton !== 'qgl'">
                        <v-btn size="small" style="width: 100%" @click="doQGL">Quad Gantry Level</v-btn>
                    </v-list-item>
                    <!-- SPECIAL BUTTONS ALWAYS INSIDE 3-DOT MENU -->
                    <v-list-item v-if="existsBedTilt">
                        <v-btn size="small" style="width: 100%" @click="doSend('BED_TILT_CALIBRATE')"> BED TILT CALIBRATE </v-btn>
                    </v-list-item>
                    <v-list-item v-if="existsBedScrews">
                        <v-btn size="small" style="width: 100%" @click="doSend('BED_SCREWS_ADJUST')">BED SCREWS ADJUST</v-btn>
                    </v-list-item>
                    <v-list-item v-if="existsDeltaCalibrate">
                        <v-btn size="small" style="width: 100%" @click="doSend('DELTA_CALIBRATE')">DELTA CALIBRATE</v-btn>
                    </v-list-item>
                    <v-list-item v-if="existsScrewsTilt">
                        <div class="d-flex align-center" style="width: 100%">
                            <v-btn size="small" style="border-top-right-radius: 0; border-bottom-right-radius: 0" @click="doSend('SCREWS_TILT_CALCULATE')"> SCREWS TILT CALCULATE </v-btn>
                            <v-menu location="bottom end" :close-on-content-click="false">
                                <template #activator="{ props: activatorProps }">
                                    <v-btn size="small" v-bind="activatorProps" class="px-0" style="min-width: 32px; border-top-left-radius: 0; border-bottom-left-radius: 0">
                                        <v-icon>{{ mdiMenuDown }}</v-icon>
                                    </v-btn>
                                </template>
                                <v-list density="compact">
                                    <v-list-item>
                                        <v-btn size="small" style="width: 100%" @click="doSend('SCREWS_TILT_CALCULATE DIRECTION=CW')">
                                            <v-icon start size="small" style="transform: scaleX(-1)">{{ mdiRestore }}</v-icon>
                                            <span>CW</span>
                                        </v-btn>
                                    </v-list-item>
                                    <v-list-item>
                                        <v-btn size="small" style="width: 100%" @click="doSend('SCREWS_TILT_CALCULATE DIRECTION=CCW')">
                                            <v-icon start size="small">{{ mdiRestore }}</v-icon>
                                            <span>CCW</span>
                                        </v-btn>
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                        </div>
                    </v-list-item>
                </v-list>
            </v-menu>
            <toolhead-panel-settings />
        </template>
        <!-- MOVE TO CONTROL -->
        <move-to-control />
        <!-- AXIS CONTROL -->
        <v-container v-if="axisControlVisible">
            <component :is="controlComponent" />
        </v-container>
        <!-- Z-OFFSET CONTROL -->
        <v-divider v-if="showZOffset" />
        <v-container v-if="showZOffset">
            <zoffset-control />
        </v-container>
        <!-- SPEED FACTOR -->
        <v-divider v-if="showSpeedFactor" />
        <v-container v-if="showSpeedFactor">
            <tool-slider :label="t('Panels.ToolheadControlPanel.SpeedFactor')" :icon="mdiSpeedometer" :target="speedFactor" :min="1" :max="200" :multi="100" :step="5" :dynamic-range="true" :has-input-field="true" command="M220" attribute-name="S" />
        </v-container>
    </panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BarsControl from '@/components/panels/ToolheadControls/BarsControl.vue'
import CircleControl from '@/components/panels/ToolheadControls/CircleControl.vue'
import CrossControl from '@/components/panels/ToolheadControls/CrossControl.vue'
import MoveToControl from '@/components/panels/ToolheadControls/MoveToControl.vue'
import Panel from '@/components/ui/Panel.vue'
import ToolSlider from '@/components/inputs/ToolSlider.vue'
import ToolheadPanelSettings from '@/components/panels/ToolheadControls/ToolheadPanelSettings.vue'
import ZoffsetControl from '@/components/panels/ToolheadControls/ZoffsetControl.vue'
import { mdiDotsVertical, mdiEngineOff, mdiGamepad, mdiSpeedometer, mdiMenuDown, mdiRestore } from '@mdi/js'
import { useBase } from '@/composables/useBase'
import { useControl } from '@/composables/useControl'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { klipperReadyForGui, printer_state } = useBase()
const { actionButton, existsZtilt, existsQGL, existsBedTilt, existsBedScrews, existsDeltaCalibrate, existsScrewsTilt, doSend, doZtilt, doQGL } = useControl()
const printerStore = usePrinterStore()
const guiStore = useGuiStore()

const controlStyle = computed<string>(() => guiStore.control.style ?? 'bars')

const controlComponent = computed(() => {
    switch (controlStyle.value) {
        case 'circle':
            return CircleControl
        case 'cross':
            return CrossControl
        default:
            return BarsControl
    }
})

const speedFactor = computed<number>(() => printerStore.gcode_move?.speed_factor ?? 1)

const isPrinting = computed(() => ['printing'].includes(printer_state.value))

const axisControlVisible = computed(() => {
    if (!showControl.value) return false

    return !(isPrinting.value && (guiStore.control.hideDuringPrint ?? false))
})

const showButtons = computed(() => {
    if (controlStyle.value !== 'bars' && (existsZtilt.value || existsQGL.value)) return true

    return existsBedScrews.value || existsBedTilt.value || existsDeltaCalibrate.value || existsScrewsTilt.value
})

const showControl = computed<boolean>(() => guiStore.view.toolhead.showControl ?? true)

const showZOffset = computed<boolean>(() => guiStore.view.toolhead.showZOffset ?? true)

const showSpeedFactor = computed<boolean>(() => guiStore.view.toolhead.showSpeedFactor ?? true)
</script>
