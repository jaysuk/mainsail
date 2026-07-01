<template>
    <v-container>
        <tool-slider :label="t('Panels.ExtruderControlPanel.ExtrusionFactor')" :icon="mdiPrinter3dNozzleOutline" :target="extrudeFactor" :min="1" :max="200" :multi="100" :step="1" :has-input-field="true" command="M221" attribute-name="S" />
    </v-container>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { mdiPrinter3dNozzleOutline } from '@mdi/js'
import ToolSlider from '@/components/inputs/ToolSlider.vue'
import { useExtruder } from '@/composables/useExtruder'

const { t } = useI18n()
const { extrudeFactor } = useExtruder()
</script>
