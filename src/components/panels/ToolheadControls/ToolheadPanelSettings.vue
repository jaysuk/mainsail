<template>
    <v-menu location="bottom end" :close-on-content-click="false">
        <template #activator="{ props: activatorProps }">
            <v-btn icon tile v-bind="activatorProps">
                <v-icon size="small">{{ mdiCog }}</v-icon>
            </v-btn>
        </template>
        <v-list>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showPosition" class="mt-0" hide-details :label="t('Panels.ToolheadControlPanel.PositionOutput')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showCoordinates" class="mt-0" hide-details :label="t('Panels.ToolheadControlPanel.CoordinateFields')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showControl" class="mt-0" hide-details :label="t('Panels.ToolheadControlPanel.ControlButtons')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showZOffset" class="mt-0" hide-details :label="t('Panels.ToolheadControlPanel.ZOffset')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showSpeedFactor" class="mt-0" hide-details :label="t('Panels.ToolheadControlPanel.SpeedFactor')" />
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiCog } from '@mdi/js'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const guiStore = useGuiStore()

const showPosition = computed<boolean>({
    get: () => guiStore.view.toolhead.showPosition ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.toolhead.showPosition', value: newVal }),
})

const showCoordinates = computed<boolean>({
    get: () => guiStore.view.toolhead.showCoordinates ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.toolhead.showCoordinates', value: newVal }),
})

const showControl = computed<boolean>({
    get: () => guiStore.view.toolhead.showControl ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.toolhead.showControl', value: newVal }),
})

const showZOffset = computed<boolean>({
    get: () => guiStore.view.toolhead.showZOffset ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.toolhead.showZOffset', value: newVal }),
})

const showSpeedFactor = computed<boolean>({
    get: () => guiStore.view.toolhead.showSpeedFactor ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.toolhead.showSpeedFactor', value: newVal }),
})
</script>
