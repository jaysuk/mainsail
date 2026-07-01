<template>
    <tr>
        <td>{{ item.displayName }}</td>
        <td class="text-right">{{ value }}</td>
    </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HistoryStatsValueNames, ServerHistoryStateAllPrintStatusEntry } from '@/store/server/history/types'
import { formatPrintTime } from '@/plugins/helpers'

const props = withDefaults(
    defineProps<{
        item: ServerHistoryStateAllPrintStatusEntry
        valueName?: HistoryStatsValueNames
    }>(),
    { valueName: 'amount' }
)

const value = computed(() => {
    if (props.valueName === 'filament') {
        if (props.item.value > 1000) return Math.round(props.item.value / 1000).toFixed(2) + ' m'

        return props.item.value.toFixed(0) + ' mm'
    }

    if (props.valueName === 'time') {
        return formatPrintTime(props.item.value, false)
    }

    return props.item.value.toString()
})
</script>
