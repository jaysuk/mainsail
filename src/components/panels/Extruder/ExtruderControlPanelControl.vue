<template>
    <responsive :breakpoints="{ large: (el) => el.width >= 640 }">
        <template #default="{ el }">
            <v-container>
                <v-row>
                    <v-col>
                        <number-input
                            :label="t('Panels.ExtruderControlPanel.FilamentLength')"
                            param="feedamount"
                            :target="feedamount"
                            :disabled="printerIsPrintingOnly"
                            :output-error-msg="true"
                            :has-spinner="true"
                            :spinner-factor="100"
                            :step="0.01"
                            :min="0.01"
                            :max="maxExtrudeOnlyDistance"
                            :dec="2"
                            unit="mm"
                            @submit="setFeedamount" />
                        <v-item-group class="_btn-group pt-3">
                            <v-btn v-for="value in feedamountsSorted" :key="value" :disabled="printerIsPrintingOnly" density="compact" class="_btn-qs flex-grow-1 px-0" @click="setFeedamount({ value })">
                                {{ value }}
                            </v-btn>
                        </v-item-group>
                    </v-col>
                    <v-col>
                        <number-input
                            :label="t('Panels.ExtruderControlPanel.ExtrusionFeedrate')"
                            param="feedrate"
                            :target="feedrate"
                            :disabled="printerIsPrintingOnly"
                            :has-spinner="true"
                            :output-error-msg="true"
                            :spinner-factor="100"
                            :step="0.01"
                            :min="0.01"
                            :max="null"
                            :dec="2"
                            unit="mm/s"
                            @submit="setFeedrate" />
                        <v-item-group class="_btn-group pt-3">
                            <v-btn v-for="value in feedratesSorted" :key="value" :disabled="printerIsPrintingOnly" density="compact" class="_btn-qs flex-grow-1 px-0" @click="setFeedrate({ value })">
                                {{ value }}
                            </v-btn>
                        </v-item-group>
                    </v-col>
                    <!-- EXTRUDE AND RETRACT BUTTON LARGE SIZED PANEL -->
                    <v-col v-if="el.is.large" class="col-3 d-flex align-center flex-column justify-center">
                        <!-- RETRACT -->
                        <v-tooltip location="left" :disabled="extrudePossible && !tooLargeExtrusion" color="secondary">
                            <template #activator="{ props: activatorProps }">
                                <div class="mb-4" v-bind="activatorProps">
                                    <v-btn :loading="loadings.includes('btnRetract')" :disabled="!extrudePossible || tooLargeExtrusion || printerIsPrintingOnly" size="small" class="_btn-extruder-cmd" @click="sendRetract()">
                                        <v-icon size="small" class="mr-1">{{ mdiArrowUpBold }}</v-icon>
                                        {{ t('Panels.ExtruderControlPanel.Retract') }}
                                    </v-btn>
                                </div>
                            </template>
                            <span v-show="!extrudePossible"> {{ t('Panels.ExtruderControlPanel.ExtruderTempTooLow') }} {{ minExtrudeTemp }} °C </span>
                            <span v-show="tooLargeExtrusion">
                                {{ t('Panels.ExtruderControlPanel.TooLargeExtrusion') }}
                                <br />
                                {{ t('Panels.ExtruderControlPanel.Requested') }}: {{ feedamount * extrudeFactor }} mm
                                <br />
                                {{ t('Panels.ExtruderControlPanel.Allowed') }}: {{ maxExtrudeOnlyDistance }} mm
                            </span>
                        </v-tooltip>
                        <!-- EXTRUDE  -->
                        <v-tooltip location="left" :disabled="extrudePossible && !tooLargeExtrusion" color="secondary">
                            <template #activator="{ props: activatorProps }">
                                <div v-bind="activatorProps">
                                    <v-btn :loading="loadings.includes('btnExtrude')" :disabled="!extrudePossible || tooLargeExtrusion || printerIsPrintingOnly" size="small" class="_btn-extruder-cmd" @click="sendExtrude()">
                                        <v-icon size="small" class="mr-1">{{ mdiArrowDownBold }}</v-icon>
                                        {{ t('Panels.ExtruderControlPanel.Extrude') }}
                                    </v-btn>
                                </div>
                            </template>
                            <span v-show="!extrudePossible"> {{ t('Panels.ExtruderControlPanel.ExtruderTempTooLow') }} {{ minExtrudeTemp }} °C </span>
                            <span v-show="tooLargeExtrusion">
                                {{ t('Panels.ExtruderControlPanel.TooLargeExtrusion') }}
                                <br />
                                {{ t('Panels.ExtruderControlPanel.Requested') }}: {{ feedamount * extrudeFactor }} mm
                                <br />
                                {{ t('Panels.ExtruderControlPanel.Allowed') }}: {{ maxExtrudeOnlyDistance }} mm
                            </span>
                        </v-tooltip>
                    </v-col>
                </v-row>
                <!-- EXTRUDE AND RETRACT BUTTON SMALL AND MEDIUM SIZED PANEL -->
                <v-row v-if="!el.is.large">
                    <v-col class="pa-0">
                        <div class="d-flex justify-space-around">
                            <div class="d-flex align-center">
                                <!-- RETRACT -->
                                <v-tooltip location="top" :disabled="extrudePossible && !tooLargeExtrusion" color="secondary">
                                    <template #activator="{ props: activatorProps }">
                                        <div class="pt-1 pb-2 px-3" v-bind="activatorProps">
                                            <v-btn :loading="loadings.includes('btnRetract')" :disabled="!extrudePossible || tooLargeExtrusion || printerIsPrintingOnly" size="small" class="_btn-extruder-cmd" @click="sendRetract()">
                                                <v-icon size="small" class="mr-1">{{ mdiArrowUpBold }}</v-icon>
                                                {{ t('Panels.ExtruderControlPanel.Retract') }}
                                            </v-btn>
                                        </div>
                                    </template>
                                    <span v-show="!extrudePossible"> {{ t('Panels.ExtruderControlPanel.ExtruderTempTooLow') }} {{ minExtrudeTemp }} °C </span>
                                    <span v-show="tooLargeExtrusion">
                                        {{ t('Panels.ExtruderControlPanel.TooLargeExtrusion') }}
                                        <br />
                                        {{ t('Panels.ExtruderControlPanel.Requested') }}: {{ feedamount * extrudeFactor }} mm
                                        <br />
                                        {{ t('Panels.ExtruderControlPanel.Allowed') }}: {{ maxExtrudeOnlyDistance }} mm
                                    </span>
                                </v-tooltip>
                                <!-- EXTRUDE  -->
                                <v-tooltip location="top" :disabled="extrudePossible && !tooLargeExtrusion" color="secondary">
                                    <template #activator="{ props: activatorProps }">
                                        <div class="pt-1 pb-2 px-3" v-bind="activatorProps">
                                            <v-btn :loading="loadings.includes('btnExtrude')" :disabled="!extrudePossible || tooLargeExtrusion || printerIsPrintingOnly" size="small" class="_btn-extruder-cmd" @click="sendExtrude()">
                                                <v-icon size="small" class="mr-1">{{ mdiArrowDownBold }}</v-icon>
                                                {{ t('Panels.ExtruderControlPanel.Extrude') }}
                                            </v-btn>
                                        </div>
                                    </template>
                                    <span v-show="!extrudePossible"> {{ t('Panels.ExtruderControlPanel.ExtruderTempTooLow') }} {{ minExtrudeTemp }} °C </span>
                                    <span v-show="tooLargeExtrusion">
                                        {{ t('Panels.ExtruderControlPanel.TooLargeExtrusion') }}
                                        <br />
                                        {{ t('Panels.ExtruderControlPanel.Requested') }}: {{ feedamount * extrudeFactor }} mm
                                        <br />
                                        {{ t('Panels.ExtruderControlPanel.Allowed') }}: {{ maxExtrudeOnlyDistance }} mm
                                    </span>
                                </v-tooltip>
                            </div>
                        </div>
                    </v-col>
                </v-row>
            </v-container>
            <!-- EXTRUSION ESTIMATION NOTE -->
            <estimated-extrusion-output />
        </template>
    </responsive>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiArrowDownBold, mdiArrowUpBold } from '@mdi/js'
import NumberInput from '@/components/inputs/NumberInput.vue'
import Responsive from '@/components/ui/Responsive.vue'
import EstimatedExtrusionOutput from '@/components/panels/Extruder/EstimatedExtrusionOutput.vue'
import { parseNumber } from '@/plugins/helpers'
import { useBase } from '@/composables/useBase'
import { useExtruder } from '@/composables/useExtruder'
import { useGuiStore } from '@/store/gui'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { printerIsPrintingOnly, loadings } = useBase()
const { feedamount, feedrate, extrudeFactor, extrudePossible, minExtrudeTemp, activeExtruderSettings } = useExtruder()
const guiStore = useGuiStore()
const printerStore = usePrinterStore()

const feedamounts = computed<number[]>(() => guiStore.control.extruder?.feedamounts ?? [])
const feedrates = computed<number[]>(() => guiStore.control.extruder?.feedrates ?? [])

const feedamountsSorted = computed<number[]>(() => [...feedamounts.value].sort((a, b) => b - a))
const feedratesSorted = computed<number[]>(() => [...feedrates.value].sort((a, b) => b - a))

function setFeedamount(params: { value: number }): void {
    guiStore.saveSetting({ name: 'control.extruder.feedamount', value: params.value })
}

function setFeedrate(params: { value: number }): void {
    guiStore.saveSetting({ name: 'control.extruder.feedrate', value: params.value })
}

const maxExtrudeOnlyDistance = computed<number>(() => parseNumber(activeExtruderSettings.value?.max_extrude_only_distance, 50))

const tooLargeExtrusion = computed<boolean>(() => feedamount.value * extrudeFactor.value > maxExtrudeOnlyDistance.value)

const existsClientLinearMoveMacro = computed(() => {
    const macros = printerStore.gcode?.commands ?? {}

    return '_CLIENT_LINEAR_MOVE' in macros
})

watch(
    maxExtrudeOnlyDistance,
    () => {
        /**
         * If, while switching from ex. A to ex. B, the feedamount
         * from ex. an exceeds the maxExtrudeOnlyDistance of ex. B,
         * set the feedamount to maxExtrudeOnlyDistance of ex. B
         */
        if (feedamount.value > maxExtrudeOnlyDistance.value) {
            setFeedamount({ value: maxExtrudeOnlyDistance.value })
        }
    },
    { immediate: true }
)

function sendRetract(): void {
    sendCommand(feedamount.value * -1, 'btnRetract')
}

function sendExtrude(): void {
    sendCommand(feedamount.value, 'btnExtrude')
}

function sendCommand(length: number, loading: string): void {
    let gcode = `SAVE_GCODE_STATE NAME=_ui_extrude\n` + `M83\n` + `G1 E${length} F${feedrate.value * 60}\n` + `RESTORE_GCODE_STATE NAME=_ui_extrude`

    if (existsClientLinearMoveMacro.value) {
        gcode = `_CLIENT_LINEAR_MOVE E=${length} F=${feedrate.value * 60}`
    }

    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode }, { loading })
}
</script>

<style scoped>
._btn-group {
    border-radius: 4px;
    display: inline-flex;
    flex-wrap: nowrap;
    max-width: 100%;
    min-width: 100%;
    width: 100%;

    .v-btn {
        border-radius: 0;
        border-color: rgba(255, 255, 255, 0.12);
        border-style: solid;
        border-width: thin;
        box-shadow: none;
        height: 28px;
        opacity: 0.8;
        min-width: auto !important;
    }

    .v-btn:first-child {
        border-top-left-radius: inherit;
        border-bottom-left-radius: inherit;
    }

    .v-btn:last-child {
        border-top-right-radius: inherit;
        border-bottom-right-radius: inherit;
    }

    .v-btn:not(:first-child) {
        border-left-width: 0;
    }
}

html.theme--light ._btn-group .v-btn {
    border-color: rgba(0, 0, 0, 0.12) !important;
}

._btn-qs {
    font-size: 0.8rem !important;
    max-height: 24px;
}

._btn-extruder-cmd {
    min-width: 135px !important;
}
</style>
