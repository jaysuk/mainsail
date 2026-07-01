<template>
    <v-row class="flex-grow-0">
        <v-col class="px-6 pt-6 pb-3 py-4">
            <v-btn density="compact" size="small" class="w-100 elevation-0" @click="showDialog = true"> {{ mappedTool }} > {{ name }} </v-btn>
            <afc-unit-lane-mapping-tool-dialog v-model="showDialog" :name="name" />
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AfcUnitLaneMappingToolDialog from '@/components/dialogs/AfcUnitLaneMappingToolDialog.vue'
import { useAfc } from '@/composables/useAfc'

const props = defineProps<{
    name: string
}>()

const { getAfcLaneObject } = useAfc()

const showDialog = ref(false)

const lane = computed(() => getAfcLaneObject(props.name) as Record<string, any>)

const mappedTool = computed(() => {
    const map = lane.value.map
    if (!map || map.length === 0) return 'NONE'

    return Array.isArray(map) ? map.join(', ') : map
})
</script>
