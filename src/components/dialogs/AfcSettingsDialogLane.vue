<template>
    <div>
        <h3 class="text-h5 mb-3 mt-5">{{ title }}</h3>

        <settings-row :title="t('Panels.AfcPanel.SettingsDialog.DistHub')" :sub-title="t('Panels.AfcPanel.SettingsDialog.DistHubDescription')">
            <number-input
                label="dist_hub"
                param="LENGTH"
                :target="currentDistHub"
                :default-value="settingsDistHub"
                :output-error-msg="true"
                :has-spinner="true"
                :spinner-factor="1"
                :step="1"
                :min="0"
                :max="null"
                :dec="0"
                unit="mm"
                class="w-100"
                @submit="setHubDist" />
        </settings-row>
        <v-divider class="my-3" />
        <settings-row :title="t('Panels.AfcPanel.SettingsDialog.SaveHubDist')" :sub-title="t('Panels.AfcPanel.SettingsDialog.SaveHubDistDescription')">
            <v-btn :disabled="!enableSaveButton" color="primary" @click="saveHubDist">
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
const { getAfcLaneSettings, getAfcLaneObject } = useAfc()
const { doSend } = useControl()

const changedValue = ref(false)

const title = computed(() => {
    const name = convertName(props.name)

    return t('Panels.AfcPanel.SettingsDialog.SettingsForTitle', { name })
})

const afcSettingsLane = computed(() => getAfcLaneSettings(props.name) as Record<string, any>)

const afcLane = computed(() => getAfcLaneObject(props.name) as Record<string, any>)

const settingsDistHub = computed(() => afcSettingsLane.value.dist_hub || 0)

const currentDistHub = computed(() => afcLane.value.dist_hub || 0)

const enableSaveButton = computed(() => {
    if (!changedValue.value) return false

    return currentDistHub.value !== settingsDistHub.value
})

function setHubDist(args: { name: string; value: number }) {
    changedValue.value = true
    doSend(`SET_HUB_DIST LANE=${props.name} ${args.name}=${args.value}`)
}

function saveHubDist() {
    changedValue.value = false
    const gcode = `SAVE_HUB_DIST LANE=${props.name}`
    doSend(gcode)
}
</script>
