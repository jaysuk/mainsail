<template>
    <div>
        <h3 class="text-h5 mb-3 mt-5">{{ t('Panels.MmuPanel.MmuMaintenanceDialog.Config') }}</h3>

        <settings-row :title="t('Panels.MmuPanel.MmuMaintenanceDialog.TxMacroColor')" :sub-title="t('Panels.MmuPanel.MmuMaintenanceDialog.TxMacroColorDescription')" dense>
            <v-select v-model="configTMacroColor" :items="tMacroColorOptions" hide-details variant="outlined" density="compact" />
        </settings-row>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { useMmu } from '@/composables/useMmu'

const { t } = useI18n()
const { mmuSettings, doSend } = useMmu()

const configTMacroColor = computed<string>({
    get: () => mmuSettings.value?.t_macro_color ?? 'slicer',
    set: (newVal) => doSend(`MMU_TEST_CONFIG QUIET=1 t_macro_color=${newVal}`),
})

const tMacroColorOptions = computed(() => [
    { value: 'slicer', title: t('Panels.MmuPanel.MmuMaintenanceDialog.TMacroColorOptions.Slicer') },
    { value: 'allgates', title: t('Panels.MmuPanel.MmuMaintenanceDialog.TMacroColorOptions.AllGates') },
    { value: 'gatemap', title: t('Panels.MmuPanel.MmuMaintenanceDialog.TMacroColorOptions.GateMap') },
    { value: 'off', title: t('Panels.MmuPanel.MmuMaintenanceDialog.TMacroColorOptions.Off') },
])
</script>
