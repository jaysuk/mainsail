<template>
    <v-tooltip location="top">
        <template #activator="{ props: activatorProps }">
            <div class="d-flex flex-column align-center mx-1" v-bind="activatorProps">
                <v-chip :color="filament.color" size="x-small" :style="chipStyle" class="chip">{{ weight }}</v-chip>
                <small class="type mt-1">{{ filament.type }}</small>
            </div>
        </template>
        <span>{{ filament.name }}</span>
    </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileStateGcodefileFilament } from '@/store/files/types'
import { filamentTextColor, filamentWeightFormat } from '@/plugins/helpers'

const props = defineProps<{ filament: FileStateGcodefileFilament }>()

const weight = computed(() => filamentWeightFormat(props.filament.weight ?? 0))

const fontColor = computed(() => filamentTextColor(props.filament.color))

const chipStyle = computed(() => ({
    color: fontColor.value,
}))
</script>

<style scoped>
.chip {
    font-size: 0.7rem;
    cursor: pointer;
}

.type {
    line-height: 1;
}
</style>
