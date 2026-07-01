<template>
    <div>
        <h3 class="text-h5 mb-3 mt-5">{{ title }}</h3>

        <settings-row :title="t('Panels.MmuPanel.MmuMaintenanceDialog.Enable')" dense>
            <v-switch v-model="ledsEnable" :label="t('Panels.MmuPanel.MmuMaintenanceDialog.Enable')" hide-details />
            <v-switch v-model="ledsAnimation" :label="t('Panels.MmuPanel.MmuMaintenanceDialog.Animation')" hide-details class="ml-5" />
        </settings-row>
        <settings-row v-if="existsEntryLed" :title="t('Panels.MmuPanel.MmuMaintenanceDialog.EntryLeds')" :sub-title="t('Panels.MmuPanel.MmuMaintenanceDialog.EntryLedsDescription')" dense>
            <v-select v-model="entryEffect" :items="options" hide-details variant="outlined" density="compact" />
        </settings-row>
        <settings-row v-if="existsExitLed" :title="t('Panels.MmuPanel.MmuMaintenanceDialog.ExitLeds')" :sub-title="t('Panels.MmuPanel.MmuMaintenanceDialog.ExitLedsDescription')" dense>
            <v-select v-model="exitEffect" :items="options" hide-details variant="outlined" density="compact" />
        </settings-row>
        <settings-row v-if="existsStatusLed" :title="t('Panels.MmuPanel.MmuMaintenanceDialog.StatusLeds')" :sub-title="t('Panels.MmuPanel.MmuMaintenanceDialog.StatusLedsDescription')" dense>
            <v-select v-model="statusEffect" :items="statusOptions" hide-details variant="outlined" density="compact" />
        </settings-row>

        <v-divider class="my-6" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { convertName, toBoolean } from '@/plugins/helpers'
import { useMmu } from '@/composables/useMmu'
import { usePrinterStore } from '@/store/printer'

const props = defineProps<{
    unitName: string
}>()

const { t } = useI18n()
const { mmuSettings, doSend } = useMmu()
const printerStore = usePrinterStore()

const title = computed(() => `MMU Leds - ${convertName(props.unitName)}`)

const mmuLeds = computed(() => {
    const key = `mmu_leds ${props.unitName}`

    return (printerStore as unknown as Record<string, any>)[key] ?? {}
})

const mmuLedsSettings = computed(() => {
    const key = `mmu_leds ${props.unitName}`

    return printerStore.configfile?.settings?.[key] ?? {}
})

function updateLedSettings(attribute: string, value: string) {
    doSend(`MMU_LED QUIET=1 ${attribute}=${value}`)
}

const ledsEnable = computed<boolean>({
    get: () => toBoolean(mmuLeds.value.enabled ?? 'False'),
    set: (newVal) => updateLedSettings('ENABLE', newVal ? '1' : '0'),
})

const ledsAnimation = computed<boolean>({
    get: () => toBoolean(mmuLeds.value.animation ?? 'False'),
    set: (newVal) => updateLedSettings('ANIMATION', newVal ? '1' : '0'),
})

const existsEntryLed = computed(() => {
    const pins = mmuLedsSettings.value?.entry_leds ?? ''

    return pins !== ''
})

const entryEffect = computed<string>({
    get: () => mmuLeds.value.entry_effect ?? 'off',
    set: (newVal) => updateLedSettings('ENTRY_EFFECT', newVal),
})

const existsExitLed = computed(() => {
    const pins = mmuLedsSettings.value?.exit_leds ?? ''

    return pins !== ''
})

const exitEffect = computed<string>({
    get: () => mmuLedsSettings.value.exit_effect ?? 'off',
    set: (newVal) => updateLedSettings('EXIT_EFFECT', newVal),
})

const existsStatusLed = computed(() => {
    const pins = mmuSettings.value?.status_leds ?? ''

    return pins !== ''
})

const statusEffect = computed<string>({
    get: () => mmuLedsSettings.value.status_effect ?? 'off',
    set: (newVal) => updateLedSettings('STATUS_EFFECT', newVal),
})

const options = computed(() => [
    { value: 'off', title: t('Panels.MmuPanel.MmuMaintenanceDialog.LedOptions.Off') },
    { value: 'gate_status', title: t('Panels.MmuPanel.MmuMaintenanceDialog.LedOptions.GateStatus') },
    { value: 'filament_color', title: t('Panels.MmuPanel.MmuMaintenanceDialog.LedOptions.FilamentColor') },
    { value: 'slicer_color', title: t('Panels.MmuPanel.MmuMaintenanceDialog.LedOptions.SlicerColor') },
])

const statusOptions = computed(() => {
    const opts = [...options.value]
    opts.push({ value: 'on', title: t('Panels.MmuPanel.MmuMaintenanceDialog.LedOptions.On') })

    return opts
})
</script>
