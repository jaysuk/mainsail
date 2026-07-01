<template>
    <v-container>
        <v-row>
            <v-col class="pt-0 text-subtitle-2 text-medium-emphasis">
                {{ spoolmanSupportOutput }}
            </v-col>
        </v-row>

        <!-- GATE DETAILS-->
        <v-row>
            <v-col cols="12" md="6">
                <v-row>
                    <v-col v-if="!hideSpoolmanSwitch" cols="6" class="d-flex align-center">
                        <v-switch v-model="useSpoolman" :label="t('Panels.MmuPanel.GateMapDialog.Spoolman')" hide-details class="pt-0 mt-0" @update:model-value="resetSpoolId" />
                    </v-col>
                    <v-col :cols="hideSpoolmanSwitch ? 12 : 6">
                        <v-text-field v-model="spoolId" type="number" :label="t('Panels.MmuPanel.GateMapDialog.SpoolmanId')" :rules="spoolIdRules" :disabled="disableSpoolId" hide-spin-buttons variant="outlined" density="compact" hide-details />
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="12">
                        <v-text-field v-model.trim="filamentName" :label="t('Panels.MmuPanel.GateMapDialog.FilamentName')" :disabled="disableFilamentFields" variant="outlined" density="compact" clearable hide-details />
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="6">
                        <v-text-field v-model.trim="filamentMaterial" :label="t('Panels.MmuPanel.GateMapDialog.Material')" :disabled="disableFilamentFields" variant="outlined" density="compact" clearable hide-details />
                    </v-col>
                    <v-col cols="4" class="offset-2">
                        <v-text-field
                            v-model="filamentTemperature"
                            type="number"
                            :label="t('Panels.MmuPanel.GateMapDialog.Temperature')"
                            :disabled="disableFilamentFields"
                            :hide-spin-buttons="disableFilamentFields"
                            suffix="°C"
                            :rules="temperatureRules"
                            variant="outlined"
                            density="compact"
                            hide-details />
                    </v-col>
                </v-row>
                <v-divider class="my-6" />
                <v-row>
                    <v-col>
                        <v-switch v-model="gateStatusSwitch" :label="gateStatusLabel" hide-details class="pt-0 mt-0" />
                    </v-col>
                </v-row>

                <v-row>
                    <v-col>
                        <v-list-subheader class="px-0 height-auto">
                            <v-icon size="small" class="mr-2">{{ mdiSpeedometer }}</v-icon>
                            <span>{{ t('Panels.MmuPanel.GateMapDialog.LoadSpeed') }}</span>
                            <v-spacer />
                            <v-text-field v-model="speedOverride" type="number" suffix="%" hide-spin-buttons hide-details variant="outlined" density="compact" readonly class="_slider-input d-flex align-center pt-1">
                                <template v-if="speedOverride !== 100" #append>
                                    <v-icon size="small" @click="resetSpeed">{{ mdiRestart }}</v-icon>
                                </template>
                            </v-text-field>
                        </v-list-subheader>

                        <v-slider v-model="speedOverride" class="px-0 pt-2 pb-0" :min="FILAMENT_SPEED_OVERRIDE_MIN" :max="FILAMENT_SPEED_OVERRIDE_MAX" hide-details>
                            <template #prepend>
                                <v-icon :disabled="speedOverride <= FILAMENT_SPEED_OVERRIDE_MIN" @click="decrementSpeed">
                                    {{ mdiMinus }}
                                </v-icon>
                            </template>
                            <template #append>
                                <v-icon :disabled="speedOverride >= FILAMENT_SPEED_OVERRIDE_MAX" @click="incrementSpeed">
                                    {{ mdiPlus }}
                                </v-icon>
                            </template>
                        </v-slider>
                    </v-col>
                </v-row>
            </v-col>

            <v-col cols="12" md="6" class="d-flex justify-center align-center">
                <v-color-picker v-if="!useSpoolman" :model-value="filamentColor" hide-inputs swatches-max-height="120px" show-swatches mode="hexa" show-alpha hide-opacity="false" @update:model-value="selectFilamentColor" />
                <div v-else>
                    <div :class="!spoolIdExists ? 'no-spool' : ''">
                        <spool-icon class="w-100" height="120" :color="spoolmanColor" :multi-color-hexes="spoolmanSpool?.filament?.multi_color_hexes" :multi-color-direction="spoolmanSpool?.filament?.multi_color_direction" @click-spool="showSpoolmanSpoolChooserDialog = true" />
                        <div class="pt-4">{{ t('Panels.SpoolmanPanel.LastUsed') }}: {{ spoolmanLastUsed }}</div>
                        <div>
                            <strong>{{ spoolmanRemainingWeight }}</strong>
                            <small class="ml-1">/ {{ spoolmanTotalWeight }}</small>
                        </div>
                    </div>
                    <div class="mt-3">
                        <v-btn color="secondary" @click="showSpoolmanSpoolChooserDialog = true">
                            <v-icon start>{{ mdiAdjust }}</v-icon>
                            {{ t('Panels.MmuPanel.GateMapDialog.ChooseSpool') }}
                        </v-btn>
                    </div>
                </div>
            </v-col>
        </v-row>

        <!-- SPOOLMAN (ADAPTED) SPOOL SELECTOR -->
        <spoolman-change-spool-dialog v-model="showSpoolmanSpoolChooserDialog" :set-active-spool="false" @select-spool="selectSpoolmanSpool" />
    </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu, GATE_EMPTY, GATE_AVAILABLE, GATE_AVAILABLE_FROM_BUFFER, GATE_UNKNOWN, FILAMENT_SPEED_OVERRIDE_MIN, FILAMENT_SPEED_OVERRIDE_MAX } from '@/composables/useMmu'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import { mdiSpeedometer, mdiRestart, mdiMinus, mdiPlus, mdiAdjust } from '@mdi/js'
import SpoolIcon from '@/components/ui/SpoolIcon.vue'
import SpoolmanChangeSpoolDialog from '@/components/dialogs/SpoolmanChangeSpoolDialog.vue'
import { useServerSpoolmanStore } from '@/store/server/spoolman'
import { usePrinterStore } from '@/store/printer'

const props = defineProps<{
    selectedGate: number
}>()

const { t } = useI18n()
const { mmu, mmuSpoolmanSupport, doSend, formColorString } = useMmu()
const printerStore = usePrinterStore()
const spoolmanStore = useServerSpoolmanStore()

const useSpoolman = ref(false)
const showSpoolmanSpoolChooserDialog = ref(false)

const extruderSettings = computed(() => printerStore.extruder ?? undefined)

const minExtruderTemp = computed(() => extruderSettings.value?.min_extrude_temp ?? 170)

const maxExtruderTemp = computed(() => extruderSettings.value?.max_temp ?? 290)

const spoolmanSupportOutput = computed(() => {
    if (mmuSpoolmanSupport.value === 'off') return t('Panels.MmuPanel.GateMapDialog.SpoolmanOff')
    else if (mmuSpoolmanSupport.value === 'pull') return t('Panels.MmuPanel.GateMapDialog.SpoolmanPull')

    return t('Panels.MmuPanel.GateMapDialog.SpoolmanOther', { mode: mmuSpoolmanSupport.value })
})

const spoolmanSpools = computed<ServerSpoolmanStateSpool[]>(() => spoolmanStore.spools ?? [])

const spoolIdRules = computed(() => [
    (val: string | number) => {
        const numValue = typeof val === 'string' ? parseInt(val) : val
        if (!numValue || numValue <= 0) return true
        const spoolExists = spoolmanSpools.value.some((spool: ServerSpoolmanStateSpool) => spool.id === numValue)
        return spoolExists ? true : t('Panels.MmuPanel.GateMapDialog.NoMatchingSpool')
    },
])

function setMmuGateMap(attribute: string, value: string | number) {
    let escapedValue: string | number = value
    if (typeof value === 'string' && value.includes(' ')) {
        escapedValue = `"${value}"`
    }

    const gcode = `MMU_GATE_MAP GATE=${props.selectedGate} ${attribute.toUpperCase()}=${escapedValue} QUIET=1`
    doSend(gcode)
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined
function debounceSetMmuGateMap(attribute: string, value: string | number) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        setMmuGateMap(attribute, value)
    }, 500)
}

function resetSpoolId() {
    if (spoolId.value === -1) return

    setMmuGateMap('spoolid', -1)
}

const spoolId = computed<number | string>({
    get: () => mmu.value?.gate_spool_id[props.selectedGate] ?? -1,
    set: (newSpoolId) => {
        const spool_id = typeof newSpoolId !== 'number' ? parseInt(newSpoolId) : newSpoolId
        if (isNaN(spool_id)) return

        const isValid = spoolIdRules.value.every((rule) => rule(spool_id) === true)
        if (!isValid) return

        if (spool_id === -1) {
            resetSpoolId()
            return
        }

        const spool = spoolmanSpools.value.find((spool: ServerSpoolmanStateSpool) => spool.id === spool_id)
        if (!spool) return

        const name = String(spool?.filament?.name ?? t('Panels.MmuPanel.Unknown')).replace(/["']/g, '')
        const material = String(spool?.filament?.material ?? t('Panels.MmuPanel.Unknown')).replace(/["']/g, '')
        const color = formColorString(spool?.filament?.color_hex ?? null).slice(1)
        const temperature = spool?.filament?.settings_extruder_temp ?? -1

        const gcode = `MMU_GATE_MAP GATE=${props.selectedGate} SPOOLID=${spool_id} NAME="${name}" MATERIAL="${material}" COLOR="${color}" TEMP=${temperature} QUIET=1`
        doSend(gcode)
    },
})

const spoolmanSpool = computed(() => spoolmanSpools.value.find((spool: ServerSpoolmanStateSpool) => spool.id === spoolId.value) ?? null)

const spoolIdExists = computed(() => spoolmanSpool.value ?? false)

const disableSpoolId = computed(() => !useSpoolman.value || ['pull', 'off'].includes(mmuSpoolmanSupport.value))

const disableFilamentFields = computed(() => useSpoolman.value || mmuSpoolmanSupport.value === 'pull')

const hideSpoolmanSwitch = computed(() => ['pull', 'off'].includes(mmuSpoolmanSupport.value))

const filamentName = computed<string>({
    get: () => mmu.value?.gate_filament_name[props.selectedGate] ?? t('Panels.MmuPanel.Unknown'),
    set: (newName) => {
        const value = String(newName ?? 'Unknown').replace(/["']/g, '')

        debounceSetMmuGateMap('name', value)
    },
})

const filamentMaterial = computed<string>({
    get: () => mmu.value?.gate_material[props.selectedGate] ?? t('Panels.MmuPanel.Unknown'),
    set: (newValue) => {
        const value = String(newValue ?? 'Unknown').replace(/["']/g, '')
        debounceSetMmuGateMap('material', value)
    },
})

const temperatureRules = computed(() => [
    (v: string | number) => {
        const num = parseFloat(String(v))
        return !isNaN(num) && num >= minExtruderTemp.value && num <= maxExtruderTemp.value ? true : t('Panels.MmuPanel.GateMapDialog.BadTemperature')
    },
])

const filamentTemperature = computed<number>({
    get: () => mmu.value?.gate_temperature[props.selectedGate] ?? 0,
    set: (newValue) => {
        const isValid = temperatureRules.value.every((rule) => rule(newValue) === true)
        if (!isValid) return

        debounceSetMmuGateMap('temp', newValue)
    },
})

const filamentColor = computed<string>({
    get: () => formColorString(mmu.value?.gate_color[props.selectedGate] ?? null),
    set: (newValue) => {
        if (filamentColor.value.toUpperCase() === newValue.toUpperCase()) return

        setMmuGateMap('color', newValue.slice(1))
    },
})

const gateStatus = computed(() => mmu.value?.gate_status[props.selectedGate] ?? GATE_UNKNOWN)

const gateStatusSwitch = computed<boolean>({
    get: () => gateStatus.value === GATE_AVAILABLE || gateStatus.value === GATE_AVAILABLE_FROM_BUFFER,
    set: (value) => setMmuGateMap('available', value ? GATE_AVAILABLE : GATE_EMPTY),
})

const gateStatusLabel = computed(() => {
    switch (gateStatus.value) {
        case GATE_EMPTY:
            return t('Panels.MmuPanel.GateMapDialog.FilamentEmpty')
        case GATE_UNKNOWN:
            return t('Panels.MmuPanel.GateMapDialog.FilamentUnknown')
        default:
            return t('Panels.MmuPanel.GateMapDialog.FilamentAvailable')
    }
})

const speedOverride = computed<number>({
    get: () => mmu.value?.gate_speed_override[props.selectedGate] ?? 100,
    set: (newValue) => {
        const value = isNaN(newValue) ? 100 : Math.min(Math.max(newValue, FILAMENT_SPEED_OVERRIDE_MIN), FILAMENT_SPEED_OVERRIDE_MAX)
        debounceSetMmuGateMap('speed', value)
    },
})

const spoolmanColor = computed<string>(() => `#${spoolmanSpool.value?.filament?.color_hex ?? '000'}`)

const spoolmanRemainingWeight = computed(() => {
    if (!spoolmanSpool.value) return '-'

    const remaining = spoolmanSpool.value.remaining_weight ?? 0
    return `${remaining.toFixed(0)}g`
})

const spoolmanTotalWeight = computed(() => {
    if (!spoolmanSpool.value) return '-'

    const total = spoolmanSpool.value.initial_weight ?? spoolmanSpool.value.filament?.weight ?? 0
    if (total < 1000) {
        return `${total.toFixed(0)}g`
    }

    let totalRound = Math.round(total / 1000)
    if (totalRound !== total / 1000) {
        totalRound = Math.round(total / 100) / 10
    }

    return `${totalRound}kg`
})

const spoolmanLastUsed = computed(() => {
    if (!spoolmanSpool.value) return '-'

    const last_used = spoolmanSpool.value.last_used ?? null
    if (!last_used) return t('Panels.SpoolmanPanel.Never')

    const date = new Date(spoolmanSpool.value.last_used)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff <= 1000 * 60 * 60 * 24) return t('Panels.SpoolmanPanel.Today')
    if (diff <= 1000 * 60 * 60 * 24 * 2) return t('Panels.SpoolmanPanel.Yesterday')
    if (diff <= 1000 * 60 * 60 * 24 * 14) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        return t('Panels.SpoolmanPanel.DaysAgo', { days })
    }

    return date.toLocaleDateString()
})

let colorDebounceTimer: ReturnType<typeof setTimeout> | undefined
function selectFilamentColor(newColor: string | { hexa: string }): void {
    if (colorDebounceTimer) clearTimeout(colorDebounceTimer)
    colorDebounceTimer = setTimeout(() => {
        filamentColor.value = typeof newColor === 'string' ? newColor : newColor.hexa
    }, 500)
}

function selectSpoolmanSpool(newSpool: ServerSpoolmanStateSpool) {
    spoolId.value = newSpool.id
}

function decrementSpeed() {
    const value = Math.max(FILAMENT_SPEED_OVERRIDE_MIN, Math.round(speedOverride.value - 10))
    setMmuGateMap('speed', value)
}

function incrementSpeed() {
    const value = Math.min(FILAMENT_SPEED_OVERRIDE_MAX, Math.round(speedOverride.value + 10))
    setMmuGateMap('speed', value)
}

function resetSpeed() {
    setMmuGateMap('speed', 100)
}

watch(
    () => props.selectedGate,
    () => {
        useSpoolman.value = spoolId.value === null || Number(spoolId.value) > 0
    },
    { immediate: true }
)
</script>

<style scoped>
.height-auto {
    height: auto !important;
}

.no-spool {
    opacity: 0.3;
}

._slider-input {
    min-width: 5.2rem;
    max-width: 5.2rem;
    margin-left: 12px;
}

._slider-input :deep(.v-field__input) {
    padding-top: 4px;
    padding-bottom: 4px;
    min-height: 1rem !important;
}

._slider-input :deep(.v-field__append-inner) {
    margin: auto -5px auto 0 !important;
}
</style>
