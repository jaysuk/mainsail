<template>
    <div>
        <v-card flat>
            <v-card-text>
                <div class="d-flex align-center">
                    <v-icon style="opacity: 0.7">{{ mdiGrid }}</v-icon>
                    <v-card-title class="mx-n2">
                        {{ t('Settings.HeightmapTab.Heightmap') }}
                    </v-card-title>
                    <v-divider class="ml-3" />
                </div>
                <settings-row :title="t('Settings.HeightmapTab.DefaultOrientation')" :sub-title="t('Settings.HeightmapTab.DefaultOrientationDescription')">
                    <v-select v-model="defaultOrientation" :items="availableOrientations" hide-details variant="outlined" density="compact" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.HeightmapTab.ColorSchemes')">
                    <v-select v-model="colorScheme" :items="availableColorSchemes" hide-details variant="outlined" density="compact" />
                </settings-row>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiGrid } from '@mdi/js'
import { useGuiHeightmapStore } from '@/store/gui/heightmap'

const { t } = useI18n()
const guiHeightmapStore = useGuiHeightmapStore()

const availableOrientations = computed(() => [
    { text: t('Settings.HeightmapTab.Orientations.RightFront'), value: 'rightFront' },
    { text: t('Settings.HeightmapTab.Orientations.LeftFront'), value: 'leftFront' },
    { text: t('Settings.HeightmapTab.Orientations.Front'), value: 'front' },
    { text: t('Settings.HeightmapTab.Orientations.Top'), value: 'top' },
])

const defaultOrientation = computed({
    get: () => guiHeightmapStore.defaultOrientation,
    set: (newVal) => guiHeightmapStore.saveSetting({ name: 'defaultOrientation', value: newVal }),
})

const availableColorSchemes = computed(() => [
    { text: t('Settings.HeightmapTab.Schemes.Portland') + ' ' + t('Settings.HeightmapTab.IsDefault'), value: 'portland' },
    { text: t('Settings.HeightmapTab.Schemes.Spring'), value: 'spring' },
    { text: t('Settings.HeightmapTab.Schemes.Hot'), value: 'hot' },
    { text: t('Settings.HeightmapTab.Schemes.Hsv'), value: 'hsv' },
    { text: t('Settings.HeightmapTab.Schemes.GrayScale'), value: 'grayScale' },
])

const colorScheme = computed({
    get: () => guiHeightmapStore.activecolorscheme,
    set: (newVal) => guiHeightmapStore.saveSetting({ name: 'activecolorscheme', value: newVal }),
})
</script>
