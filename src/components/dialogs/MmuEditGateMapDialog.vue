<template>
    <v-dialog v-model="showDialog" width="800" persistent :fullscreen="isMobile">
        <panel :title="t('Panels.MmuPanel.EditGateMapTitle')" :icon="mdiDatabaseEdit" card-class="mmu-edit-ttg-map-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn variant="text" @click="showResetConfirmationDialog = true">
                    {{ t('Panels.MmuPanel.GateMapDialog.Reset') }}
                </v-btn>
                <v-btn icon="" variant="text" @click="close">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>

            <v-card-text>
                <v-card-subtitle class="pt-0 px-1 text-medium-emphasis">
                    {{ t('Panels.MmuPanel.GateMapDialog.SelectGate') }}
                </v-card-subtitle>
                <v-row>
                    <v-col class="pb-0">
                        <mmu-unit v-for="i in mmuNumUnits" :key="i" :selected-gate="selectedGate" :unit-index="i - 1" :hide-bypass="true" :show-context-menu="false" :unhighlight-spools="true" @select-gate="selectGate" />
                    </v-col>
                </v-row>
            </v-card-text>

            <v-divider />

            <v-card-text class="min-height-420 position-relative">
                <transition name="fade">
                    <div v-if="selectedGate === TOOL_GATE_UNKNOWN" class="overlay-text">
                        {{ t('Panels.MmuPanel.GateMapDialog.SelectGate') }}
                    </div>
                    <mmu-edit-gate-map-dialog-gate-details v-else :selected-gate="selectedGate" />
                </transition>
            </v-card-text>
        </panel>

        <!-- CONFIRMATION FOR RESET ACTION -->
        <confirmation-dialog
            v-model="showResetConfirmationDialog"
            :title="t('Panels.MmuPanel.Dialog.AreYouSure')"
            :text="t('Panels.MmuPanel.GateMapDialog.ResetConfirmation')"
            :action-button-text="t('Panels.MmuPanel.GateMapDialog.Reset')"
            @action="executeResetGateMap" />
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu, TOOL_GATE_UNKNOWN } from '@/composables/useMmu'
import { useBase } from '@/composables/useBase'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import MmuUnit from '@/components/panels/Mmu/MmuUnit.vue'
import MmuEditGateMapDialogGateDetails from '@/components/dialogs/MmuEditGateMapDialogGateDetails.vue'
import { mdiCloseThick, mdiDatabaseEdit } from '@mdi/js'

const props = withDefaults(
    defineProps<{
        initialGate?: number | null
    }>(),
    {
        initialGate: null,
    }
)

const showDialog = defineModel<boolean>({ required: true })

const emit = defineEmits<{
    close: []
}>()

const { t } = useI18n()
const { isMobile } = useBase()
const { mmuNumUnits, doSend } = useMmu()

const showResetConfirmationDialog = ref(false)
const selectedGate = ref(TOOL_GATE_UNKNOWN)

function selectGate(gate: number) {
    selectedGate.value = gate
}

function handleEscapePress(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.code === 'Escape') {
        selectedGate.value = TOOL_GATE_UNKNOWN
    }
}

function executeResetGateMap() {
    doSend('MMU_GATE_MAP RESET=1')
}

function close() {
    emit('close')
    showDialog.value = false
}

watch(showDialog, (val) => {
    if (!val) return

    if (props.initialGate !== null && props.initialGate !== undefined) {
        selectedGate.value = props.initialGate
    } else {
        selectedGate.value = TOOL_GATE_UNKNOWN
    }
})

onMounted(() => {
    document.addEventListener('keydown', handleEscapePress)
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleEscapePress)
})
</script>

<style scoped>
.min-height-420 {
    min-height: 420px;
}

.overlay-text {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}
</style>
