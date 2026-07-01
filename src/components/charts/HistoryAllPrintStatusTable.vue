<template>
    <v-table>
        <tbody>
            <history-all-print-status-table-item v-for="status in printStatusArrayChart" :key="status.name" :item="status" :value-name="valueName" />
        </tbody>
    </v-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HistoryAllPrintStatusTableItem from '@/components/charts/HistoryAllPrintStatusTableItem.vue'
import type { HistoryStatsValueNames } from '@/store/server/history/types'
import { useHistoryStats } from '@/composables/useHistoryStats'

const props = withDefaults(
    defineProps<{
        valueName?: HistoryStatsValueNames
    }>(),
    { valueName: 'amount' }
)

const { printStatusArrayChart } = useHistoryStats(computed(() => props.valueName))
</script>
