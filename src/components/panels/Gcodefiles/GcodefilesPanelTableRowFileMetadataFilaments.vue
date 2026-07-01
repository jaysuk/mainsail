<template>
    <td class="text-no-wrap">
        <div class="d-flex align-center">
            <gcodefiles-panel-table-row-file-metadata-filaments-badge v-for="(filament, index) in filaments" :key="index" :filament="filament" />
        </div>
    </td>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileStateGcodefile, FileStateGcodefileFilament } from '@/store/files/types'
import { convertStringToArray } from '@/plugins/helpers'
import GcodefilesPanelTableRowFileMetadataFilamentsBadge from '@/components/panels/Gcodefiles/GcodefilesPanelTableRowFileMetadataFilamentsBadge.vue'

const props = defineProps<{ item: FileStateGcodefile }>()

const filament_colors = computed(() => props.item.filament_colors ?? [])

const filament_types = computed(() => convertStringToArray(props.item.filament_type ?? ''))

const filament_weights = computed(() => props.item.filament_weights ?? [])

const filament_weights_exists = computed(() => 'filament_weights' in props.item && filament_weights.value.length > 0)

const filament_names = computed(() => convertStringToArray(props.item.filament_name ?? ''))

const filaments = computed<FileStateGcodefileFilament[]>(() => {
    if (!filament_weights_exists.value && filament_names.value.length === 1 && filament_types.value.length === 1) {
        return [
            {
                color: '#666',
                name: filament_names.value[0] ?? '--',
                type: filament_types.value[0] ?? '--',
                weight: props.item.filament_weight_total ?? 0,
            },
        ]
    }

    return filament_weights.value
        .map((weight, index) => {
            return {
                color: filament_colors.value[index] ?? '#000000',
                name: filament_names.value[index] ?? '--',
                type: filament_types.value[index] ?? '--',
                weight: weight,
            }
        })
        .filter((filament) => filament.weight > 0)
})
</script>
