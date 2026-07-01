<template>
    <v-list-item>
        <v-row>
            <v-col class="col-auto px-0">
                <v-icon class="handle pr-2">{{ mdiDragVertical }}</v-icon>
                <v-icon>{{ icon }}</v-icon>
            </v-col>
            <v-col class="pr-0 text-truncate">
                {{ panelname }}
            </v-col>
            <v-col class="col-auto pl-2">
                <v-icon :color="checkboxColor" @click.stop="emit('change-visible', name, !visible)">{{ checkboxIcon }}</v-icon>
            </v-col>
        </v-row>
    </v-list-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiCheckboxBlankOutline, mdiCheckboxMarked, mdiDragVertical } from '@mdi/js'
import { useDashboard } from '@/composables/useDashboard'

const props = defineProps<{
    name: string
    visible: boolean
}>()

const emit = defineEmits<{
    'change-visible': [name: string, visible: boolean]
}>()

const { getPanelName, convertPanelnameToIcon } = useDashboard()

const panelname = computed(() => getPanelName(props.name))

const icon = computed(() => convertPanelnameToIcon(props.name))

const checkboxColor = computed(() => {
    if (props.visible) return 'primary'

    return 'grey-lighten-1'
})

const checkboxIcon = computed(() => {
    if (props.visible) return mdiCheckboxMarked

    return mdiCheckboxBlankOutline
})
</script>

<style scoped>
.handle {
    cursor: move;
}
</style>
