<template>
    <text x="228" y="412" font-size="11px" font-weight="bold" text-anchor="end" :class="temperatureClass">
        {{ temperatureText }}
    </text>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePrinterStore } from '@/store/printer'

const printerStore = usePrinterStore()

const temperatureClass = computed(() => {
    const canExtrude = printerStore.extruder?.can_extrude ?? false

    return {
        'text-disabled': !canExtrude,
    }
})

const temperatureText = computed(() => {
    const extTemp = printerStore.extruder?.temperature ?? null

    return extTemp ? `${extTemp.toFixed(0)}°C` : ''
})
</script>
