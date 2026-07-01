<template>
    <v-menu v-model="showContextMenu" transition="slide-y-transition" :target="[menuX, menuY]" :close-on-content-click="false">
        <v-list density="compact" @mouseleave="closeContextMenu">
            <v-list-subheader class="d-block text-subtitle-2 text-center mb-0 h-auto pb-2">
                {{ contextMenuHeader }}
            </v-list-subheader>
            <v-divider class="mb-2" />
            <mmu-unit-gate-menu-item v-for="(item, index) in contextMenuItems" :key="index" :item="item" :gate-index="gateIndex" @close-context-menu="closeContextMenu" />
        </v-list>
    </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu, type MmuMachineUnit, TOOL_GATE_BYPASS, FILAMENT_POS_LOADED, type MmuUnitGateContextMenuItem } from '@/composables/useMmu'
import { mdiSwapHorizontal, mdiDownloadOutline, mdiEject, mdiAxisArrow, mdiDatabaseEdit } from '@mdi/js'
import MmuUnitGateMenuItem from '@/components/panels/Mmu/MmuUnitGateMenuItem.vue'
import { useBase } from '@/composables/useBase'

const props = defineProps<{
    gateIndex: number
    mmuMachineUnit: MmuMachineUnit | undefined
    selectedGate: number
    menuX: number
    menuY: number
}>()

const emit = defineEmits<{
    'edit-filament': [gateIndex: number]
    'select-gate': [gateIndex: number]
}>()

const showContextMenu = defineModel<boolean>({ required: true })

const { t } = useI18n()
const { printerIsPrintingOnly } = useBase()
const { mmuFilamentPos, canSend } = useMmu()

const gateName = computed(() => (props.gateIndex === TOOL_GATE_BYPASS ? 'Bypass' : props.gateIndex.toString()))

const contextMenuHeader = computed(() => {
    if (props.gateIndex >= 0) return `${t('Panels.MmuPanel.Gate')} ${props.gateIndex}`

    return gateName.value
})

const canCrossload = computed(() => props.mmuMachineUnit?.can_crossload ?? false)

const isLoaded = computed(() => mmuFilamentPos.value === FILAMENT_POS_LOADED)

const isSelectedGate = computed(() => props.gateIndex === props.selectedGate)

function editFilament() {
    emit('edit-filament', props.gateIndex)
}

function selectGate() {
    emit('select-gate', props.gateIndex)
}

function closeContextMenu() {
    showContextMenu.value = false
}

const contextMenuItems = computed<MmuUnitGateContextMenuItem[]>(() => {
    const items: MmuUnitGateContextMenuItem[] = [
        {
            icon: mdiSwapHorizontal,
            label: t('Panels.MmuPanel.ButtonSelect'),
            loading: '',
            action: { kind: 'call', fn: () => selectGate() },
            disabled: () => !canSend.value || isSelectedGate.value || printerIsPrintingOnly.value || isLoaded.value,
        },
        {
            icon: mdiDatabaseEdit,
            label: t('Panels.MmuPanel.EditGateMap'),
            loading: '',
            action: { kind: 'call', fn: () => editFilament() },
            disabled: () => false,
        },
        {
            icon: mdiDownloadOutline,
            label: t('Panels.MmuPanel.ButtonPreload'),
            loading: 'mmu_preload',
            action: { kind: 'gcode', command: 'MMU_PRELOAD' },
            disabled: () => !canSend.value || (!isSelectedGate.value && !canCrossload.value) || (isSelectedGate.value && isLoaded.value),
        },
        {
            icon: mdiEject,
            label: t('Panels.MmuPanel.ButtonEject'),
            loading: 'mmu_eject',
            action: { kind: 'gcode', command: 'MMU_EJECT' },
            disabled: () => !canSend.value || (props.gateIndex !== props.selectedGate && !canCrossload.value),
        },
        {
            icon: mdiAxisArrow,
            label: t('Panels.MmuPanel.ButtonChangeTool'),
            loading: 'mmu_change_tool',
            action: { kind: 'gcode', command: 'MMU_CHANGE_TOOL' },
            disabled: () => !canSend.value || isSelectedGate.value || printerIsPrintingOnly.value,
        },
    ]

    if (props.gateIndex < 0) return items.slice(0, 1)

    return items
})
</script>
