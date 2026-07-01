<template>
    <v-container class="px-0 py-2">
        <v-row>
            <v-col class="pb-3">
                <v-list-subheader class="_filamentRunout-subheader">
                    <v-icon size="small" class="mr-2">{{ mdiPrinter3dNozzleAlert }}</v-icon>
                    <span>{{ convertName(name) }}</span>
                    <v-spacer />
                    <small :class="'mr-3 text-' + statusColor">{{ statusText }}</small>
                    <v-icon @click="changeSensor">
                        {{ enabled ? mdiToggleSwitch : mdiToggleSwitchOffOutline }}
                    </v-icon>
                </v-list-subheader>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { convertName } from '@/plugins/helpers'
import { mdiPrinter3dNozzleAlert, mdiToggleSwitch, mdiToggleSwitchOffOutline } from '@mdi/js'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const props = defineProps<{
    type: string
    name: string
    enabled: boolean
    filament_detected: boolean
    filament_diameter?: number
}>()

const { t } = useI18n()

const statusColor = computed(() => {
    if (!props.enabled) return 'gray'
    else if (props.filament_detected) return 'success'

    return 'warning'
})

const statusText = computed(() => {
    if (props.filament_diameter !== undefined && props.filament_detected) {
        return props.filament_diameter.toPrecision(3) + 'mm'
    }
    if (props.filament_detected) return t('Panels.MiscellaneousPanel.RunoutSensor.Detected')

    return t('Panels.MiscellaneousPanel.RunoutSensor.Empty')
})

function changeSensor() {
    const gcodes = ['SET_FILAMENT_SENSOR SENSOR=' + props.name + ' ENABLE=' + (props.enabled ? 0 : 1)]
    if (props.type == 'hall_filament_width_sensor') {
        gcodes.push((props.enabled ? 'DIS' : 'EN') + 'ABLE_FILAMENT_WIDTH_SENSOR')
    }
    for (const gcode of gcodes) {
        useServerStore().addEvent({ message: gcode, type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: gcode })
    }
}
</script>

<style scoped>
._filamentRunout-subheader {
    height: auto;
}
</style>
