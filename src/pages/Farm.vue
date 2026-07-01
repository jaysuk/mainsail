<template>
    <v-row>
        <v-col v-for="(printer, key) in printers" :key="key" class="col-12 col-sm-6 col-md-4 pb-0">
            <farm-printer-panel :printer="printer" />
        </v-col>
    </v-row>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import FarmPrinterPanel from '@/components/panels/FarmPrinterPanel.vue'
import { useFarmStore } from '@/store/farm'

const farmStore = useFarmStore()

const printers = computed(() => farmStore.getPrinters)
</script>
