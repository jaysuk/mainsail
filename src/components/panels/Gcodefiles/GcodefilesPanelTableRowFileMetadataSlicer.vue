<template>
    <td class="text-no-wrap">
        {{ item.slicer }}
        <template v-if="item.slicer_version">
            <br />
            <small>{{ item.slicer_version }}</small>
        </template>
    </td>
</template>

<script setup lang="ts">
import type { FileStateGcodefile } from '@/store/files/types'

defineProps<{ item: FileStateGcodefile }>()
</script>
