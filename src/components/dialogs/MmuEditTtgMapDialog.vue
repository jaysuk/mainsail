<template>
    <v-dialog v-model="showDialog" width="800" persistent :fullscreen="isMobile">
        <panel :title="t('Panels.MmuPanel.EditTtgMapTitle')" :icon="mdiStateMachine" card-class="mmu-edit-ttg-map-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn variant="text" @click="showResetDialog = true">
                    {{ t('Panels.MmuPanel.TtgMapDialog.Reset') }}
                </v-btn>
                <v-btn icon="" variant="text" @click="showDialog = false">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>

            <!-- UPPER SECTION -->
            <v-card-text>
                <v-row>
                    <v-col cols="8">
                        <v-row>
                            <v-col class="pb-0">{{ titleHeader }}</v-col>
                        </v-row>
                        <v-row>
                            <v-col class="d-flex flex-wrap gap-6">
                                <mmu-edit-ttg-map-dialog-tool
                                    v-for="map in filteredTtgMap"
                                    :key="map.tool"
                                    :gate="map.gate"
                                    :tool="map.tool"
                                    :is-selected="selectedTool === map.tool"
                                    :is-disabled="selectedTool > -1 && selectedTool !== map.tool"
                                    @select-tool="selectTool" />
                            </v-col>
                        </v-row>
                    </v-col>
                    <v-col cols="4">
                        <v-row>
                            <v-col class="">
                                <div class="d-flex align-center justify-end pr-8">
                                    <span class="mr-4">{{ t('Panels.MmuPanel.TtgMapDialog.AllTools') }}</span>
                                    <v-switch v-model="allTools" :disabled="allToolsDisabled" hide-details class="mt-0 pt-0" />
                                </div>
                                <div v-if="showSkipAutomap" class="d-flex align-center justify-end pr-8">
                                    <span class="mr-4">{{ t('Panels.MmuPanel.TtgMapDialog.SkipAutomap') }}</span>
                                    <v-switch v-model="skipAutomap" hide-details class="mt-0 pt-0" />
                                </div>
                                <mmu-ttg-map :selected-tool="selectedTool" :selected-gate="selectedGate" />
                            </v-col>
                        </v-row>
                    </v-col>
                </v-row>
            </v-card-text>

            <v-divider />

            <v-card-text class="min-height-300 position-relative py-3 pr-3">
                <transition name="fade">
                    <div v-if="selectedTool === -1" class="overlay-text">
                        {{ t('Panels.MmuPanel.TtgMapDialog.SelectTool') }}
                    </div>
                    <mmu-edit-ttg-map-dialog-details v-else :tool="selectedTool" :file="file" />
                </transition>
            </v-card-text>

            <!-- CONFIRMATION FOR RESET ACTION -->
            <confirmation-dialog
                v-model="showResetDialog"
                :title="t('Panels.MmuPanel.Dialog.AreYouSure')"
                :text="t('Panels.MmuPanel.TtgMapDialog.ResetConfirmation')"
                :action-button-text="t('Panels.MmuPanel.TtgMapDialog.Reset')"
                @action="resetTtgMap" />
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu, TOOL_GATE_UNKNOWN } from '@/composables/useMmu'
import Panel from '@/components/ui/Panel.vue'
import type { FileStateGcodefile } from '@/store/files/types'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import { mdiCloseThick, mdiStateMachine } from '@mdi/js'
import MmuEditTtgMapDialogDetails from '@/components/dialogs/MmuEditTtgMapDialogDetails.vue'
import MmuEditTtgMapDialogTool from '@/components/dialogs/MmuEditTtgMapDialogTool.vue'
import MmuTtgMap from '@/components/panels/Mmu/MmuTtgMap.vue'
import { useBase } from '@/composables/useBase'

const props = withDefaults(
    defineProps<{
        file?: FileStateGcodefile | null
    }>(),
    {
        file: null,
    }
)

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()
const { isMobile } = useBase()
const { mmu, mmuSoftwareVars, ttgMap, doSend } = useMmu()

const allTools = ref(true)
const selectedTool = ref(-1)
const showResetDialog = ref(false)

const titleHeader = computed(() => {
    if (allTools.value) return t('Panels.MmuPanel.TtgMapDialog.MapTools')

    return t('Panels.MmuPanel.TtgMapDialog.MapSlicerTools')
})

const allToolsDisabled = computed(() => props.file === null)

const skipAutomap = computed<boolean>({
    get: () => mmu.value?.slicer_tool_map?.skip_automap ?? false,
    set: (value) => doSend(`MMU_SLICER_TOOL_MAP SKIP_AUTOMAP=${value ? 1 : 0}`),
})

const showSkipAutomap = computed(() => {
    const automapStrategy = mmuSoftwareVars.value?.automap_strategy ?? 'none'

    return props.file !== null && automapStrategy !== 'none'
})

const fileTools = computed(() => {
    const toolsInFile: number[] = []
    props.file?.filament_weights?.forEach((weight, index) => {
        if (weight <= 0) return

        toolsInFile.push(index)
    })

    if (toolsInFile.length === 0) return null

    return toolsInFile
})

const filteredTtgMap = computed(() => {
    const ttgMap_: { tool: number; gate: number }[] = []

    ttgMap.value.forEach((gate, tool) => {
        if (!allTools.value && !fileTools.value?.includes(Number(tool))) return

        ttgMap_.push({ tool: Number(tool), gate })
    })

    return ttgMap_
})

const selectedGate = computed(() => {
    if (selectedTool.value === TOOL_GATE_UNKNOWN) {
        return TOOL_GATE_UNKNOWN
    }

    return ttgMap.value[selectedTool.value]
})

function selectTool(tool: number) {
    if (selectedTool.value === tool) {
        selectedTool.value = TOOL_GATE_UNKNOWN
        return
    }

    selectedTool.value = tool
}

function resetTtgMap() {
    doSend('MMU_TTG_MAP RESET=1\nMMU_ENDLESS_SPOOL RESET=1')
}

function handleEscapePress(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.code === 'Escape') {
        selectedTool.value = -1
    }
}

onMounted(() => {
    document.addEventListener('keydown', handleEscapePress)
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleEscapePress)
})

watch(showDialog, (newValue) => {
    if (!newValue) return

    allTools.value = props.file === null
})
</script>

<style scoped>
.gap-6 {
    gap: 6px;
}

.min-height-300 {
    min-height: 300px;
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
