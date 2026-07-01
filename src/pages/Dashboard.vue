<template>
    <div>
        <v-row v-if="isMobile">
            <v-col>
                <status-panel />
                <template v-for="component in mobileLayout" :key="'dashboard-mobileLayout-' + component.name">
                    <component :is="layoutStore.resolvePanelComponent(component.name)" :panel-id="layoutStore.extractPanelId(component.name)" />
                </template>
            </v-col>
        </v-row>
        <v-row v-else-if="isTablet">
            <v-col class="col-6">
                <status-panel />
                <template v-for="component in tabletLayout1" :key="'dashboard-tabletLayout1-' + component.name">
                    <component :is="layoutStore.resolvePanelComponent(component.name)" :panel-id="layoutStore.extractPanelId(component.name)" />
                </template>
            </v-col>
            <v-col class="col-6">
                <template v-for="component in tabletLayout2" :key="'dashboard-tabletLayout2-' + component.name">
                    <component :is="layoutStore.resolvePanelComponent(component.name)" :panel-id="layoutStore.extractPanelId(component.name)" />
                </template>
            </v-col>
        </v-row>
        <v-row v-else-if="isDesktop">
            <v-col class="col-5">
                <status-panel />
                <template v-for="component in desktopLayout1" :key="'dashboard-desktopLayout1-' + component.name">
                    <component :is="layoutStore.resolvePanelComponent(component.name)" :panel-id="layoutStore.extractPanelId(component.name)" />
                </template>
            </v-col>
            <v-col class="col-7">
                <template v-for="component in desktopLayout2" :key="'dashboard-desktopLayout2-' + component.name">
                    <component :is="layoutStore.resolvePanelComponent(component.name)" :panel-id="layoutStore.extractPanelId(component.name)" />
                </template>
            </v-col>
        </v-row>
        <v-row v-else-if="isWidescreen">
            <v-col class="col-3">
                <status-panel />
                <template v-for="component in widescreenLayout1" :key="'dashboard-desktopLayout1-' + component.name">
                    <component :is="layoutStore.resolvePanelComponent(component.name)" :panel-id="layoutStore.extractPanelId(component.name)" />
                </template>
            </v-col>
            <v-col class="col-5">
                <template v-for="component in widescreenLayout2" :key="'dashboard-desktopLayout2-' + component.name">
                    <component :is="layoutStore.resolvePanelComponent(component.name)" :panel-id="layoutStore.extractPanelId(component.name)" />
                </template>
            </v-col>
            <v-col class="col-4">
                <template v-for="component in widescreenLayout3" :key="'dashboard-desktopLayout3-' + component.name">
                    <component :is="layoutStore.resolvePanelComponent(component.name)" :panel-id="layoutStore.extractPanelId(component.name)" />
                </template>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AfcPanel from '@/components/panels/AfcPanel.vue'
import ExtruderControlPanel from '@/components/panels/ExtruderControlPanel.vue'
import KlippyStatePanel from '@/components/panels/KlippyStatePanel.vue'
import LedEffectsPanel from '@/components/panels/LedEffectsPanel.vue'
import MachineSettingsPanel from '@/components/panels/MachineSettingsPanel.vue'
import MacrogroupPanel from '@/components/panels/MacrogroupPanel.vue'
import MacrosPanel from '@/components/panels/MacrosPanel.vue'
import MiniconsolePanel from '@/components/panels/MiniconsolePanel.vue'
import MinSettingsPanel from '@/components/panels/MinSettingsPanel.vue'
import MiscellaneousPanel from '@/components/panels/MiscellaneousPanel.vue'
import SpoolmanPanel from '@/components/panels/SpoolmanPanel.vue'
import MmuPanel from '@/components/panels/MmuPanel.vue'
import StatusPanel from '@/components/panels/StatusPanel.vue'
import ToolheadControlPanel from '@/components/panels/ToolheadControlPanel.vue'
import TemperaturePanel from '@/components/panels/TemperaturePanel.vue'
import WebcamPanel from '@/components/panels/WebcamPanel.vue'
import { useBase } from '@/composables/useBase'
import { useLayoutStore } from '@/store/layout'

const { isMobile, isTablet, isDesktop, isWidescreen } = useBase()
const layoutStore = useLayoutStore()

layoutStore.registerPanel('afc', AfcPanel)
layoutStore.registerPanel('extruder-control', ExtruderControlPanel)
layoutStore.registerPanel('klippy-state', KlippyStatePanel)
layoutStore.registerPanel('led-effects', LedEffectsPanel)
layoutStore.registerPanel('machine-settings', MachineSettingsPanel)
layoutStore.registerPanel('macrogroup', MacrogroupPanel)
layoutStore.registerPanel('macros', MacrosPanel)
layoutStore.registerPanel('miniconsole', MiniconsolePanel)
layoutStore.registerPanel('min-settings', MinSettingsPanel)
layoutStore.registerPanel('miscellaneous', MiscellaneousPanel)
layoutStore.registerPanel('spoolman', SpoolmanPanel)
layoutStore.registerPanel('mmu', MmuPanel)
layoutStore.registerPanel('toolhead-control', ToolheadControlPanel)
layoutStore.registerPanel('temperature', TemperaturePanel)
layoutStore.registerPanel('webcam', WebcamPanel)

const mobileLayout = computed(() => layoutStore.getPanels('mobile', 0, true))
const tabletLayout1 = computed(() => layoutStore.getPanels('tablet', 1, true))
const tabletLayout2 = computed(() => layoutStore.getPanels('tablet', 2, true))
const desktopLayout1 = computed(() => layoutStore.getPanels('desktop', 1, true))
const desktopLayout2 = computed(() => layoutStore.getPanels('desktop', 2, true))
const widescreenLayout1 = computed(() => layoutStore.getPanels('widescreen', 1, true))
const widescreenLayout2 = computed(() => layoutStore.getPanels('widescreen', 2, true))
const widescreenLayout3 = computed(() => layoutStore.getPanels('widescreen', 3, true))
</script>
