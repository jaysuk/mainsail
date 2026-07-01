<template>
    <div>
        <v-card flat>
            <v-card-text>
                <h3 class="text-h5 mb-3">{{ t('Settings.TimelapseTab.General') }}</h3>
                <settings-row :title="t('Settings.TimelapseTab.Enabled')" :sub-title="t('Settings.TimelapseTab.EnabledDescription')" :dynamic-slot-width="true">
                    <v-switch v-model="enabled" hide-details class="mt-0" :disabled="blockedsettings.includes('enabled')" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.Autorender')" :sub-title="t('Settings.TimelapseTab.AutorenderDescription')" :dynamic-slot-width="true">
                    <v-switch v-model="autorender" hide-details class="mt-0" :disabled="blockedsettings.includes('autorender')" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.Camera')" :sub-title="t('Settings.TimelapseTab.CameraDescriptionWithSnapshotUrl')">
                    <v-alert v-if="blockedsettings.includes('snapshoturl')" density="compact" variant="text" type="warning" class="mb-0">
                        {{ t('Settings.TimelapseTab.CameraWarningAlreadySet') }}
                        <small>({{ t('Settings.TimelapseTab.CameraWarningAlreadySetSmall') }})</small>
                    </v-alert>
                    <v-select v-else v-model="camera" :items="cameraOptions" hide-details variant="outlined" density="compact" :disabled="blockedsettings.includes('camera') || availableSnapshotWebcams.length === 0" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.Mode')" :sub-title="t('Settings.TimelapseTab.ModeDescription')">
                    <v-select v-model="mode" :items="modeOptions" hide-details variant="outlined" density="compact" :disabled="blockedsettings.includes('modeOptions')" />
                </settings-row>
                <template v-if="mode === 'hyperlapse'">
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.TimelapseTab.HyperlapseCycle')" :sub-title="t('Settings.TimelapseTab.HyperlapseCycleDescription')">
                        <v-text-field v-model="hyperlapseCycle" type="number" suffix="s" hide-details="auto" variant="outlined" density="compact" :disabled="blockedsettings.includes('hyperlapseCycle')" hide-spin-buttons />
                    </settings-row>
                </template>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.PreviewImage')" :sub-title="t('Settings.TimelapseTab.PreviewImageDescription')" :dynamic-slot-width="true">
                    <v-switch v-model="previewimage" hide-details class="mt-0" :disabled="blockedsettings.includes('previewimage')" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.SaveFrames')" :sub-title="t('Settings.TimelapseTab.SaveFramesDescription')" :dynamic-slot-width="true">
                    <v-switch v-model="saveframes" hide-details class="mt-0" :disabled="blockedsettings.includes('saveframes')" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.StreamDelayCompensation')" :sub-title="t('Settings.TimelapseTab.StreamDelayCompensationDescription')">
                    <v-text-field
                        v-model="stream_delay_compensation"
                        type="number"
                        suffix="s"
                        step="0.01"
                        hide-details="auto"
                        variant="outlined"
                        density="compact"
                        :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v >= 0 || t('Settings.TimelapseTab.RulesZeroAndPositive')]"
                        :disabled="blockedsettings.includes('stream_delay_compensation')" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.GcodeVerbose')" :sub-title="t('Settings.TimelapseTab.GcodeVerboseDescription')" :dynamic-slot-width="true">
                    <v-switch v-model="gcode_verbose" hide-details class="mt-0" :disabled="blockedsettings.includes('gcode_verbose')" />
                </settings-row>
                <v-divider class="my-2" />
                <h3 class="text-h5 mt-6 mb-3">{{ t('Settings.TimelapseTab.Parkhead') }}</h3>
                <settings-row :title="t('Settings.TimelapseTab.Parkhead')" :sub-title="t('Settings.TimelapseTab.ParkheadDescription')" :dynamic-slot-width="true">
                    <v-switch v-model="parkhead" hide-details class="mt-0" :disabled="blockedsettings.includes('parkhead')" />
                </settings-row>
                <template v-if="parkhead">
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.TimelapseTab.Parkpos')" :sub-title="t('Settings.TimelapseTab.ParkposDescription')">
                        <v-select v-model="parkpos" :items="parkposOptions" hide-details variant="outlined" density="compact" :disabled="blockedsettings.includes('parkposOptions')" />
                    </settings-row>
                    <template v-if="['x_only', 'custom'].includes(parkpos)">
                        <v-divider class="my-2" />
                        <settings-row :title="t('Settings.TimelapseTab.PosX')" :sub-title="t('Settings.TimelapseTab.PosXDescription')">
                            <v-text-field
                                v-model="park_custom_pos_x"
                                type="number"
                                suffix="mm"
                                hide-details="auto"
                                variant="outlined"
                                density="compact"
                                :rules="[
                                    (v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'),
                                    (v: number) => (v >= stepperXmin && v <= stepperXmax) || t('Settings.TimelapseTab.RulesBetweenMinMax', { min: stepperXmin, max: stepperXmax }),
                                ]"
                                :disabled="blockedsettings.includes('park_custom_pos_x')"
                                hide-spin-buttons />
                        </settings-row>
                    </template>
                    <template v-if="['y_only', 'custom'].includes(parkpos)">
                        <v-divider class="my-2" />
                        <settings-row :title="t('Settings.TimelapseTab.PosY')" :sub-title="t('Settings.TimelapseTab.PosYDescription')">
                            <v-text-field
                                v-model="park_custom_pos_y"
                                type="number"
                                suffix="mm"
                                hide-details="auto"
                                variant="outlined"
                                density="compact"
                                :rules="[
                                    (v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'),
                                    (v: number) => (v >= stepperYmin && v <= stepperYmax) || t('Settings.TimelapseTab.RulesBetweenMinMax', { min: stepperYmin, max: stepperYmax }),
                                ]"
                                :disabled="blockedsettings.includes('park_custom_pos_y')"
                                hide-spin-buttons />
                        </settings-row>
                    </template>
                    <template v-if="['x_only', 'y_only', 'custom'].includes(parkpos)">
                        <v-divider class="my-2" />
                        <settings-row :title="t('Settings.TimelapseTab.PosDZ')" :sub-title="t('Settings.TimelapseTab.PosDZDescription')">
                            <v-text-field
                                v-model="park_custom_pos_dz"
                                type="number"
                                suffix="mm"
                                hide-details="auto"
                                variant="outlined"
                                density="compact"
                                :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v >= 0 || t('Settings.TimelapseTab.RulesZeroAndPositive')]"
                                :disabled="blockedsettings.includes('park_custom_pos_dz')"
                                hide-spin-buttons />
                        </settings-row>
                    </template>
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.TimelapseTab.TravelSpeed')" :sub-title="t('Settings.TimelapseTab.TravelSpeedDescription')">
                        <v-text-field
                            v-model="park_travel_speed"
                            type="number"
                            suffix="mm/s"
                            hide-details="auto"
                            variant="outlined"
                            density="compact"
                            :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v >= 0 || t('Settings.TimelapseTab.RulesZeroAndPositive')]"
                            :disabled="blockedsettings.includes('park_travel_speed')"
                            hide-spin-buttons />
                    </settings-row>
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.TimelapseTab.FwRetract')" :sub-title="t('Settings.TimelapseTab.FwRetractDescription')" :dynamic-slot-width="true">
                        <v-switch v-model="fw_retract" hide-details class="mt-0" :disabled="blockedsettings.includes('fw_retract')" />
                    </settings-row>
                    <template v-if="!fw_retract">
                        <v-divider class="my-2" />
                        <settings-row :title="t('Settings.TimelapseTab.RetractSpeed')" :sub-title="t('Settings.TimelapseTab.RetractSpeedDescription')">
                            <v-text-field
                                v-model="park_retract_speed"
                                type="number"
                                suffix="mm/s"
                                hide-details="auto"
                                variant="outlined"
                                density="compact"
                                :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v > 0 || t('Settings.TimelapseTab.RulesPositive')]"
                                :disabled="blockedsettings.includes('park_retract_speed')"
                                hide-spin-buttons />
                        </settings-row>
                        <v-divider class="my-2" />
                        <settings-row :title="t('Settings.TimelapseTab.RetractDistance')" :sub-title="t('Settings.TimelapseTab.RetractDistanceDescription')">
                            <v-text-field
                                v-model="park_retract_distance"
                                type="number"
                                suffix="mm"
                                hide-details="auto"
                                variant="outlined"
                                density="compact"
                                :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v >= 0 || t('Settings.TimelapseTab.RulesZeroAndPositive')]"
                                :disabled="blockedsettings.includes('park_retract_distance')"
                                hide-spin-buttons />
                        </settings-row>
                        <v-divider class="my-2" />
                        <settings-row :title="t('Settings.TimelapseTab.UnretractSpeed')" :sub-title="t('Settings.TimelapseTab.UnretractSpeedDescription')">
                            <v-text-field
                                v-model="park_extrude_speed"
                                type="number"
                                suffix="mm/s"
                                hide-details="auto"
                                variant="outlined"
                                density="compact"
                                :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v > 0 || t('Settings.TimelapseTab.RulesPositive')]"
                                :disabled="blockedsettings.includes('park_extrude_speed')"
                                hide-spin-buttons />
                        </settings-row>
                        <v-divider class="my-2" />
                        <settings-row :title="t('Settings.TimelapseTab.UnretractDistance')" :sub-title="t('Settings.TimelapseTab.UnretractDistanceDescription')">
                            <v-text-field
                                v-model="park_extrude_distance"
                                type="number"
                                suffix="mm"
                                hide-details="auto"
                                variant="outlined"
                                density="compact"
                                :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v >= 0 || t('Settings.TimelapseTab.RulesZeroAndPositive')]"
                                :disabled="blockedsettings.includes('park_extrude_distance')"
                                hide-spin-buttons />
                        </settings-row>
                    </template>
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.TimelapseTab.ParkTime')" :sub-title="t('Settings.TimelapseTab.ParkTimeDescription')">
                        <v-text-field
                            v-model="park_time"
                            type="number"
                            suffix="s"
                            hide-details="auto"
                            step="0.1"
                            variant="outlined"
                            density="compact"
                            :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v >= 0 || t('Settings.TimelapseTab.RulesZeroAndPositive')]"
                            :disabled="blockedsettings.includes('park_time')" />
                    </settings-row>
                </template>
                <v-divider class="my-2" />
                <h3 class="text-h5 mt-6 mb-3">{{ t('Settings.TimelapseTab.RenderingOptions') }}</h3>
                <settings-row :title="t('Settings.TimelapseTab.VariableFps')" :sub-title="t('Settings.TimelapseTab.VariableFpsDescription')" :dynamic-slot-width="true">
                    <v-switch v-model="variable_fps" hide-details class="mt-0" :disabled="blockedsettings.includes('variable_fps')" />
                </settings-row>
                <template v-if="variable_fps">
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.TimelapseTab.Targetlength')" :sub-title="t('Settings.TimelapseTab.TargetlengthDescription')">
                        <v-text-field
                            v-model="targetlength"
                            type="number"
                            suffix="s"
                            hide-details="auto"
                            variant="outlined"
                            density="compact"
                            :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v > 0 || t('Settings.TimelapseTab.RulesPositive')]"
                            :disabled="blockedsettings.includes('targetlength')"
                            hide-spin-buttons />
                    </settings-row>
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.TimelapseTab.VariableFpsMin')" :sub-title="t('Settings.TimelapseTab.VariableFpsMinDescription')">
                        <v-text-field
                            v-model="variable_fps_min"
                            type="number"
                            suffix="frames"
                            hide-details="auto"
                            variant="outlined"
                            density="compact"
                            :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v > 0 || t('Settings.TimelapseTab.RulesPositive')]"
                            :disabled="blockedsettings.includes('variable_fps_min')"
                            hide-spin-buttons />
                    </settings-row>
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.TimelapseTab.VariableFpsMax')" :sub-title="t('Settings.TimelapseTab.VariableFpsMaxDescription')">
                        <v-text-field
                            v-model="variable_fps_max"
                            type="number"
                            suffix="frames"
                            hide-details="auto"
                            variant="outlined"
                            density="compact"
                            :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v > variable_fps_min || t('Settings.TimelapseTab.RulesMin')]"
                            :disabled="blockedsettings.includes('variable_fps_max')"
                            hide-spin-buttons />
                    </settings-row>
                </template>
                <template v-else>
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.TimelapseTab.OutputFramerate')" :sub-title="t('Settings.TimelapseTab.OutputFramerateDescription')">
                        <v-text-field
                            v-model="output_framerate"
                            type="number"
                            suffix="frames"
                            hide-details="auto"
                            variant="outlined"
                            density="compact"
                            :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v > 0 || t('Settings.TimelapseTab.RulesPositive')]"
                            :disabled="blockedsettings.includes('output_framerate')"
                            hide-spin-buttons />
                    </settings-row>
                </template>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.duplicatelastframe')" :sub-title="t('Settings.TimelapseTab.duplicatelastframeDescription')">
                    <v-text-field
                        v-model="duplicatelastframe"
                        type="number"
                        hide-details="auto"
                        variant="outlined"
                        density="compact"
                        :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v >= 0 || t('Settings.TimelapseTab.RulesZeroAndPositive')]"
                        :disabled="blockedsettings.includes('duplicatelastframe')"
                        hide-spin-buttons />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.ConstantRateFactor')" :sub-title="t('Settings.TimelapseTab.ConstantRateFactorDescription')">
                    <v-text-field
                        v-model="constant_rate_factor"
                        type="number"
                        hide-details="auto"
                        variant="outlined"
                        density="compact"
                        :rules="[(v: string) => !!v || t('Settings.TimelapseTab.RulesRequired'), (v: number) => v > 0 || t('Settings.TimelapseTab.RulesPositive')]"
                        :disabled="blockedsettings.includes('constant_rate_factor')"
                        hide-spin-buttons />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.Pixelformat')" :sub-title="t('Settings.TimelapseTab.PixelformatDescription')">
                    <v-text-field v-model="pixelformat" type="text" hide-details="auto" variant="outlined" density="compact" :disabled="blockedsettings.includes('pixelformat')" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.TimeFormatCode')" :sub-title="t('Settings.TimelapseTab.TimeFormatCodeDescription')">
                    <v-text-field v-model="time_format_code" type="text" hide-details="auto" variant="outlined" density="compact" :disabled="blockedsettings.includes('time_format_code')" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.TimelapseTab.Extraoutputparams')" :sub-title="t('Settings.TimelapseTab.ExtraoutputparamsDescription')">
                    <v-text-field v-model="extraoutputparams" type="text" hide-details="auto" variant="outlined" density="compact" :disabled="blockedsettings.includes('extraoutputparams')" />
                </settings-row>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { caseInsensitiveSort } from '@/plugins/helpers'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { useGuiWebcamsStore } from '@/store/gui/webcams'
import { useServerTimelapseStore } from '@/store/server/timelapse'
import { usePrinterStore } from '@/store/printer'

const { t } = useI18n()
const guiWebcamsStore = useGuiWebcamsStore()
const timelapseStore = useServerTimelapseStore()
const printerStore = usePrinterStore()

const modeOptions = [
    { text: 'layermacro', value: 'layermacro' },
    { text: 'hyperlapse', value: 'hyperlapse' },
]

const parkposOptions = [
    { text: 'center', value: 'center' },
    { text: 'front_left', value: 'front_left' },
    { text: 'front_right', value: 'front_right' },
    { text: 'back_left', value: 'back_left' },
    { text: 'back_right', value: 'back_right' },
    { text: 'x_only', value: 'x_only' },
    { text: 'y_only', value: 'y_only' },
    { text: 'custom', value: 'custom' },
]

const availableSnapshotWebcams = computed<GuiWebcamStateWebcam[]>(() => guiWebcamsStore.getWebcams.filter((webcam) => webcam.snapshot_url !== ''))

const cameraOptions = computed(() => {
    let output: { text: string; value: string | null }[] = []

    if (availableSnapshotWebcams.value.length === 0) {
        return [{ value: null, text: t('Settings.TimelapseTab.NoWebcamFound') }]
    }

    availableSnapshotWebcams.value.forEach((webcam: GuiWebcamStateWebcam) => {
        output.push({ text: webcam.name, value: webcam.name })
    })

    output = caseInsensitiveSort(output, 'text')

    if (camera.value === null) {
        output.unshift({ value: null, text: t('Settings.TimelapseTab.SelectWebcam') })
    }

    return output
})

const blockedsettings = computed(() => timelapseStore.settings.blockedsettings ?? [])

const enabled = computed({
    get: () => timelapseStore.settings.enabled,
    set: (newVal) => timelapseStore.saveSetting({ enabled: newVal }),
})

const mode = computed({
    get: () => timelapseStore.settings.mode,
    set: (newVal) => timelapseStore.saveSetting({ mode: newVal }),
})

const hyperlapseCycle = computed({
    get: () => timelapseStore.settings.hyperlapse_cycle,
    set: (newVal) => timelapseStore.saveSetting({ hyperlapse_cycle: newVal }),
})

const autorender = computed({
    get: () => timelapseStore.settings.autorender,
    set: (newVal) => timelapseStore.saveSetting({ autorender: newVal }),
})

const saveframes = computed({
    get: () => timelapseStore.settings.saveframes,
    set: (newVal) => timelapseStore.saveSetting({ saveframes: newVal }),
})

const stream_delay_compensation = computed({
    get: () => timelapseStore.settings.stream_delay_compensation,
    set: (newVal: number | string) => {
        if (newVal === '') newVal = 0

        timelapseStore.saveSetting({ stream_delay_compensation: Number(newVal) })
    },
})

const previewimage = computed({
    get: () => timelapseStore.settings.previewimage,
    set: (newVal) => timelapseStore.saveSetting({ previewimage: newVal }),
})

const gcode_verbose = computed({
    get: () => timelapseStore.settings.gcode_verbose,
    set: (newVal) => timelapseStore.saveSetting({ gcode_verbose: newVal }),
})

const parkhead = computed({
    get: () => timelapseStore.settings.parkhead,
    set: (newVal) => timelapseStore.saveSetting({ parkhead: newVal }),
})

const parkpos = computed({
    get: () => timelapseStore.settings.parkpos,
    set: (newVal) => timelapseStore.saveSetting({ parkpos: newVal }),
})

const stepperXmin = computed(() => printerStore.configfile?.settings?.stepper_x?.position_min ?? 0)
const stepperXmax = computed(() => printerStore.configfile?.settings?.stepper_x?.position_max ?? 200)

const park_custom_pos_x = computed({
    get: () => timelapseStore.settings.park_custom_pos_x,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) < stepperXmin.value || Number(newVal) > stepperXmax.value) return

        timelapseStore.saveSetting({ park_custom_pos_x: Number(newVal) })
    },
})

const stepperYmin = computed(() => printerStore.configfile?.settings?.stepper_y?.position_min ?? 0)
const stepperYmax = computed(() => printerStore.configfile?.settings?.stepper_y?.position_max ?? 200)

const park_custom_pos_y = computed({
    get: () => timelapseStore.settings.park_custom_pos_y,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) < stepperYmin.value || Number(newVal) > stepperYmax.value) return

        timelapseStore.saveSetting({ park_custom_pos_y: Number(newVal) })
    },
})

const park_custom_pos_dz = computed({
    get: () => timelapseStore.settings.park_custom_pos_dz,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) < 0) return

        timelapseStore.saveSetting({ park_custom_pos_dz: Number(newVal) })
    },
})

const park_travel_speed = computed({
    get: () => timelapseStore.settings.park_travel_speed,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) < 0) return

        timelapseStore.saveSetting({ park_travel_speed: Number(newVal) })
    },
})

const park_retract_speed = computed({
    get: () => timelapseStore.settings.park_retract_speed,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) <= 0) return

        timelapseStore.saveSetting({ park_retract_speed: Number(newVal) })
    },
})

const park_extrude_speed = computed({
    get: () => timelapseStore.settings.park_extrude_speed,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) <= 0) return

        timelapseStore.saveSetting({ park_extrude_speed: Number(newVal) })
    },
})

const park_retract_distance = computed({
    get: () => timelapseStore.settings.park_retract_distance,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) < 0) return

        timelapseStore.saveSetting({ park_retract_distance: Number(newVal) })
    },
})

const park_extrude_distance = computed({
    get: () => timelapseStore.settings.park_extrude_distance,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) < 0) return

        timelapseStore.saveSetting({ park_extrude_distance: Number(newVal) })
    },
})

const park_time = computed({
    get: () => timelapseStore.settings.park_time,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) < 0) return

        timelapseStore.saveSetting({ park_time: Number(newVal) })
    },
})

const fw_retract = computed({
    get: () => timelapseStore.settings.fw_retract,
    set: (newVal) => timelapseStore.saveSetting({ fw_retract: newVal }),
})

const constant_rate_factor = computed({
    get: () => timelapseStore.settings.constant_rate_factor,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) <= 0) return

        timelapseStore.saveSetting({ constant_rate_factor: Number(newVal) })
    },
})

const output_framerate = computed({
    get: () => timelapseStore.settings.output_framerate,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) <= 0) return

        timelapseStore.saveSetting({ output_framerate: Number(newVal) })
    },
})

const pixelformat = computed({
    get: () => timelapseStore.settings.pixelformat,
    set: (newVal) => timelapseStore.saveSetting({ pixelformat: newVal }),
})

const extraoutputparams = computed({
    get: () => timelapseStore.settings.extraoutputparams,
    set: (newVal) => timelapseStore.saveSetting({ extraoutputparams: newVal }),
})

const variable_fps = computed({
    get: () => timelapseStore.settings.variable_fps,
    set: (newVal) => timelapseStore.saveSetting({ variable_fps: newVal }),
})

const targetlength = computed({
    get: () => timelapseStore.settings.targetlength,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) <= 0) return

        timelapseStore.saveSetting({ targetlength: Number(newVal) })
    },
})

const variable_fps_min = computed({
    get: () => timelapseStore.settings.variable_fps_min,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) <= 0) return

        timelapseStore.saveSetting({ variable_fps_min: Number(newVal) })
    },
})

const variable_fps_max = computed({
    get: () => timelapseStore.settings.variable_fps_max,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) <= variable_fps_min.value) return

        timelapseStore.saveSetting({ variable_fps_max: Number(newVal) })
    },
})

const duplicatelastframe = computed({
    get: () => timelapseStore.settings.duplicatelastframe,
    set: (newVal: number | string) => {
        if (newVal === '' || Number(newVal) < 0) return

        timelapseStore.saveSetting({ duplicatelastframe: Number(newVal) })
    },
})

const camera = computed({
    get: () => {
        const value = timelapseStore.settings.camera ?? null

        if (
            value === null ||
            blockedsettings.value.includes('snapshoturl') ||
            availableSnapshotWebcams.value.length === 0 ||
            availableSnapshotWebcams.value.find((webcam) => webcam.name === value) === undefined
        ) {
            return null
        }

        return timelapseStore.settings.camera
    },
    set: (newVal) => timelapseStore.saveSetting({ camera: newVal ?? '' }),
})

const time_format_code = computed({
    get: () => timelapseStore.settings.time_format_code,
    set: (newVal) => timelapseStore.saveSetting({ time_format_code: newVal }),
})
</script>
