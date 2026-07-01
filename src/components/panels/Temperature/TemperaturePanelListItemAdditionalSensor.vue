<template>
    <div>
        <temperature-panel-list-item-additional-sensor-value v-for="keyName of additionalValues" :key="keyName" :printer-object="printerObject" :object-name="objectName" :sensor-type="sensorType" :key-name="keyName" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TemperaturePanelListItemAdditionalSensorValue from '@/components/panels/Temperature/TemperaturePanelListItemAdditionalSensorValue.vue'
import { usePrinterStore } from '@/store/printer'

const props = defineProps<{
    objectName: string
    additionalObjectName: string
}>()

const printerStore = usePrinterStore()

const printerObject = computed(() => {
    if (!(props.additionalObjectName in printerStore)) return {}

    return printerStore[props.additionalObjectName]
})

const additionalValues = computed(() => {
    if (props.objectName === 'z_thermal_adjust') return ['current_z_adjust']

    return Object.keys(printerObject.value).filter((key) => key !== 'temperature')
})

const sensorType = computed(() => props.additionalObjectName.split(' ')[0])
</script>
