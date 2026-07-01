<template>
    <div>
        <v-card-text>
            <h3 class="text-h5 mb-3">{{ t('Settings.NavigationTab.Navigation') }}</h3>
            <draggable v-model="sortableNaviPoints" handle=".handle" ghost-class="ghost" group="navigation-points" :force-fallback="true">
                <template #item="{ element }">
                    <settings-navigation-tab-item class="my-2 mx-0" :style="draggableBgStyle" :navi-point="element" />
                </template>
            </draggable>
        </v-card-text>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import draggable from 'vuedraggable'
import SettingsNavigationTabItem from '@/components/settings/SettingsNavigationTabItem.vue'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { useNavigation, type NaviPoint } from '@/composables/useNavigation'
import { useGuiNavigationStore } from '@/store/gui/navigation'

const { t } = useI18n()
const { draggableBgStyle } = useMainsailTheme()
const { naviPoints } = useNavigation()
const guiNavigationStore = useGuiNavigationStore()

const sortableNaviPoints = computed<NaviPoint[]>({
    get: () => naviPoints.value.filter((naviPoint) => naviPoint.position > 0),
    set: (newVal) => {
        // update store with new positions
        newVal.forEach((naviPoint, index) => {
            guiNavigationStore.updatePos({
                type: naviPoint.type,
                title: naviPoint.orgTitle ?? naviPoint.title,
                visible: naviPoint.visible,
                position: index + 1,
            })
        })

        // upload to moonraker db
        guiNavigationStore.upload()
    },
})
</script>
