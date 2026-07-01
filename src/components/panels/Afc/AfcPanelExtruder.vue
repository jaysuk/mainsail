<template>
    <div class="rounded-lg grey border-1" :class="containerClasses">
        <v-row>
            <v-col class="pl-6 py-4 text-no-wrap">
                <v-tooltip location="top">
                    <template #activator="{ props: activatorProps }">
                        <span v-bind="activatorProps" class="sensor-status rounded-circle d-inline-block mr-2" :class="preSensorClasses" />
                    </template>
                    <span>{{ preSensorOutput }}</span>
                </v-tooltip>
                <span>{{ name }}</span>
                <v-tooltip v-if="hasPostSensor" location="top">
                    <template #activator="{ props: activatorProps }">
                        <span v-bind="activatorProps" class="sensor-status rounded-circle d-inline-block ml-2" :class="postSensorClasses" />
                    </template>
                    <span>{{ postSensorOutput }}</span>
                </v-tooltip>
            </v-col>
            <v-col class="py-4 text-center">{{ bufferOutput }}</v-col>
            <v-col class="py-4 pr-6 text-right">
                {{ state }}:
                <span :class="stateLaneClasses">{{ stateLane }}</span>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBase } from '@/composables/useBase'
import { useAfc } from '@/composables/useAfc'
import { useMainsailTheme } from '@/composables/useMainsailTheme'

const props = defineProps<{
    name: string
}>()

const { t } = useI18n()
const { printerIsPrintingOnly } = useBase()
const { afcCurrentLane, afcCurrentBuffer, afcCurrentState, afcErrorState, getAfcExtruderObject, getAfcExtruderSettings } = useAfc()
const { isDark } = useMainsailTheme()

const afcExtruder = computed(() => getAfcExtruderObject(props.name) as Record<string, any>)
const settings = computed(() => getAfcExtruderSettings(props.name) as Record<string, any>)

const useRamming = computed(() => {
    const toolStart = afcExtruder.value.tool_start ?? ''

    return toolStart === 'buffer'
})

const hasActiveLane = computed(() => {
    if (afcCurrentLane.value === null) return false

    const lanes = afcExtruder.value.lanes ?? []
    return lanes.includes((afcCurrentLane.value as { name?: string })?.name)
})

const containerClasses = computed(() => ({
    'border-primary': hasActiveLane.value,
    'border-error': hasActiveLane.value && afcErrorState.value,
    'darken-3': isDark.value,
    'lighten-2': !isDark.value,
}))

const rammingState = computed(() => {
    if (!useRamming.value) return false

    const extruder = (afcCurrentLane.value as { extruder?: string })?.extruder ?? ''
    const bufferState = ((afcCurrentBuffer.value as { state?: string })?.state ?? '').toLowerCase()

    return extruder === props.name && bufferState === 'trailing'
})

const laneLoaded = computed(() => afcExtruder.value.lane_loaded ?? '')

const preSensorStatus = computed(() => afcExtruder.value.tool_start_status ?? false)

const preSensorClasses = computed(() => {
    if (useRamming.value) {
        return {
            success: !laneLoaded.value && rammingState.value,
            error: !laneLoaded.value && !rammingState.value,
            'grey lighten4': !!laneLoaded.value,
        }
    }

    return {
        success: preSensorStatus.value,
        error: !preSensorStatus.value,
    }
})

const preSensorOutput = computed(() => {
    if (useRamming.value) {
        if (laneLoaded.value) return `${t('Panels.AfcPanel.RammingSensor')}`

        const status = rammingState.value ? t('Panels.AfcPanel.Detected') : t('Panels.AfcPanel.Empty')
        return `${t('Panels.AfcPanel.RammingSensor')} - ${status}`
    }

    const status = preSensorStatus.value ? t('Panels.AfcPanel.Detected') : t('Panels.AfcPanel.Empty')

    return `${t('Panels.AfcPanel.PreExtruderSensor')} - ${status}`
})

const hasPostSensor = computed(() => 'pin_tool_end' in settings.value)

const postSensorStatus = computed(() => afcExtruder.value.tool_end_status ?? false)

const postSensorClasses = computed(() => ({
    success: postSensorStatus.value,
    error: !postSensorStatus.value,
}))

const postSensorOutput = computed(() => {
    const status = postSensorStatus.value ? t('Panels.AfcPanel.Detected') : t('Panels.AfcPanel.Empty')

    return `${t('Panels.AfcPanel.PostExtruderSensor')} - ${status}`
})

const bufferOutput = computed(() => {
    const extruder = (afcCurrentLane.value as { extruder?: string })?.extruder ?? ''
    if (extruder !== props.name) return t('Panels.AfcPanel.BufferDisabled')

    return `${(afcCurrentLane.value as { buffer?: string })?.buffer ?? '--'}: ${(afcCurrentBuffer.value as { state?: string })?.state ?? '--'}`
})

const state = computed(() => {
    const extruder = (afcCurrentLane.value as { extruder?: string })?.extruder ?? ''
    if (extruder === props.name) {
        if (printerIsPrintingOnly.value) return t('Panels.AfcPanel.Printing')

        return t(`Panels.AfcPanel.${afcCurrentState.value}`)
    }

    return t('Panels.AfcPanel.Idle')
})

const stateLane = computed(() => {
    if (afcExtruder.value.lane_loaded) return afcExtruder.value.lane_loaded
    if (afcCurrentLane.value) return (afcCurrentLane.value as { name?: string }).name

    return t('Panels.AfcPanel.LaneLoadedNone')
})

const stateLaneClasses = computed(() => ({
    'text-primary': hasActiveLane.value,
    'text-error': hasActiveLane.value && afcErrorState.value,
}))
</script>

<style scoped>
.sensor-status {
    width: 10px;
    height: 10px;
}

.border-1 {
    border-width: 1px;
    border-style: solid;
}

.v-application .border-primary {
    border-color: rgb(var(--v-theme-primary)) !important;
}

.v-application .border-error {
    border-color: rgb(var(--v-theme-error)) !important;
}
</style>
