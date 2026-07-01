<template>
    <div class="py-2">
        <v-row dense>
            <v-col cols="6">
                <mmu-controls-button :disabled="btnPreloadDisabled" :icon="mdiDownloadOutline" :text="t('Panels.MmuPanel.ButtonPreload')" command="MMU_PRELOAD" />
            </v-col>
            <v-col cols="6">
                <mmu-controls-button :disabled="btnEjectDisabled" :icon="mdiEject" :text="t('Panels.MmuPanel.ButtonEject')" command="MMU_EJECT" />
            </v-col>
        </v-row>
        <v-row dense>
            <v-col cols="6">
                <mmu-controls-button :disabled="!canSend" :icon="mdiCheck" :text="t('Panels.MmuPanel.ButtonCheckGate')" command="MMU_CHECK_GATE" />
            </v-col>
            <v-col cols="6">
                <mmu-controls-button :disabled="!canSend" :icon="mdiAutoFix" :text="t('Panels.MmuPanel.ButtonRecover')" command="MMU_RECOVER" />
            </v-col>
        </v-row>
        <v-row dense>
            <v-col cols="8" offset="2">
                <mmu-controls-button :disabled="!canSend || !isMmuPausedAndLocked" :icon="mdiThermometerPlus" :text="t('Panels.MmuPanel.ButtonUnlock')" command="MMU_UNLOCK" />
            </v-col>
        </v-row>
        <v-row dense class="mt-4">
            <v-col cols="6">
                <mmu-controls-button :disabled="btnUnloadDisabled" :icon="mdiUpload" :text="btnUnloadText" size="large" command="MMU_UNLOAD" />
            </v-col>
            <v-col cols="6">
                <mmu-controls-button :disabled="btnLoadDisabled" :icon="mdiDownload" :text="btnLoadText" size="large" command="MMU_LOAD" />
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiDownloadOutline, mdiEject, mdiCheck, mdiAutoFix, mdiThermometerPlus, mdiDownload, mdiUpload } from '@mdi/js'
import MmuControlsButton from '@/components/panels/Mmu/MmuControlsButton.vue'
import { useMmu, TOOL_GATE_BYPASS, GATE_AVAILABLE, GATE_AVAILABLE_FROM_BUFFER, FILAMENT_POS_UNLOADED, GATE_UNKNOWN, GATE_EMPTY } from '@/composables/useMmu'
import { usePrinterStore } from '@/store/printer'

const { t } = useI18n()
const { mmuPrintState, mmuGate, mmuFilamentPos, canSend } = useMmu()
const printerStore = usePrinterStore()

const isMmuPausedAndLocked = computed(() => mmuPrintState.value === 'pause_locked')

const currentGateStatus = computed<number>(() => {
    const gateStatus = printerStore.mmu?.gate_status ?? null

    return gateStatus?.[mmuGate.value] ?? GATE_UNKNOWN
})

const btnPreloadDisabled = computed<boolean>(() => !canSend.value || [GATE_AVAILABLE, GATE_AVAILABLE_FROM_BUFFER].includes(currentGateStatus.value))

const btnEjectDisabled = computed<boolean>(() => !canSend.value || currentGateStatus.value === GATE_EMPTY)

const btnUnloadDisabled = computed(() => !canSend.value || mmuFilamentPos.value === FILAMENT_POS_UNLOADED)

const btnUnloadText = computed(() => (mmuGate.value === TOOL_GATE_BYPASS ? t('Panels.MmuPanel.ButtonUnloadExt') : t('Panels.MmuPanel.ButtonUnload')))

const btnLoadDisabled = computed(() => !canSend.value || mmuFilamentPos.value !== FILAMENT_POS_UNLOADED)

const btnLoadText = computed(() => (mmuGate.value === TOOL_GATE_BYPASS ? t('Panels.MmuPanel.ButtonLoadExt') : t('Panels.MmuPanel.ButtonLoad')))
</script>
