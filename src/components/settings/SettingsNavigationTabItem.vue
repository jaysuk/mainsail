<template>
    <v-row class="my-2 mx-0" :style="draggableBgStyle">
        <v-col class="col-auto pr-0 d-flex py-2">
            <v-icon class="handle">{{ mdiDragVertical }}</v-icon>
        </v-col>
        <v-col class="py-2">
            <settings-row :title="title" :sub-title="subtitle" :dynamic-slot-width="true">
                <v-icon :color="checkboxColor" @click="changeVisibility">{{ checkboxIcon }}</v-icon>
            </settings-row>
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiDragVertical, mdiCheckboxMarked, mdiCheckboxBlankOutline } from '@mdi/js'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { useGuiNavigationStore } from '@/store/gui/navigation'
import type { NaviPoint } from '@/composables/useNavigation'

const props = defineProps<{
    naviPoint: NaviPoint
}>()

const { draggableBgStyle } = useMainsailTheme()
const guiNavigationStore = useGuiNavigationStore()

const title = computed(() => props.naviPoint.title)

const subtitle = computed(() => {
    if (props.naviPoint.type === 'link') return `URL: ${props.naviPoint.href ?? 'Unknown'}`

    return undefined
})

const checkboxColor = computed(() => (props.naviPoint.visible ? 'primary' : 'grey-lighten-1'))

const checkboxIcon = computed(() => (props.naviPoint.visible ? mdiCheckboxMarked : mdiCheckboxBlankOutline))

function changeVisibility() {
    guiNavigationStore.changeVisibility(props.naviPoint)
}
</script>
