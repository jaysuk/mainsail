<template>
    <panel v-if="klipperReadyForGui" :icon="mdiThermometerLines" :title="t('Panels.TemperaturePanel.Headline')" :collapsible="true" card-class="temperature-panel">
        <template #buttons>
            <temperature-panel-presets />
            <temperature-panel-settings />
        </template>
        <v-card-text class="pa-0">
            <temperature-panel-list />
            <template v-if="boolTempchart">
                <v-divider class="my-0" />
                <temp-chart />
            </template>
        </v-card-text>
    </panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import TempChart from '@/components/charts/TempChart.vue'
import { mdiThermometerLines } from '@mdi/js'
import TemperaturePanelPresets from '@/components/panels/Temperature/TemperaturePanelPresets.vue'
import TemperaturePanelSettings from '@/components/panels/Temperature/TemperaturePanelSettings.vue'
import TemperaturePanelList from '@/components/panels/Temperature/TemperaturePanelList.vue'
import { useBase } from '@/composables/useBase'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { klipperReadyForGui } = useBase()
const guiStore = useGuiStore()

const boolTempchart = computed<boolean>(() => guiStore.view.tempchart.boolTempchart ?? false)
</script>
