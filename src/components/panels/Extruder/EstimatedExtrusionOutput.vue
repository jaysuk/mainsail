<template>
    <v-container v-if="showEstimatedExtrusion" class="pa-0 ma-0 pb-2">
        <div style="font-size: 0.8em" class="text-disabled text-caption font-weight-light d-flex justify-center">
            <span>
                {{ t('Panels.ExtruderControlPanel.EstimatedExtrusion') }} ~ {{ extrudedLength }} mm @ {{ volumetricFlow }} mm³/s -
                <v-icon size="x-small" style="opacity: 0.4; margin-top: -2px">
                    {{ mdiDiameterVariant }}
                </v-icon>
                {{ nozzleDiameter }} mm
                <v-tooltip v-if="showTooltip" location="top">
                    <template #activator="{ props: activatorProps }">
                        <v-icon size="small" color="warning" v-bind="activatorProps">
                            {{ mdiInformationOutline }}
                        </v-icon>
                    </template>
                    <span>
                        <div v-if="speed_factor !== 1">{{ t('Panels.ToolheadControlPanel.SpeedFactor') }}: {{ speedFactorOutput }} %</div>
                        <div v-if="extrudeFactor !== 1">{{ t('Panels.ExtruderControlPanel.ExtrusionFactor') }}: {{ extrudeFactorOutput }} %</div>
                    </span>
                </v-tooltip>
            </span>
        </div>
    </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiDiameterVariant, mdiInformationOutline } from '@mdi/js'
import { useExtruder } from '@/composables/useExtruder'
import { useGuiStore } from '@/store/gui'
import { usePrinterStore } from '@/store/printer'

const { t } = useI18n()
const { feedamount, extrudeFactor, filamentDiameter, nozzleDiameter, feedrate } = useExtruder()
const guiStore = useGuiStore()
const printerStore = usePrinterStore()

const showEstimatedExtrusion = computed(() => guiStore.control.extruder.showEstimatedExtrusionInfo ?? true)

const extrudedLength = computed<number>(() => Math.round(feedamount.value * extrudeFactor.value * (Math.pow(filamentDiameter.value, 2) / Math.pow(nozzleDiameter.value, 2))))

const speed_factor = computed(() => printerStore.gcode_move?.speed_factor ?? 1)

const volumetricFlow = computed<number>(() => Math.round(Math.pow(filamentDiameter.value / 2, 2) * Math.PI * feedrate.value * speed_factor.value * 10) / 10)

const showTooltip = computed(() => speed_factor.value !== 1 || extrudeFactor.value !== 1)

const speedFactorOutput = computed(() => (speed_factor.value * 100).toFixed(0))

const extrudeFactorOutput = computed(() => (extrudeFactor.value * 100).toFixed(0))
</script>
