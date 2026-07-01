<template>
    <div>
        <template v-if="['printing', 'paused', 'error', 'cancelled'].includes(printer_state)">
            <status-panel-printstatus-printing />
        </template>
        <template v-if="['complete'].includes(printer_state)">
            <status-panel-printstatus-complete />
        </template>
    </div>
</template>

<script setup lang="ts">
import StatusPanelPrintstatusPrinting from '@/components/panels/Status/PrintstatusPrinting.vue'
import StatusPanelPrintstatusComplete from '@/components/panels/Status/PrintstatusComplete.vue'
import { useBase } from '@/composables/useBase'

const { printer_state } = useBase()
</script>
