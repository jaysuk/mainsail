<template>
    <g v-if="hasSensor">
        <circle cx="258" :cy="yPosition" r="8" stroke-width="1" :class="circleClass" />
        <text x="278" :y="yPosition + 5" :class="textClass">{{ sensorText }}</text>
        <transition name="fade">
            <text v-if="homedTo" x="219.5" :y="yPosition + 5" font-weight="bold">H</text>
        </transition>
    </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMmu, FILAMENT_POS_HOMED_ENTRY, FILAMENT_POS_HOMED_GATE, FILAMENT_POS_HOMED_TS, type Mmu } from '@/composables/useMmu'

const props = withDefaults(
    defineProps<{
        sensorName: keyof Mmu['sensors']
        sensorText: string
        yPosition: number
        outsideZone?: boolean
    }>(),
    {
        outsideZone: false,
    }
)

const { mmuFilamentPos, configGateHomingEndstop, hasMmuSensor, getMmuSensor } = useMmu()

const hasSensor = computed(() => hasMmuSensor(props.sensorName))

const sensorStatus = computed(() => getMmuSensor(props.sensorName))

const circleClass = computed(() => ({
    'sensor-disabled': sensorStatus.value === null,
    'sensor-triggered': sensorStatus.value === true,
    'sensor-open': sensorStatus.value === false,
    'outside-zone': props.outsideZone,
}))

const textClass = computed(() => ({
    'text-disabled': sensorStatus.value === null,
}))

const homedTo = computed(() => {
    if (props.sensorName === 'extruder') return mmuFilamentPos.value === FILAMENT_POS_HOMED_ENTRY
    if (props.sensorName === 'toolhead') return mmuFilamentPos.value === FILAMENT_POS_HOMED_TS

    if (!['mmu_gear', 'mmu_gate'].includes(props.sensorName)) return false

    return configGateHomingEndstop.value === props.sensorName && mmuFilamentPos.value === FILAMENT_POS_HOMED_GATE
})
</script>

<style scoped>
text {
    fill: currentColor;
}

.text-disabled {
    opacity: 0.5;
}

.sensor-triggered {
    fill: limegreen;
}

.sensor-disabled {
    stroke: var(--disabled-stroke);
    stroke-dasharray: 2, 1;
    fill: var(--zone-background-dark-theme);
}

html.theme--light .sensor-disabled {
    fill: var(--zone-background-light-theme);
}

.sensor-open {
    fill: var(--zone-background-dark-theme);
}

html.theme--light .sensor-open {
    fill: var(--zone-background-light-theme);
}

.sensor-disabled.outside-zone {
    fill: var(--background-dark-theme);
}

html.theme--light .sensor-disabled.outside-zone {
    fill: var(--background-light-theme);
}

.sensor-open.outside-zone {
    fill: var(--background-dark-theme);
}

html.theme--light .sensor-open.outside-zone {
    fill: var(--background-light-theme);
}
</style>
