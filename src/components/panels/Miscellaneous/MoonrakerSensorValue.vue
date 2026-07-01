<template>
    <div class="d-flex w-100 flex-row align-center">
        <v-icon size="small" start>{{ unitToSymbol((unit ?? '') as string) }}</v-icon>
        <span class="flex-grow-1">{{ name }}:</span>
        <span>{{ output }}</span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { convertName, unitToSymbol } from '@/plugins/helpers'
import { useServerStore } from '@/store/server'
import { useServerSensorStore } from '@/store/server/sensor'

const props = defineProps<{
    sensor: string
    valueName: string
}>()

const serverStore = useServerStore()
const serverSensorStore = useServerSensorStore()

const sensorData = computed(() => {
    const sensors = serverSensorStore.sensors
    if (!(props.sensor in sensors)) return {}

    return sensors[props.sensor].values
})

const sensorConfig = computed(() => {
    const name = `sensor ${props.sensor}`
    const serverConfig = serverStore.config?.config ?? {}
    if (!(name in serverConfig)) return {}

    return serverConfig[name]
})

const parameterConfig = computed(() => {
    const name = `parameter_${props.valueName}`
    if (!(name in sensorConfig.value)) return {}

    return sensorConfig.value[name]
})

const unit = computed(() => {
    if (!('units' in parameterConfig.value)) return null

    return parameterConfig.value.units
})

const value = computed(() => {
    if (!(props.valueName in sensorData.value)) return '--'

    return Math.round(sensorData.value[props.valueName] * 1000) / 1000
})

const output = computed(() => {
    if (unit.value === null) return value.value

    return `${value.value} ${unit.value}`
})

const name = computed(() => convertName(props.valueName))
</script>
