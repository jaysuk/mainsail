<template>
    <v-card-text class="py-3 px-0 bt-1">
        <start-print-dialog-afc-tool v-for="(tool, index) in usedTools" :key="tool" :file="file" :tool-index="tool" :border-top="index > 0" />
    </v-card-text>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileStateGcodefile } from '@/store/files/types'
import StartPrintDialogAfcTool from '@/components/dialogs/StartPrintDialogAfcTool.vue'

const props = defineProps<{
    file: FileStateGcodefile
}>()

const usedTools = computed(() => {
    const filamentWeights = props.file.filament_weights ?? []

    const usedTools: number[] = []
    filamentWeights.forEach((weight, index) => {
        if (weight > 0) usedTools.push(index)
    })

    return usedTools
})
</script>
