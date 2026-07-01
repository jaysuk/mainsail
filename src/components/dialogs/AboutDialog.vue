<template>
    <v-tooltip location="right" color="panel">
        <template #activator="{ props: activatorProps }">
            <v-icon v-bind="activatorProps">
                {{ mdiHelpCircleOutline }}
            </v-icon>
        </template>
        <v-container class="version-container pa-0">
            <div><img height="12" src="/img/logo.svg" alt="mainsail-logo" /></div>
            <div>v{{ mainsailVersion }}</div>
            <div>
                <v-icon size="small" class="moonraker-logo">{{ mdiMoonWaningCrescent }}</v-icon>
            </div>
            <div>{{ moonrakerVersion }}</div>
            <div><img height="12" src="/img/klipper.svg" class="klipper-logo" alt="klipper-logo" /></div>
            <div>{{ klipperVersion }}</div>
        </v-container>
    </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiHelpCircleOutline, mdiMoonWaningCrescent } from '@mdi/js'
import { useRootStore } from '@/store/index'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'

const rootStore = useRootStore()
const printerStore = usePrinterStore()
const serverStore = useServerStore()

const mainsailVersion = computed<string>(() => rootStore.getVersion)

const klipperVersion = computed<string>(() => printerStore.software_version ?? '')

const moonrakerVersion = computed<string>(() => serverStore.moonraker_version ?? '')
</script>

<style scoped>
.klipper-logo {
    transform: rotate(90deg);
}
.moonraker-logo {
    transform: rotate(45deg);
    color: #ebc815;
}
.version-container {
    display: grid;
    grid-template-columns: 20px auto;
}
</style>
