<template>
    <panel v-if="showPanel" :icon="mdiPrinter3dNozzle" :title="t('Panels.ExtruderControlPanel.Headline')" :collapsible="true" card-class="extruder-control-panel">
        <!-- PANEL-HEADER 3-DOT-MENU -->
        <template #buttons>
            <v-menu v-if="showFilamentMacros" :close-on-content-click="false" location="bottom end">
                <template #activator="{ props: activatorProps }">
                    <v-btn icon="" variant="text" v-bind="activatorProps">
                        <v-icon>{{ mdiDotsVertical }}</v-icon>
                    </v-btn>
                </template>
                <v-list density="compact">
                    <!-- FILAMENT UNLOAD -->
                    <v-list-item v-if="unloadFilamentMacro">
                        <v-tooltip location="top" :disabled="canExecuteUnloadMacro" color="secondary">
                            <template #activator="{ props: activatorProps }">
                                <div v-bind="activatorProps">
                                    <macro-button :macro="unloadFilamentMacro" :alias="t('Panels.ExtruderControlPanel.UnloadFilament')" :disabled="!canExecuteUnloadMacro || printerIsPrintingOnly" color="#272727" />
                                </div>
                            </template>
                            <span>
                                {{ t('Panels.ExtruderControlPanel.ExtruderTempTooLow') }}
                                {{ minExtrudeTemp }} °C
                            </span>
                        </v-tooltip>
                    </v-list-item>
                    <!-- FILAMENT LOAD -->
                    <v-list-item v-if="loadFilamentMacro">
                        <v-tooltip location="top" :disabled="canExecuteLoadMacro" color="secondary">
                            <template #activator="{ props: activatorProps }">
                                <div v-bind="activatorProps">
                                    <macro-button :macro="loadFilamentMacro" :alias="t('Panels.ExtruderControlPanel.LoadFilament')" :disabled="!canExecuteLoadMacro || printerIsPrintingOnly" color="#272727" />
                                </div>
                            </template>
                            <span>
                                {{ t('Panels.ExtruderControlPanel.ExtruderTempTooLow') }}
                                {{ minExtrudeTemp }} °C
                            </span>
                        </v-tooltip>
                    </v-list-item>
                    <!-- FILAMENT PURGE -->
                    <v-list-item v-if="purgeFilamentMacro">
                        <v-tooltip location="top" :disabled="canExecutePurgeMacro" color="secondary">
                            <template #activator="{ props: activatorProps }">
                                <div v-bind="activatorProps">
                                    <macro-button :macro="purgeFilamentMacro" :alias="t('Panels.ExtruderControlPanel.PurgeFilament')" :disabled="!canExecutePurgeMacro || printerIsPrintingOnly" color="#272727" />
                                </div>
                            </template>
                            <span>
                                {{ t('Panels.ExtruderControlPanel.ExtruderTempTooLow') }}
                                {{ minExtrudeTemp }} °C
                            </span>
                        </v-tooltip>
                    </v-list-item>
                    <!-- NOZZLE CLEAN -->
                    <v-list-item v-if="cleanNozzleMacro">
                        <macro-button :macro="cleanNozzleMacro" :alias="t('Panels.ExtruderControlPanel.CleanNozzle')" :disabled="printerIsPrintingOnly" color="#272727" />
                    </v-list-item>
                </v-list>
            </v-menu>
            <extruder-panel-settings />
        </template>
        <!-- TOOL SELECTOR BUTTONS -->
        <extruder-control-panel-tools v-if="showTools && toolchangeMacros.length" />
        <!-- EXTRUSION FACTOR SLIDER -->
        <template v-if="showExtrusionFactor">
            <v-divider v-if="showTools" />
            <extrusion-factor-settings />
        </template>
        <!-- PRESSURE ADVANCE SETTINGS -->
        <template v-if="showPressureAdvance">
            <v-divider v-if="showTools || showExtrusionFactor" />
            <extruder-pressure-advance-settings v-if="extruderSteppers.length === 0" />
            <template v-else>
                <extruder-stepper-pressure-advance-settings v-for="(extruderStepper, index) in extruderSteppers" :key="extruderStepper" :class="{ 'pt-3': index === 0 }" :extruder-stepper="extruderStepper" />
            </template>
        </template>
        <!-- FIRMWARE RETRACTION SETTINGS -->
        <template v-if="showFirmwareRetraction">
            <v-divider v-if="showTools || showExtrusionFactor || showPressureAdvance" />
            <firmware-retraction-settings />
        </template>
        <!-- EXTRUDER INPUTS AND QUICKSELECTS -->
        <template v-if="showExtruderControl">
            <v-divider v-if="showTools || showExtrusionFactor || showPressureAdvance || showFirmwareRetraction" />
            <extruder-control-panel-control />
        </template>
    </panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiPrinter3dNozzle, mdiDotsVertical } from '@mdi/js'
import type { PrinterStateMacro } from '@/store/printer/types'
import Panel from '@/components/ui/Panel.vue'
import MacroButton from '@/components/inputs/MacroButton.vue'
import ExtruderPanelSettings from '@/components/panels/Extruder/ExtruderPanelSettings.vue'
import ExtruderControlPanelTools from '@/components/panels/Extruder/ExtruderControlPanelTools.vue'
import ExtrusionFactorSettings from '@/components/panels/Extruder/ExtrusionFactorSettings.vue'
import ExtruderPressureAdvanceSettings from '@/components/panels/Extruder/ExtruderPressureAdvanceSettings.vue'
import ExtruderStepperPressureAdvanceSettings from '@/components/panels/Extruder/ExtruderStepperPressureAdvanceSettings.vue'
import FirmwareRetractionSettings from '@/components/panels/Extruder/FirmwareRetractionSettings.vue'
import ExtruderControlPanelControl from '@/components/panels/Extruder/ExtruderControlPanelControl.vue'
import { useBase } from '@/composables/useBase'
import { useControl } from '@/composables/useControl'
import { useExtruder } from '@/composables/useExtruder'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { klipperReadyForGui, printerIsPrintingOnly } = useBase()
const { toolchangeMacros, existsFirmwareRetraction } = useControl()
const { extruders, minExtrudeTemp, extrudePossible } = useExtruder()
const printerStore = usePrinterStore()
const guiStore = useGuiStore()

const heatWaitGcodes = ['printer.extruder.can_extrude', 'TEMPERATURE_WAIT', 'M109']

const showPanel = computed<boolean>(() => klipperReadyForGui.value && extruders.value.length > 0)

const macros = computed(() => printerStore.getMacros)

const loadFilamentMacro = computed<PrinterStateMacro | undefined>(() => {
    const macros_ = ['LOAD_FILAMENT', 'FILAMENT_LOAD']

    return macros.value.find((macro: PrinterStateMacro) => macros_.includes(macro.name.toUpperCase()))
})

const unloadFilamentMacro = computed<PrinterStateMacro | undefined>(() => {
    const macros_ = ['UNLOAD_FILAMENT', 'FILAMENT_UNLOAD']

    return macros.value.find((macro: PrinterStateMacro) => macros_.includes(macro.name.toUpperCase()))
})

const purgeFilamentMacro = computed<PrinterStateMacro | undefined>(() => {
    const macros_ = ['PURGE_FILAMENT', 'FILAMENT_PURGE']

    return macros.value.find((macro: PrinterStateMacro) => macros_.includes(macro.name.toUpperCase()))
})

const cleanNozzleMacro = computed<PrinterStateMacro | undefined>(() => {
    const macros_ = ['CLEAN_NOZZLE', 'NOZZLE_CLEAN', 'WIPE_NOZZLE', 'NOZZLE_WIPE']

    return macros.value.find((macro: PrinterStateMacro) => macros_.includes(macro.name.toUpperCase()))
})

/**
 * test if the load and unload macro include specific keywords. if true, we allow
 * execution of that macro even if at the current time extrudePossible === false
 */
const canExecuteLoadMacro = computed<boolean>(() => {
    if (extrudePossible.value) return true

    return heatWaitGcodes.some((gcode) => (loadFilamentMacro.value?.prop.gcode as string | undefined)?.includes(gcode))
})

const canExecuteUnloadMacro = computed<boolean>(() => {
    if (extrudePossible.value) return true

    return heatWaitGcodes.some((gcode) => (unloadFilamentMacro.value?.prop.gcode as string | undefined)?.includes(gcode))
})

const canExecutePurgeMacro = computed<boolean>(() => {
    if (extrudePossible.value) return true

    return heatWaitGcodes.some((gcode) => (purgeFilamentMacro.value?.prop.gcode as string | undefined)?.includes(gcode))
})

const showFilamentMacros = computed<boolean>(() => loadFilamentMacro.value !== undefined || unloadFilamentMacro.value !== undefined || purgeFilamentMacro.value !== undefined || cleanNozzleMacro.value !== undefined)

const showTools = computed<boolean>(() => {
    if (toolchangeMacros.value.length < 1) return false

    return guiStore.view.extruder.showTools ?? true
})

const showExtrusionFactor = computed<boolean>(() => guiStore.view.extruder.showExtrusionFactor ?? true)

const extruderSteppers = computed(() =>
    Object.keys(printerStore)
        .filter((e) => e.startsWith('extruder_stepper '))
        .sort((a, b) => a.localeCompare(b))
)

const showPressureAdvance = computed<boolean>(() => guiStore.view.extruder.showPressureAdvance ?? true)

const showFirmwareRetraction = computed<boolean>(() => {
    if (!existsFirmwareRetraction.value) return false

    return guiStore.view.extruder.showFirmwareRetraction ?? true
})

const showExtruderControl = computed<boolean>(() => guiStore.view.extruder.showExtruderControl ?? true)
</script>
