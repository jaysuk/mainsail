<template>
    <v-list-item :lines="lines" :class="listItemClass">
        <div class="text-overline reduced-line-height" :class="toplineClass">{{ title }}</div>
        <v-list-item-title :class="titleClass">
            {{ name }}
        </v-list-item-title>
        <v-list-item-subtitle class="d-flex justify-space-between w-100" :class="subtitleClass">
            {{ subtitle }}
        </v-list-item-subtitle>
        <v-list-item-subtitle class="d-flex justify-space-between w-100 smaller-font">
            {{ extra }}
        </v-list-item-subtitle>
    </v-list-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import { useMmu, TOOL_GATE_BYPASS } from '@/composables/useMmu'
import { useServerSpoolmanStore } from '@/store/server/spoolman'

const props = withDefaults(
    defineProps<{
        gateIndex: number
        compact?: boolean
    }>(),
    {
        compact: false,
    }
)

const { t } = useI18n()
const { mmu } = useMmu()
const spoolmanStore = useServerSpoolmanStore()

const gateStatus = computed(() => {
    const status = mmu.value?.gate_status ?? []

    return status[props.gateIndex] ?? 0
})

const lines = computed(() => (props.compact ? 'three' : 'two'))

const gateMaterial = computed(() => {
    const materials = mmu.value?.gate_material ?? []

    return materials[props.gateIndex] || t('Panels.MmuPanel.Unknown')
})

const gateTemperature = computed(() => {
    const temperatures = mmu.value?.gate_temperature ?? []

    return temperatures[props.gateIndex] || -1
})

const gateSpeedOverride = computed(() => {
    const speedOverrides = mmu.value?.gate_speed_override ?? []

    return speedOverrides[props.gateIndex] || 100
})

const gateSpoolId = computed(() => {
    const spoolIds = mmu.value?.gate_spool_id ?? []

    return spoolIds[props.gateIndex] || -1
})

const spoolmanSpool = computed<ServerSpoolmanStateSpool | null>(() => {
    const spools = spoolmanStore.spools ?? []

    return spools.find((s: ServerSpoolmanStateSpool) => s.id === gateSpoolId.value) ?? null
})

const vendorText = computed(() => spoolmanSpool.value?.filament?.vendor?.name ?? t('Panels.MmuPanel.Unknown'))

const title = computed(() => {
    const output = []

    if (!props.compact && props.gateIndex === TOOL_GATE_BYPASS) output.push('Bypass')
    else if (!props.compact) output.push(`@${props.gateIndex}`)

    if (vendorText.value) output.push(vendorText.value)

    return output.join(' | ')
})

const name = computed(() => {
    const names = mmu.value?.gate_filament_name ?? []

    return names[props.gateIndex] || t('Panels.MmuPanel.Unknown')
})

const subtitle = computed(() => {
    const output = [gateMaterial.value]
    if (gateTemperature.value > 0) output.push(`${gateTemperature.value}°C`)
    if (gateSpeedOverride.value !== 100) output.push(`Speed: ${gateSpeedOverride.value.toFixed(0)}%`)

    return output.join(' | ')
})

const weightText = computed(() => {
    const remaining = spoolmanSpool.value?.remaining_weight ?? null
    const total = spoolmanSpool.value?.initial_weight ?? spoolmanSpool.value?.filament?.weight ?? null
    if (remaining === null || total === null) return null

    if (total >= 1000) {
        let totalRound = Math.floor(total / 1000)
        if (totalRound !== total / 1000) {
            totalRound = Math.round(total / 100) / 10
        }

        return `${Math.round(remaining)}g / ${totalRound}kg`
    }

    return `${Math.round(remaining)} / ${Math.round(total)}g`
})

const lengthText = computed(() => {
    const remaining = spoolmanSpool.value?.remaining_length ?? null
    if (remaining === null) return null

    return `${Math.round(remaining / 1000)}m`
})

const extra = computed(() => {
    if (!spoolmanSpool.value) return 'No spool ID'

    const output = [`Spool ID: #${gateSpoolId.value}`]
    if (weightText.value) output.push(weightText.value)
    if (lengthText.value) output.push(lengthText.value)

    return output.join(' | ')
})

const listItemClass = computed(() => ({
    'disabled-panel': !gateStatus.value,
    'px-0': props.compact,
}))

const toplineClass = computed(() => ({
    'mb-2': !props.compact,
    'mb-1': props.compact,
    'small-overline-font': props.compact,
}))

const titleClass = computed(() => ({
    'text-h7': props.compact,
    'text-h6': !props.compact,
    'mb-1': true,
}))

const subtitleClass = computed(() => ({
    'smaller-font': props.compact,
}))
</script>

<style scoped>
.reduced-line-height {
    line-height: 1em;
}

.smaller-font {
    font-size: 0.8em;
}

.small-overline-font {
    line-height: 0.7em;
    font-size: 0.7em !important;
}

.disabled-panel {
    opacity: 0.5;
}
</style>
