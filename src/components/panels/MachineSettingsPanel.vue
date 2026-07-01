<template>
    <panel v-if="klipperReadyForGui" :icon="mdiEngine" :title="t('Panels.MachineSettingsPanel.Headline')" :collapsible="true" card-class="machine-settings-panel">
        <responsive
            :breakpoints="{
                small: (el) => el.width < 375,
                medium: (el) => el.width >= 375,
            }">
            <template #default="{ el }">
                <v-card-text class="pt-5">
                    <v-row>
                        <v-col :class="{ 'col-12': el.is.small, 'col-6': el.is.medium }">
                            <number-input
                                :label="t('Panels.MachineSettingsPanel.MotionSettings.Velocity')"
                                param="VELOCITY"
                                :target="velocity"
                                :default-value="defaultVelocity"
                                :output-error-msg="true"
                                :has-spinner="true"
                                :spinner-factor="5"
                                :step="1"
                                :min="1"
                                :max="null"
                                :dec="0"
                                unit="mm/s"
                                @submit="sendCmd" />
                        </v-col>
                        <v-col :class="{ 'col-12': el.is.small, 'col-6': el.is.medium }">
                            <number-input
                                :label="t('Panels.MachineSettingsPanel.MotionSettings.SquareCornerVelocity')"
                                param="SQUARE_CORNER_VELOCITY"
                                :target="squareCornerVelocity"
                                :default-value="defaultSquareCornerVelocity"
                                :output-error-msg="true"
                                :has-spinner="true"
                                :step="0.1"
                                :min="0.1"
                                :max="null"
                                :dec="1"
                                unit="mm/s"
                                @submit="sendCmd" />
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col :class="{ 'col-12': el.is.small, 'col-6': el.is.medium }">
                            <number-input
                                :label="t('Panels.MachineSettingsPanel.MotionSettings.Acceleration')"
                                param="ACCEL"
                                :target="accel"
                                :default-value="defaultAccel"
                                :output-error-msg="true"
                                :has-spinner="true"
                                :spinner-factor="100"
                                :step="1"
                                :min="1"
                                :max="null"
                                :dec="0"
                                unit="mm/s²"
                                @submit="sendCmd" />
                        </v-col>
                        <v-col :class="{ 'col-12': el.is.small, 'col-6': el.is.medium }">
                            <number-input
                                v-if="minimumCruiseRatio === null"
                                :label="t('Panels.MachineSettingsPanel.MotionSettings.MaxAccelToDecel')"
                                param="ACCEL_TO_DECEL"
                                :target="accelToDecel"
                                :default-value="defaultAccelToDecel"
                                :output-error-msg="true"
                                :has-spinner="true"
                                :spinner-factor="100"
                                :step="1"
                                :min="1"
                                :max="null"
                                :dec="0"
                                unit="mm/s²"
                                @submit="sendCmd" />
                            <number-input
                                v-else
                                :label="t('Panels.MachineSettingsPanel.MotionSettings.MinimumCruiseRatio')"
                                param="MINIMUM_CRUISE_RATIO"
                                :target="minimumCruiseRatio"
                                :default-value="defaultMinimumCruiseRatio"
                                :output-error-msg="true"
                                :has-spinner="true"
                                :spinner-factor="5"
                                :step="1"
                                :min="0"
                                :max="99"
                                :dec="0"
                                unit="%"
                                @submit="sendCruiseRatioCmd" />
                        </v-col>
                    </v-row>
                </v-card-text>
            </template>
        </responsive>
    </panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiEngine } from '@mdi/js'
import NumberInput from '@/components/inputs/NumberInput.vue'
import Responsive from '@/components/ui/Responsive.vue'
import { useBase } from '@/composables/useBase'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { klipperReadyForGui } = useBase()
const printerStore = usePrinterStore()

const toolhead = computed(() => printerStore.toolhead ?? {})

const configPrinter = computed(() => printerStore.configfile?.settings?.printer ?? {})

const velocity = computed<number>(() => Math.trunc(toolhead.value.max_velocity ?? 300))

const accel = computed<number>(() => Math.trunc(toolhead.value.max_accel ?? 3000))

const accelToDecel = computed<number>(() => Math.trunc(toolhead.value.max_accel_to_decel ?? accel.value / 2))

const minimumCruiseRatio = computed<number | null>(() => {
    const value = toolhead.value.minimum_cruise_ratio ?? null

    if (value === null) return null

    return Math.round(value * 100)
})

const squareCornerVelocity = computed<number>(() => Math.floor((toolhead.value.square_corner_velocity ?? 8) * 10) / 10)

const defaultVelocity = computed<number>(() => Math.trunc(configPrinter.value.max_velocity ?? 300))

const defaultAccel = computed<number>(() => Math.trunc(configPrinter.value.max_accel ?? 3000))

const defaultAccelToDecel = computed<number>(() => Math.trunc(configPrinter.value.max_accel_to_decel ?? 1500))

const defaultMinimumCruiseRatio = computed<number>(() => {
    const value = configPrinter.value.minimum_cruise_ratio ?? 0.5

    return Math.round(value * 100)
})

const defaultSquareCornerVelocity = computed<number>(() => {
    const value = configPrinter.value.square_corner_velocity ?? 8

    return Math.floor(value * 10) / 10
})

let debounceTimer: ReturnType<typeof setTimeout> | undefined

function sendCmd(params: { name: string; value: number }): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        const gcode = `SET_VELOCITY_LIMIT ${params.name}=${params.value}`

        useServerStore().addEvent({ message: gcode, type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: gcode })
    }, 500)
}

function sendCruiseRatioCmd(params: { name: string; value: number }): void {
    params.value = params.value / 100

    sendCmd(params)
}
</script>
