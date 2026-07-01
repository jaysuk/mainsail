<template>
    <v-row>
        <v-col :class="{ 'col-6': !isSmall, 'col-12': isSmall }">
            <number-input
                :label="t('Panels.ExtruderControlPanel.PressureAdvanceSettings.Advance')"
                param="ADVANCE"
                :target="pressureAdvance"
                :default-value="defaultPressureAdvance"
                :output-error-msg="true"
                :has-spinner="true"
                :min="0"
                :max="null"
                :step="0.001"
                :dec="3"
                unit="s"
                @submit="sendCmd" />
        </v-col>
        <v-col :class="{ 'col-6': !isSmall, 'col-12': isSmall }">
            <number-input
                :label="t('Panels.ExtruderControlPanel.PressureAdvanceSettings.SmoothTime')"
                param="SMOOTH_TIME"
                :target="smoothTime"
                :default-value="defaultSmoothTime"
                :output-error-msg="true"
                :has-spinner="true"
                :spinner-factor="10"
                :min="0"
                :max="0.2"
                :step="0.001"
                :dec="3"
                unit="s"
                @submit="sendCmd" />
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import NumberInput from '@/components/inputs/NumberInput.vue'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const PRECISION = 1000
const DEFAULT_SMOOTH_TIME = 0.04

const props = withDefaults(
    defineProps<{
        isSmall?: boolean
        extruder: string
    }>(),
    { isSmall: false }
)

const { t } = useI18n()
const printerStore = usePrinterStore()

const extruderObject = computed(() => printerStore[props.extruder] ?? undefined)

const extruderSettings = computed(() => {
    const settings = printerStore.configfile?.settings ?? {}

    return settings[props.extruder] ?? undefined
})

function roundToThreeDecimals(value: number): number {
    return Math.floor(value * PRECISION) / PRECISION
}

const pressureAdvance = computed<number>(() => roundToThreeDecimals(extruderObject.value?.pressure_advance ?? 0))

const smoothTime = computed(() => roundToThreeDecimals(extruderObject.value?.smooth_time ?? DEFAULT_SMOOTH_TIME))

const defaultPressureAdvance = computed(() => roundToThreeDecimals(extruderSettings.value?.pressure_advance ?? 0))

const defaultSmoothTime = computed(() => roundToThreeDecimals(extruderSettings.value?.pressure_advance_smooth_time ?? extruderSettings.value?.smooth_time ?? DEFAULT_SMOOTH_TIME))

// debounce replaces the removed vue-debounce-decorator @Debounce(500)
let debounceTimer: ReturnType<typeof setTimeout> | undefined
function sendCmd(params: { name: string; value: number }) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        const extruder = props.extruder.startsWith('extruder_stepper ') ? props.extruder.substring('extruder_stepper '.length) : props.extruder

        const gcode = `SET_PRESSURE_ADVANCE EXTRUDER=${extruder} ${params.name}=${params.value}`

        useServerStore().addEvent({ message: gcode, type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: gcode })
    }, 500)
}

onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
})
</script>
