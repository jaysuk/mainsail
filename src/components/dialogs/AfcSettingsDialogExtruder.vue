<template>
    <div>
        <h3 class="text-h5 mb-3 mt-5">{{ title }}</h3>
        <settings-row :title="t('Panels.AfcPanel.SettingsDialog.LoadUnloadLane')" :sub-title="t('Panels.AfcPanel.SettingsDialog.LoadUnloadLaneDescription')">
            <div class="d-flex flex-wrap">
                <v-btn v-for="lane in lanes" :key="lane" :disabled="!filledLanes.includes(lane)" size="small" class="ma-1" :color="lane_loaded === lane ? 'primary' : ''" @click="toggleLane(lane)">
                    {{ lane }}
                </v-btn>
            </div>
        </settings-row>
        <v-divider class="my-3" />
        <settings-row :title="t('Panels.AfcPanel.SettingsDialog.ToolStn')" :sub-title="toolStnSubTitle">
            <number-input
                label="tool_stn"
                param="TOOL_STN"
                :target="currentToolStn"
                :default-value="settingsToolStn"
                :output-error-msg="true"
                :has-spinner="true"
                :spinner-factor="1"
                :step="1"
                :min="0"
                :max="null"
                :dec="0"
                unit="mm"
                class="w-100"
                @submit="updateToolheadSensors" />
        </settings-row>
        <v-divider class="my-3" />
        <settings-row :title="t('Panels.AfcPanel.SettingsDialog.ToolStnUnload')" :sub-title="t('Panels.AfcPanel.SettingsDialog.ToolStnUnloadDescription')">
            <number-input
                label="tool_stn_unload"
                param="TOOL_STN_UNLOAD"
                :target="currentToolStnUnload"
                :default-value="settingsToolStnUnload"
                :output-error-msg="true"
                :has-spinner="true"
                :spinner-factor="1"
                :step="1"
                :min="0"
                :max="null"
                :dec="0"
                unit="mm"
                class="w-100"
                @submit="updateToolheadSensors" />
        </settings-row>
        <template v-if="existsToolEndSensor">
            <v-divider class="my-3" />
            <settings-row :title="t('Panels.AfcPanel.SettingsDialog.ToolSensorAfterExtruder')" :sub-title="t('Panels.AfcPanel.SettingsDialog.ToolSensorAfterExtruderDescription')">
                <number-input
                    label="tool_sensor_after_extruder"
                    param="TOOL_AFTER_EXTRUDER"
                    :target="currentToolSensorAfterExtruder"
                    :default-value="settingsToolSensorAfterExtruder"
                    :output-error-msg="true"
                    :has-spinner="true"
                    :spinner-factor="1"
                    :step="1"
                    :min="0"
                    :max="null"
                    :dec="0"
                    unit="mm"
                    class="w-100"
                    @submit="updateToolheadSensors" />
            </settings-row>
        </template>
        <v-divider class="my-3" />
        <settings-row :title="t('Panels.AfcPanel.SettingsDialog.SaveExtruderValues')" :sub-title="t('Panels.AfcPanel.SettingsDialog.SaveExtruderValuesDescription')">
            <v-btn :disabled="!enableSaveButton" color="primary" @click="saveExtruderValues">
                {{ t('Panels.AfcPanel.SettingsDialog.WriteToFile') }}
            </v-btn>
        </settings-row>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import NumberInput from '@/components/inputs/NumberInput.vue'
import { convertName } from '@/plugins/helpers'
import { useAfc } from '@/composables/useAfc'
import { useControl } from '@/composables/useControl'

const props = defineProps<{
    name: string
}>()

const { t } = useI18n()
const { getAfcExtruderSettings, getAfcExtruderObject, getAfcLaneObject } = useAfc()
const { doSend } = useControl()

const changedValue = ref(false)

const title = computed(() => {
    const name = convertName(props.name)

    return t('Panels.AfcPanel.SettingsDialog.SettingsForTitle', { name })
})

const afcSettingsExtruder = computed(() => getAfcExtruderSettings(props.name) as Record<string, any>)

const settingsToolStn = computed(() => afcSettingsExtruder.value.tool_stn || 0)

const settingsToolStnUnload = computed(() => afcSettingsExtruder.value.tool_stn_unload || 0)

const settingsToolSensorAfterExtruder = computed(() => afcSettingsExtruder.value.tool_sensor_after_extruder || 0)

const printerObject = computed(() => getAfcExtruderObject(props.name) as Record<string, any>)

const currentToolStn = computed(() => printerObject.value.tool_stn || 0)

const currentToolStnUnload = computed(() => printerObject.value.tool_stn_unload || 0)

const currentToolSensorAfterExtruder = computed(() => printerObject.value.tool_sensor_after_extruder || 0)

const lanes = computed<string[]>(() => printerObject.value.lanes ?? [])

const lane_loaded = computed(() => printerObject.value.lane_loaded ?? '')

const filledLanes = computed(() => {
    const filledLanes = []

    for (const lane of lanes.value) {
        const laneObject = getAfcLaneObject(lane) as { load?: boolean; prep?: boolean }

        if (laneObject?.load && laneObject?.prep) {
            filledLanes.push(lane)
        }
    }

    return filledLanes
})

const existsToolEndSensor = computed(() => 'pin_tool_end' in afcSettingsExtruder.value)

const toolStnSubTitle = computed(() => {
    if (existsToolEndSensor.value) {
        return t('Panels.AfcPanel.SettingsDialog.ToolStnDescriptionWithEndSensor')
    }

    if (afcSettingsExtruder.value.pin_tool_start === 'buffer') {
        return t('Panels.AfcPanel.SettingsDialog.ToolStnDescriptionWithRamming')
    }

    return t('Panels.AfcPanel.SettingsDialog.ToolStnDescriptionWithoutEndSensor')
})

const enableSaveButton = computed(() => {
    if (!changedValue.value) return false

    return currentToolStn.value !== settingsToolStn.value || currentToolStnUnload.value !== settingsToolStnUnload.value || currentToolSensorAfterExtruder.value !== settingsToolSensorAfterExtruder.value
})

function toggleLane(lane: string) {
    if (lane_loaded.value === lane) {
        doSend(`TOOL_UNLOAD LANE=${lane}`)

        return
    }

    doSend(`CHANGE_TOOL LANE=${lane}`)
}

function updateToolheadSensors(args: { name: string; value: number }) {
    changedValue.value = true
    doSend(`UPDATE_TOOLHEAD_SENSORS EXTRUDER=${props.name} ${args.name}=${args.value}`)
}

function saveExtruderValues() {
    changedValue.value = false
    const gcode = `SAVE_EXTRUDER_VALUES EXTRUDER=${props.name}`
    doSend(gcode)
}
</script>
