<template>
    <v-menu :close-on-content-click="false" :title="t('Panels.AfcPanel.Settings')" location="bottom end">
        <template #activator="{ props: activatorProps }">
            <v-btn icon="" variant="text" v-bind="activatorProps">
                <v-icon size="small">{{ mdiCog }}</v-icon>
            </v-btn>
        </template>
        <v-list>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showFilamentName" class="mt-0" hide-details :label="t('Panels.AfcPanel.ShowFilamentName')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showLaneInfinite" class="mt-0" hide-details :label="t('Panels.AfcPanel.ShowLaneInfinite')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showUnitIcons" class="mt-0" hide-details :label="t('Panels.AfcPanel.ShowUnitIcons')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showTd1Color" class="mt-0" hide-details :label="t('Panels.AfcPanel.ShowTd1Color')" />
            </v-list-item>
            <v-divider />
            <afc-panel-settings-extruder v-for="extruder in afcExtruders" :key="extruder" :name="extruder" />
            <afc-panel-settings-unit v-for="unit in afcUnits" :key="unit" :name="unit" />
        </v-list>
    </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiCog } from '@mdi/js'
import AfcPanelSettingsExtruder from '@/components/panels/Afc/AfcPanelSettingsExtruder.vue'
import AfcPanelSettingsUnit from '@/components/panels/Afc/AfcPanelSettingsUnit.vue'
import { useAfc } from '@/composables/useAfc'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { afcExtruders, afcUnits } = useAfc()
const guiStore = useGuiStore()

const showFilamentName = computed<boolean>({
    get: () => guiStore.view.afc?.showFilamentName ?? true,
    set: (value) => guiStore.saveSetting({ name: 'view.afc.showFilamentName', value }),
})

const showLaneInfinite = computed<boolean>({
    get: () => guiStore.view.afc?.showLaneInfinite ?? true,
    set: (value) => guiStore.saveSetting({ name: 'view.afc.showLaneInfinite', value }),
})

const showUnitIcons = computed<boolean>({
    get: () => guiStore.view.afc?.showUnitIcons ?? true,
    set: (value) => guiStore.saveSetting({ name: 'view.afc.showUnitIcons', value }),
})

const showTd1Color = computed<boolean>({
    get: () => guiStore.view.afc?.showTd1Color ?? true,
    set: (value) => guiStore.saveSetting({ name: 'view.afc.showTd1Color', value }),
})
</script>
