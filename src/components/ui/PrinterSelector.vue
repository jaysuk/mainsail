<template>
    <v-menu location="bottom end">
        <template #activator="{ props: activatorProps }">
            <v-icon class="nav-arrow right" v-bind="activatorProps">{{ mdiChevronDown }}</v-icon>
        </template>

        <v-list density="compact">
            <v-list-item
                v-for="(printer, namespace) in printers"
                :key="namespace"
                :disabled="!printer.socket.isConnected"
                link
                @click="changePrinter(printer)">
                <v-list-item-title>{{ getPrinterName(printer._namespace) }}</v-list-item-title>
                <v-list-item-subtitle>{{ getPrinterDescription(printer) }}</v-list-item-subtitle>
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiChevronDown } from '@mdi/js'
import { useFarmStore } from '@/store/farm'
import { useFarmPrinterStore } from '@/store/farm/printer'
import { useRootStore } from '@/store'
import type { FarmPrinterState } from '@/store/farm/printer/types'

const farmStore = useFarmStore()
const rootStore = useRootStore()

const printers = computed(() => farmStore.getPrinters)

function getPrinterName(namespace: string) {
    return useFarmPrinterStore(namespace).getPrinterName
}

function getPrinterDescription(printer: FarmPrinterState) {
    return useFarmPrinterStore(printer._namespace).getStatus
}

function changePrinter(printer: FarmPrinterState) {
    if (printer.socket.isConnected) {
        rootStore.changePrinter({ printer: printer._namespace })
    }
}
</script>
