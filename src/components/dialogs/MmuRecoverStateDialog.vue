<template>
    <v-dialog v-model="showDialog" width="600" persistent :fullscreen="isMobile">
        <panel :title="t('Panels.MmuPanel.RecoverState')" :icon="mdiCogRefresh" card-class="mmu-recover-state-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="close">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>

            <v-card-text>
                <p>{{ t('Panels.MmuPanel.MmuRecoverDialog.Intro') }}</p>
                <v-divider class="my-2" />
                <settings-row :title="t('Panels.MmuPanel.MmuRecoverDialog.Tool')" :sub-title="t('Panels.MmuPanel.MmuRecoverDialog.ToolDescription')">
                    <v-select v-model="localTool" :items="toolsList" :error-messages="toolErrorMessage" variant="outlined" :hide-details="toolErrorMessage.length === 0" density="compact" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Panels.MmuPanel.MmuRecoverDialog.Gate')" :sub-title="t('Panels.MmuPanel.MmuRecoverDialog.GateDescription')">
                    <v-select v-model="localGate" :items="gatesList" :error-messages="gateErrorMessage" variant="outlined" :hide-details="gateErrorMessage.length === 0" density="compact" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Panels.MmuPanel.MmuRecoverDialog.FilamentPosition')" :sub-title="t('Panels.MmuPanel.MmuRecoverDialog.FilamentPositionDescription')">
                    <v-select v-model="localFilamentPos" :items="posList" :error-messages="posErrorMessage ? [posErrorMessage] : []" variant="outlined" :hide-details="posErrorMessage.length === 0" density="compact" />
                </settings-row>
            </v-card-text>

            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="close">{{ t('Buttons.Cancel') }}</v-btn>
                <v-btn color="primary" :disabled="okDisabled" variant="text" @click="commit">
                    {{ t('Panels.MmuPanel.Ok') }}
                </v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu, FILAMENT_POS_LOADED, FILAMENT_POS_UNKNOWN, FILAMENT_POS_UNLOADED, GATE_UNKNOWN, TOOL_GATE_BYPASS, TOOL_GATE_UNKNOWN } from '@/composables/useMmu'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiCloseThick, mdiCogRefresh } from '@mdi/js'
import { useBase } from '@/composables/useBase'

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()
const { isMobile } = useBase()
const { mmuNumGates, mmuNumUnits, mmuHasBypass, mmuGate, mmuTool, mmuFilamentPos, ttgMap, doSend, getMmuMachineUnit } = useMmu()

const localGate = ref(GATE_UNKNOWN)
const localTool = ref(TOOL_GATE_UNKNOWN)
const localFilamentPos = ref(FILAMENT_POS_UNKNOWN)

const toolsList = computed(() => {
    const tools = []

    for (let i = 0; i < mmuNumGates.value; i++) {
        tools.push({ title: `T${i}`, value: i })
    }

    if (mmuHasBypass.value) {
        tools.push({ title: t('Panels.MmuPanel.Bypass'), value: TOOL_GATE_BYPASS })
    }

    return tools
})

const toolErrorMessage = computed(() => {
    const messages = []

    if (localTool.value === TOOL_GATE_UNKNOWN) {
        messages.push(t('Panels.MmuPanel.MmuRecoverDialog.NoTool'))
    }

    if (localGate.value === TOOL_GATE_BYPASS && localTool.value !== TOOL_GATE_BYPASS) {
        messages.push(t('Panels.MmuPanel.MmuRecoverDialog.GateBypass'))
    }

    return messages
})

function gateIndexText(gateIndex: number) {
    if (mmuNumUnits.value <= 1) return `${gateIndex}`

    for (let i = 0; i < mmuNumUnits.value; i++) {
        const unit = getMmuMachineUnit(i)
        if (!unit) continue

        if (i > 0 && gateIndex >= unit.first_gate && gateIndex < unit.first_gate + unit.num_gates) {
            return `${gateIndex} (unit #${i + 1})`
        }
    }

    return `${gateIndex}`
}

const gatesList = computed(() => {
    const list = []

    for (let gate = 0; gate < mmuNumGates.value; gate++) {
        list.push({ title: gateIndexText(gate), value: gate })
    }

    if (mmuHasBypass.value) {
        list.push({ title: t('Panels.MmuPanel.Bypass'), value: TOOL_GATE_BYPASS })
    }

    return list
})

const gateErrorMessage = computed(() => {
    const messages = []

    if (localGate.value === TOOL_GATE_UNKNOWN) {
        messages.push(t('Panels.MmuPanel.MmuRecoverDialog.NoGate'))
    }

    if (localTool.value === TOOL_GATE_BYPASS && localGate.value !== TOOL_GATE_BYPASS) {
        messages.push(t('Panels.MmuPanel.MmuRecoverDialog.ToolBypass'))
    }

    if (localGate.value >= 0 && ttgMap.value[localGate.value] !== localTool.value) {
        const msg = t('Panels.MmuPanel.MmuRecoverDialog.Remap', { tool: `T${localTool.value}` })
        messages.push(`${t('Panels.MmuPanel.MmuRecoverDialog.WarningPrefix')} ${msg}`)
    }

    return messages
})

const posList = computed(() => [
    { title: t('Panels.MmuPanel.MmuRecoverDialog.Unknown'), value: FILAMENT_POS_UNKNOWN },
    { title: t('Panels.MmuPanel.MmuRecoverDialog.Unloaded'), value: FILAMENT_POS_UNLOADED },
    { title: t('Panels.MmuPanel.MmuRecoverDialog.Loaded'), value: FILAMENT_POS_LOADED },
])

const posErrorMessage = computed<string>(() => {
    if (localFilamentPos.value === FILAMENT_POS_UNKNOWN) {
        return `${t('Panels.MmuPanel.MmuRecoverDialog.WarningPrefix')} ${t('Panels.MmuPanel.MmuRecoverDialog.NoPosition')}`
    }
    return ''
})

const okDisabled = computed(() => {
    const warningPrefix = t('Panels.MmuPanel.MmuRecoverDialog.WarningPrefix')
    const messages = [...toolErrorMessage.value, ...gateErrorMessage.value, ...(posErrorMessage.value ? [posErrorMessage.value] : [])]

    return messages.filter((msg) => !msg.startsWith(warningPrefix)).length > 0
})

function close() {
    showDialog.value = false
}

function commit() {
    const cmdParts = ['MMU_RECOVER']

    cmdParts.push(`TOOL=${localTool.value}`)
    cmdParts.push(`GATE=${localGate.value}`)

    if ([FILAMENT_POS_UNLOADED, FILAMENT_POS_LOADED].includes(localFilamentPos.value)) {
        cmdParts.push(`LOADED=${localFilamentPos.value === FILAMENT_POS_LOADED ? 1 : 0}`)
    }

    doSend(cmdParts.join(' '))
    close()
}

watch(
    showDialog,
    (newValue) => {
        if (!newValue) return

        localGate.value = mmuGate.value
        localTool.value = mmuTool.value
        localFilamentPos.value = mmuFilamentPos.value

        if (![FILAMENT_POS_UNLOADED, FILAMENT_POS_LOADED].includes(localFilamentPos.value)) {
            localFilamentPos.value = FILAMENT_POS_UNKNOWN
        }
    },
    { immediate: true }
)
</script>
