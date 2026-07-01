<template>
    <td class="text-no-wrap">{{ values.join(', ') }}</td>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileStateGcodefile } from '@/store/files/types'

const props = defineProps<{
    item: FileStateGcodefile
    column: string
}>()

const value = computed(() => (props.item as unknown as Record<string, unknown>)[props.column] ?? null)

const values = computed(() => String(value.value ?? '').replace(/"/g, '').split(';'))
</script>
