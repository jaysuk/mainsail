<template>
    <v-dialog v-model="showDialog" width="700" @click:outside="closeDialog">
        <panel :title="t('Panels.AfcPanel.AfcSettings')" :icon="afcIconLogo" card-class="afc-settings-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn variant="text" href="https://www.armoredturtle.xyz/docs/afc-klipper-add-on/toolhead/calculation.html" target="_blank">
                    <v-icon start>{{ mdiLifebuoy }}</v-icon>
                    {{ t('Panels.AfcPanel.SettingsDialog.Help') }}
                </v-btn>
                <v-btn icon="" variant="text" @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <OverlayScrollbarsComponent class="height500" :options="{}">
                <v-card-text class="d-flex flex-column gap-3">
                    <afc-settings-dialog-hub v-for="hub in afcHubs" :key="hub" :name="hub" />
                    <afc-settings-dialog-extruder v-for="extruder in afcExtruders" :key="extruder" :name="extruder" />
                    <afc-settings-dialog-lane v-for="lane in afcLanes" :key="lane" :name="lane" />
                </v-card-text>
            </OverlayScrollbarsComponent>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick, mdiLifebuoy } from '@mdi/js'
import { afcIconLogo } from '@/plugins/afcIcons'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import AfcSettingsDialogHub from '@/components/dialogs/AfcSettingsDialogHub.vue'
import AfcSettingsDialogExtruder from '@/components/dialogs/AfcSettingsDialogExtruder.vue'
import AfcSettingsDialogLane from '@/components/dialogs/AfcSettingsDialogLane.vue'
import { useAfc } from '@/composables/useAfc'

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()
const { afcHubs, afcExtruders, afcLanes } = useAfc()

function closeDialog() {
    showDialog.value = false
}
</script>

<style scoped>
.gap-3 {
    gap: 12px;
}

.height500 {
    max-height: 500px;
}
</style>
