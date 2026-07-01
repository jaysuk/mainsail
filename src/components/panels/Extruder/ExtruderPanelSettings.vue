<template>
    <v-menu location="bottom end" :close-on-content-click="false">
        <template #activator="{ props: activatorProps }">
            <v-btn icon tile v-bind="activatorProps">
                <v-icon size="small">{{ mdiCog }}</v-icon>
            </v-btn>
        </template>
        <v-list>
            <v-list-item v-if="toolchangeMacros.length" class="minHeight36">
                <v-checkbox v-model="showTools" class="mt-0" hide-details :label="t('Panels.ExtruderControlPanel.Tools')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showExtrusionFactor" class="mt-0" hide-details :label="t('Panels.ExtruderControlPanel.ExtrusionFactor')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showPressureAdvance" class="mt-0" hide-details :label="t('Panels.ExtruderControlPanel.PressureAdvance')" />
            </v-list-item>
            <v-list-item v-if="existsFirmwareRetraction" class="minHeight36">
                <v-checkbox v-model="showFirmwareRetraction" class="mt-0" hide-details :label="t('Panels.ExtruderControlPanel.FirmwareRetraction')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showExtruderControl" class="mt-0" hide-details :label="t('Panels.ExtruderControlPanel.ExtruderControl')" />
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiCog } from '@mdi/js'
import { useControl } from '@/composables/useControl'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { toolchangeMacros, existsFirmwareRetraction } = useControl()
const guiStore = useGuiStore()

const showTools = computed<boolean>({
    get: () => guiStore.view.extruder.showTools ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.extruder.showTools', value: newVal }),
})

const showExtrusionFactor = computed<boolean>({
    get: () => guiStore.view.extruder.showExtrusionFactor ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.extruder.showExtrusionFactor', value: newVal }),
})

const showPressureAdvance = computed<boolean>({
    get: () => guiStore.view.extruder.showPressureAdvance ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.extruder.showPressureAdvance', value: newVal }),
})

const showFirmwareRetraction = computed<boolean>({
    get: () => guiStore.view.extruder.showFirmwareRetraction ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.extruder.showFirmwareRetraction', value: newVal }),
})

const showExtruderControl = computed<boolean>({
    get: () => guiStore.view.extruder.showExtruderControl ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.extruder.showExtruderControl', value: newVal }),
})
</script>
