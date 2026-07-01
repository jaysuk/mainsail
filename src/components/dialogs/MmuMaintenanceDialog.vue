<template>
    <v-dialog v-model="showDialog" width="600" persistent :fullscreen="isMobile">
        <panel :title="t('Panels.MmuPanel.MmuMaintenanceTitle')" :icon="mdiWrenchCog" card-class="mmu-edit-ttg-map-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="showDialog = false">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>

            <v-card-subtitle>
                {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Intro') }}
            </v-card-subtitle>

            <v-card-text>
                <mmu-maintenance-dialog-actions />
                <mmu-maintenance-dialog-unit v-for="i in mmuNumUnits" :key="'unit_' + i" :unit-index="i - 1" />
                <mmu-maintenance-dialog-leds v-for="unit in mmuLedUnits" :key="'mmuLeds_' + unit" :unit-name="unit" />
                <mmu-maintenance-dialog-config />
            </v-card-text>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu } from '@/composables/useMmu'
import { useBase } from '@/composables/useBase'
import { mdiCloseThick, mdiWrenchCog } from '@mdi/js'
import MmuMaintenanceDialogActions from '@/components/dialogs/MmuMaintenanceDialogActions.vue'
import MmuMaintenanceDialogUnit from '@/components/dialogs/MmuMaintenanceDialogUnit.vue'
import MmuMaintenanceDialogLeds from '@/components/dialogs/MmuMaintenanceDialogLeds.vue'
import MmuMaintenanceDialogConfig from '@/components/dialogs/MmuMaintenanceDialogConfig.vue'
import { usePrinterStore } from '@/store/printer'

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()
const { isMobile } = useBase()
const { mmuNumUnits } = useMmu()
const printerStore = usePrinterStore()

const mmuLedUnits = computed(() =>
    Object.keys(printerStore)
        .filter((key) => key.toLowerCase().startsWith('mmu_leds '))
        .map((key) => key.slice(9))
)
</script>
