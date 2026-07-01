<template>
    <panel v-if="klipperReadyForGui" :title="t('Panels.AfcPanel.Headline')" :icon="afcIconLogo" :collapsible="true" card-class="afc-control-panel">
        <template #buttons>
            <afc-panel-buttons />
            <afc-panel-settings />
        </template>
        <v-card-text class="pt-1">
            <afc-panel-message />
            <afc-panel-bypass />
            <afc-panel-extruder v-for="extruder in filteredExtruders" :key="extruder" :name="extruder" class="mt-3" />
            <afc-panel-unit v-for="unit in filteredUnits" :key="unit" :name="unit" class="mt-3" />
        </v-card-text>
    </panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { afcIconLogo } from '@/plugins/afcIcons'
import Panel from '@/components/ui/Panel.vue'
import AfcPanelButtons from '@/components/panels/Afc/AfcPanelButtons.vue'
import AfcPanelSettings from '@/components/panels/Afc/AfcPanelSettings.vue'
import AfcPanelMessage from '@/components/panels/Afc/AfcPanelMessage.vue'
import AfcPanelBypass from '@/components/panels/Afc/AfcPanelBypass.vue'
import AfcPanelExtruder from '@/components/panels/Afc/AfcPanelExtruder.vue'
import AfcPanelUnit from '@/components/panels/Afc/AfcPanelUnit.vue'
import { useBase } from '@/composables/useBase'
import { useAfc } from '@/composables/useAfc'

const { t } = useI18n()
const { klipperReadyForGui } = useBase()
const { afcExtruders, afcUnits, afcHiddenExtruders, afcHiddenUnits } = useAfc()

const filteredExtruders = computed(() => afcExtruders.value.filter((extruder) => !afcHiddenExtruders.value.includes(extruder)))

const filteredUnits = computed(() => afcUnits.value.filter((unit) => !afcHiddenUnits.value.includes(unit)))
</script>
