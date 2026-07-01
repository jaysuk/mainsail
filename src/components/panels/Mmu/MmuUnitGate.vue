<template>
    <div class="d-flex flex-column align-center" :class="cursorType" @click="handleClickGate" @contextmenu.prevent>
        <div class="d-flex flex-wrap mb-n5 pt-1 position-relative">
            <mmu-unit-gate-spool class="position-relative zindex-1" :gate-index="gateIndex" :show-details="showDetails" :is-selected="isSelected" :unhighlight-spools="unhighlightSpools" />
        </div>

        <div class="mmu-unit-box d-flex zindex-3 pb-1 pt-2 position-relative" :class="gateClass">
            <div class="d-flex w-100 gate-contents">
                <span class="gate-number rounded" :class="gateNumberClass">
                    {{ gateName }}
                </span>
            </div>
        </div>
        <mmu-unit-gate-menu
            v-model="contextMenu"
            :gate-index="gateIndex"
            :mmu-machine-unit="mmuMachineUnit"
            :menu-x="menuX"
            :menu-y="menuY"
            :selected-gate="selectedGate"
            @select-gate="selectGate"
            @edit-filament="emit('edit-filament', $event)" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import type { LongpressEvent } from '@/directives/longpress'
import { useMmu, type MmuMachineUnit, TOOL_GATE_BYPASS } from '@/composables/useMmu'
import MmuUnitGateMenu from '@/components/panels/Mmu/MmuUnitGateMenu.vue'
import MmuUnitGateSpool from '@/components/panels/Mmu/MmuUnitGateSpool.vue'

const props = withDefaults(
    defineProps<{
        gateIndex: number
        mmuMachineUnit?: MmuMachineUnit
        showDetails?: boolean
        showContextMenu?: boolean
        selectedGate: number
        unhighlightSpools?: boolean
        hasBypass?: boolean
    }>(),
    {
        showDetails: false,
        showContextMenu: false,
        unhighlightSpools: false,
        hasBypass: false,
    }
)

const emit = defineEmits<{
    'select-gate': [gateIndex: number]
    'edit-filament': [gateIndex: number]
}>()

const { mmu } = useMmu()

let closeTimeout: number | null = null
const contextMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)

const cursorType = computed(() => (props.showContextMenu ? 'gate-menu' : 'gate-selection'))

const gateName = computed(() => (props.gateIndex === TOOL_GATE_BYPASS ? 'Bypass' : props.gateIndex.toString()))

const gateStatus = computed(() => mmu.value?.gate_status[props.gateIndex] ?? 0)

const isSelected = computed(() => props.selectedGate === props.gateIndex)

const gateNumberClass = computed(() => ({
    active: isSelected.value,
    'border-unknown': gateStatus.value < 0,
    'border-active': gateStatus.value > 0,
    bypass: props.gateIndex === TOOL_GATE_BYPASS,
}))

const gatePosition = computed(() => {
    const firstGateNumber = props.mmuMachineUnit?.first_gate ?? 0
    return props.gateIndex + 1 - firstGateNumber
})

const firstGate = computed(() => !props.mmuMachineUnit || gatePosition.value === 1)

const lastGate = computed(() => {
    if (!props.mmuMachineUnit || props.gateIndex === TOOL_GATE_BYPASS) return true

    return gatePosition.value === props.mmuMachineUnit?.num_gates && !props.hasBypass
})

const gateClass = computed(() => ({
    'left-gate': firstGate.value,
    'right-gate': lastGate.value,
}))

function selectGate() {
    emit('select-gate', props.gateIndex)
}

function clearCloseTimeout() {
    if (closeTimeout === null) return
    clearTimeout(closeTimeout)
    closeTimeout = null
}

function closeContextMenu() {
    clearCloseTimeout()
    contextMenu.value = false
}

function openContextMenu(e: MouseEvent | LongpressEvent) {
    e.preventDefault()

    menuX.value = (e.clientX ?? 0) - 20
    menuY.value = (e.clientY ?? 0) - 20

    closeContextMenu()

    contextMenu.value = true
    closeTimeout = window.setTimeout(() => {
        closeContextMenu()
    }, 8000)
}

function handleClickGate(e: MouseEvent) {
    if (props.showContextMenu) return openContextMenu(e)

    selectGate()
}

onBeforeUnmount(() => {
    clearCloseTimeout()
})
</script>

<style scoped>
.zindex-1 {
    z-index: 1;
}

.zindex-3 {
    z-index: 3;
}

.gate-number {
    margin-left: 2px;
    border: 2px solid #808080;
    width: 80%;
    position: relative;
    z-index: 4;
    text-align: center;
    color: #c0c0c0;
    font-weight: bold;
    line-height: 16px;
    font-size: 14px;
}

html.theme--light .gate-number {
    color: #5d5d5d;
}

.gate-number.active {
    color: #000000;
    background-color: limegreen;
}

.gate-number.bypass {
    font-size: 10px;
    text-transform: uppercase;
    width: 90%;
    border-color: transparent !important;
}

.gate-number.border-active {
    border-color: green;
}

.gate-number.border-unknown {
    border-color: orange;
}

.mmu-unit-box {
    box-shadow: inset 0 4px 4px -4px #ffffff80;
    background-image: linear-gradient(to bottom, #3c3c3c 0%, #2c2c2c 100%);
    justify-content: center;
    width: 100%;
}

html.theme--light .mmu-unit-box {
    box-shadow: inset 0 4px 4px -4px #ffffff80;
    background-image: linear-gradient(to bottom, #c0c0c0 0%, #f0f0f0 100%);
}

.left-gate {
    border-radius: 8px 0 0 0;
    margin-left: -16px;
    width: calc(100% + 16px);
}

.left-gate .gate-contents {
    margin-left: 16px;
}

.right-gate {
    border-radius: 0 8px 0 0;
    margin-right: -16px;
    width: calc(100% + 16px);
}

.right-gate .gate-contents {
    margin-right: 16px;
}

.left-gate.right-gate {
    border-radius: 8px 8px 0 0;
    width: calc(100% + 32px);
    margin-right: -16px;
}

.gate-selection {
    cursor: pointer;
}

.gate-menu {
    cursor: context-menu;
}
</style>
