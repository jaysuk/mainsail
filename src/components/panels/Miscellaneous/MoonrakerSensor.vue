<template>
    <v-container class="px-0 py-2">
        <v-row>
            <v-col class="pb-3">
                <v-list-subheader class="mb-1 d-block _moonraker-sensor-subheader">
                    {{ displayName }}
                </v-list-subheader>
                <v-list-subheader class="d-block _moonraker-sensor-subheader">
                    <moonraker-sensor-value v-for="(valueName, index) of valueNames" :key="'moonraker_sensor_value_' + index" :sensor="name" :value-name="valueName" />
                </v-list-subheader>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { convertName } from '@/plugins/helpers'
import MoonrakerSensorValue from '@/components/panels/Miscellaneous/MoonrakerSensorValue.vue'
import { useServerSensorStore } from '@/store/server/sensor'

const props = defineProps<{ name: string }>()

const serverSensorStore = useServerSensorStore()

const sensor = computed(() => {
    const sensors = serverSensorStore.sensors
    if (!(props.name in sensors)) return undefined

    return sensors[props.name]
})

const displayName = computed(() => {
    // If the friendly name is the same as the sensor name, then it hasn't been customized in the config
    // this is the fallback value in Moonraker, so we convert the sensor name to a more user-friendly format
    if (sensor.value === undefined || sensor.value?.friendly_name === props.name) {
        return convertName(props.name)
    }

    return sensor.value?.friendly_name
})

const valueNames = computed(() => Object.keys(sensor.value?.values ?? {}))
</script>

<style scoped>
._moonraker-sensor-subheader {
    height: auto;
}
</style>
