<template>
    <panel :title="t('Files.GCodeFiles')" :icon="mdiFileDocumentMultipleOutline" card-class="gcode-files-panel">
        <v-card-text>
            <gcodefiles-panel-header />
            <gcodefiles-panel-header-path-size />
        </v-card-text>
        <v-divider class="mb-3" />
        <gcodefiles-panel-table />
    </panel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import GcodefilesPanelHeader from '@/components/panels/Gcodefiles/GcodefilesPanelHeader.vue'
import { mdiFileDocumentMultipleOutline } from '@mdi/js'
import GcodefilesPanelHeaderPathSize from '@/components/panels/Gcodefiles/GcodefilesPanelHeaderPathSize.vue'
import GcodefilesPanelTable from '@/components/panels/Gcodefiles/GcodefilesPanelTable.vue'

const { t } = useI18n()
</script>
