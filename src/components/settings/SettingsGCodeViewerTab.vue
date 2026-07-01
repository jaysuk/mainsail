<template>
    <div>
        <v-card flat>
            <v-card-text>
                <settings-row :title="t('Settings.GCodeViewerTab.ShowAxes')">
                    <v-switch v-model="showAxes" class="mt-0" hide-details />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GCodeViewerTab.BackgroundColor')">
                    <v-menu :close-on-content-click="false" location="bottom start">
                        <template #activator="{ props: activatorProps }">
                            <v-btn :color="backgroundColor" class="minwidth-0 px-5" size="small" v-bind="activatorProps" />
                        </template>
                        <v-color-picker :model-value="backgroundColor" hide-mode-switch mode="rgba" @update:model-value="updateColorValue('backgroundColor', $event)" />
                    </v-menu>
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GCodeViewerTab.GridColor')">
                    <v-menu :close-on-content-click="false" location="bottom start">
                        <template #activator="{ props: activatorProps }">
                            <v-btn :color="gridColor" class="minwidth-0 px-5" size="small" v-bind="activatorProps" />
                        </template>
                        <v-color-picker :model-value="gridColor" hide-mode-switch mode="rgba" @update:model-value="updateColorValue('gridColor', $event)" />
                    </v-menu>
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GCodeViewerTab.ProgressColor')">
                    <v-menu :close-on-content-click="false" location="bottom start">
                        <template #activator="{ props: activatorProps }">
                            <v-btn :color="progressColor" class="minwidth-0 px-5" size="small" v-bind="activatorProps" />
                        </template>
                        <v-color-picker :model-value="progressColor" hide-mode-switch mode="rgba" @update:model-value="updateColorValue('progressColor', $event)" />
                    </v-menu>
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GCodeViewerTab.ExtruderColor')">
                    <v-row no-gutters>
                        <v-menu v-for="(extruderColor, index) in extruderColors" :key="index" :close-on-content-click="false" location="bottom start">
                            <template #activator="{ props: activatorProps }">
                                <v-col align="right" class="mt-1" cols="12">
                                    <span class="mr-2">{{ index }}</span>
                                    <v-btn :color="extruderColor" class="minwidth-0 px-5" size="small" v-bind="activatorProps" />
                                </v-col>
                            </template>
                            <v-color-picker :model-value="extruderColor" hide-mode-switch mode="rgba" @update:model-value="colorsUpdated($event, index)" />
                        </v-menu>
                    </v-row>
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GCodeViewerTab.MinFeed')">
                    <v-menu :close-on-content-click="false" location="bottom start">
                        <template #activator="{ props: activatorProps }">
                            <v-btn :color="minFeedColor" class="minwidth-0 px-5 mr-3" size="small" v-bind="activatorProps" />
                        </template>
                        <v-color-picker :model-value="minFeedColor" hide-mode-switch mode="rgba" @update:model-value="updateColorValue('minFeedColor', $event)" />
                    </v-menu>
                    <v-text-field v-model="minFeed" :rules="[(v: number) => v > 0 || 'Minimum speed is 1']" density="compact" hide-details="auto" variant="outlined" suffix="mm/s" type="number" hide-spin-buttons @blur="feedBlur" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GCodeViewerTab.MaxFeed')">
                    <v-menu :close-on-content-click="false" location="bottom start">
                        <template #activator="{ props: activatorProps }">
                            <v-btn :color="maxFeedColor" class="minwidth-0 px-5 mr-3" size="small" v-bind="activatorProps" />
                        </template>
                        <v-color-picker :model-value="maxFeedColor" hide-mode-switch mode="rgba" @update:model-value="updateColorValue('maxFeedColor', $event)" />
                    </v-menu>
                    <v-text-field v-model="maxFeed" :rules="[(v: number) => v > 0 || 'Minimum speed is 1']" density="compact" hide-details="auto" variant="outlined" suffix="mm/s" type="number" hide-spin-buttons @blur="feedBlur" />
                </settings-row>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { clearColorObject, type ColorPickerValue } from '@/plugins/helpers'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const guiStore = useGuiStore()

let colorDebounceTimer: ReturnType<typeof setTimeout> | undefined
let colorsDebounceTimer: ReturnType<typeof setTimeout> | undefined

const showAxes = computed({
    get: () => guiStore.gcodeViewer.showAxes,
    set: (newVal: boolean) => guiStore.saveSetting({ name: 'gcodeViewer.showAxes', value: newVal }),
})

const extruderColors = computed(() => guiStore.gcodeViewer.extruderColors)

function colorsUpdated(value: ColorPickerValue, index: number) {
    if (colorsDebounceTimer) clearTimeout(colorsDebounceTimer)
    colorsDebounceTimer = setTimeout(() => {
        const colors = [...extruderColors.value]
        colors[index] = clearColorObject(value)
        guiStore.saveSetting({ name: 'gcodeViewer.extruderColors', value: colors })
    }, 500)
}

const backgroundColor = computed({
    get: () => guiStore.gcodeViewer.backgroundColor,
    set: (newVal: string) => guiStore.saveSetting({ name: 'gcodeViewer.backgroundColor', value: newVal }),
})

const gridColor = computed({
    get: () => guiStore.gcodeViewer.gridColor,
    set: (newVal: string) => guiStore.saveSetting({ name: 'gcodeViewer.gridColor', value: newVal }),
})

const progressColor = computed({
    get: () => guiStore.gcodeViewer.progressColor,
    set: (newVal: string) => guiStore.saveSetting({ name: 'gcodeViewer.progressColor', value: newVal }),
})

const minFeedColor = computed({
    get: () => guiStore.gcodeViewer.minFeedColor,
    set: (newVal: string) => guiStore.saveSetting({ name: 'gcodeViewer.minFeedColor', value: newVal }),
})

const maxFeedColor = computed({
    get: () => guiStore.gcodeViewer.maxFeedColor,
    set: (newVal: string) => guiStore.saveSetting({ name: 'gcodeViewer.maxFeedColor', value: newVal }),
})

function updateColorValue(colorElement: 'backgroundColor' | 'gridColor' | 'progressColor' | 'minFeedColor' | 'maxFeedColor', newVal: ColorPickerValue) {
    if (colorDebounceTimer) clearTimeout(colorDebounceTimer)
    colorDebounceTimer = setTimeout(() => {
        guiStore.saveSetting({ name: 'gcodeViewer.' + colorElement, value: clearColorObject(newVal) })
    }, 500)
}

const minFeed = computed({
    get: () => guiStore.gcodeViewer.minFeed,
    set: (newVal: number) => guiStore.saveSetting({ name: 'gcodeViewer.minFeed', value: newVal }),
})

const maxFeed = computed({
    get: () => guiStore.gcodeViewer.maxFeed,
    set: (newVal: number) => guiStore.saveSetting({ name: 'gcodeViewer.maxFeed', value: newVal }),
})

function feedBlur() {
    if (minFeed.value < 1) minFeed.value = 1
    if (maxFeed.value < minFeed.value) maxFeed.value = minFeed.value + 1
}
</script>
