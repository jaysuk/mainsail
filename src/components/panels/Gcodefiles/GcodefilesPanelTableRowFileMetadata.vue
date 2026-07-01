<template>
    <td :class="tdClass">{{ value }}</td>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { tableColumnSetting } from '@/composables/useGcodefiles'
import type { FileStateGcodefile } from '@/store/files/types'
import { formatFilesize, formatPrintTime } from '@/plugins/helpers'
import { useBase } from '@/composables/useBase'

const props = defineProps<{
    item: FileStateGcodefile
    col: tableColumnSetting
}>()

const { formatDateTime } = useBase()

const tdClass = computed(() => (props.col.outputType !== 'date' ? 'text-no-wrap' : ''))

const value = computed(() => {
    const value = props.col.value in props.item ? (props.item as unknown as Record<string, unknown>)[props.col.value] : null

    if (value === null || value === undefined) return '--'

    switch (props.col.outputType) {
        case 'filesize':
            return formatFilesize(value as number)

        case 'date':
            return formatDateTime(value as number)

        case 'time':
            return formatPrintTime(value as number)

        case 'temp':
            return (value as number).toFixed() + ' °C'

        case 'length':
            if ((value as number) > 1000) return ((value as number) / 1000).toFixed(2) + ' m'

            return (value as number).toFixed(2) + ' mm'

        case 'weight':
            return (value as number).toFixed(2) + ' g'

        default:
            return value
    }
})
</script>
