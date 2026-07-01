<template>
    <v-menu location="bottom end" :close-on-content-click="false" :title="t('Panels.TemperaturePanel.SetupTemperatures')">
        <template #activator="{ props: activatorProps }">
            <v-btn icon tile v-bind="activatorProps">
                <v-icon size="small">{{ mdiCog }}</v-icon>
            </v-btn>
        </template>
        <v-list>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="boolTempchart" class="mt-0" hide-details :label="t('Panels.TemperaturePanel.ShowChart')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="hideMcuHostSensors" class="mt-0" hide-details :label="t('Panels.TemperaturePanel.HideMcuHostSensors')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="hideMonitors" class="mt-0" hide-details :label="t('Panels.TemperaturePanel.HideMonitors')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="autoscaleTempchart" class="mt-0" hide-details :label="t('Panels.TemperaturePanel.AutoscaleChart')" />
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

const boolTempchart = computed<boolean>({
    get: () => guiStore.view.tempchart.boolTempchart ?? false,
    set: (newVal) => guiStore.saveSetting({ name: 'view.tempchart.boolTempchart', value: newVal }),
})

const autoscaleTempchart = computed<boolean>({
    get: () => guiStore.view.tempchart.autoscale ?? false,
    set: (newVal) => guiStore.saveSetting({ name: 'view.tempchart.autoscale', value: newVal }),
})

const hideMcuHostSensors = computed<boolean>({
    get: () => guiStore.view.tempchart.hideMcuHostSensors ?? false,
    set: (newVal) => guiStore.saveSetting({ name: 'view.tempchart.hideMcuHostSensors', value: newVal }),
})

const hideMonitors = computed<boolean>({
    get: () => guiStore.view.tempchart.hideMonitors ?? false,
    set: (newVal) => guiStore.saveSetting({ name: 'view.tempchart.hideMonitors', value: newVal }),
})
</script>
