<template>
    <v-tooltip :disabled="!showDetails" :open-delay="500" location="top">
        <template #activator="{ props: activatorProps }">
            <svg viewBox="0 0 248 500" preserveAspectRatio="xMidYMid meet" :width="spoolWidth" v-bind="activatorProps" :class="svgClasses">
                <defs>
                    <path id="oval" d="M 0 -63 C 35 -63 63 -35 63 0 C 63 35 35 63 0 63 C -35 63 -63 35 -63 0 C -63 -35 -35 -63 0 -63 z" vector-effect="non-scaling-stroke" />
                    <path id="center" d="M 0 -63 C 35 -63 63 -35 63 0 C 63 35 35 63 0 63 L -624 63 L -624 -63 z" vector-effect="non-scaling-stroke" />
                    <path
                        id="espool"
                        d="M 89.561 35.5 L 60.333 15.734 c -0.308 -0.208 -0.704 -0.229 -1.029 -0.055 c -0.327 0.173 -0.531 0.513 -0.531 0.883 v 7.987 c -12.038 0.262 -26.306 5.201 -37.501 13.023 C 7.554 47.155 0 59.894 0 73.438 c 0 0.471 0.329 0.878 0.79 0.978 C 0.86 74.432 0.931 74.438 1 74.438 c 0.386 0 0.747 -0.225 0.911 -0.588 c 7.823 -17.312 26.952 -26.183 56.861 -26.376 v 8.62 c 0 0.37 0.204 0.71 0.531 0.883 c 0.325 0.173 0.722 0.153 1.029 -0.055 l 29.228 -19.766 C 89.835 36.971 90 36.661 90 36.329 S 89.835 35.686 89.561 35.5 z"
                        stroke-width="3"
                        stroke="#CCCCCC"
                        fill="#808080"
                        opacity="0.7" />
                    <radialGradient id="spotlight" cx="50%" cy="70%" r="50%" fx="50%" fy="100%">
                        <stop offset="0%" style="stop-color: rgba(255, 255, 255, 0.9); stop-opacity: 1" />
                        <stop offset="100%" style="stop-color: rgba(255, 255, 0, 0); stop-opacity: 0" />
                    </radialGradient>
                </defs>

                <filter id="blur_wheel2" width="1.3" height="1.16">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                    <feOffset dx="18" dy="0" result="oBlur" />
                    <feFlood flood-color="#000" flood-opacity=".67" />
                    <feComposite in2="oBlur" operator="in" />
                    <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <g transform="matrix(0.59,0,0,3.95,197,250)">
                    <use href="#oval" style="filter: url(#blur_wheel2)" :fill="spoolWheelColor" />
                    <use href="#oval" transform="scale(0.41)" style="filter: url(#blur_wheel2)" :fill="spoolWheelColor" />
                    <use href="#center" transform="scale(0.41)" :fill="spoolWheelColor" />
                </g>
                <path v-if="isNotEmpty" d="M 0 -63 C 35 -63 63 -35 63 0 C 63 35 35 63 0 63 L -424 63 L -424 -63 z" vector-effect="non-scaling-stroke" :fill="filamentColor" :transform="filamentTransform" />
                <g transform="matrix(0.59,0,0,3.95,37,250)">
                    <use href="#oval" style="filter: url(#blur_wheel2)" :fill="spoolWheelColor" />
                    <use href="#oval" transform="scale(0.41)" fill="#111111" />
                </g>
                <rect v-if="isSelected" x="0" y="260" width="258" height="186" fill="url(#spotlight)" />

                <g v-if="showDetails">
                    <text v-if="filamentAmount > 0" x="152" y="270" text-anchor="middle" font-weight="bold" font-size="56px" :fill="contrastColor">{{ filamentAmount }}%</text>
                    <text
                        v-else-if="filamentAmount === 0 && status !== GATE_EMPTY"
                        x="140"
                        y="310"
                        text-anchor="middle"
                        font-weight="bold"
                        font-size="160px"
                        style="fill: red; stroke: #111111; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round">
                        !
                    </text>
                    <use v-if="isEspoolerRewind" href="#espool" transform="translate(225,0) rotate(90) scale(2,2)" />
                    <use v-if="isEspoolerAssist" href="#espool" transform="translate(225,480) rotate(270) scale(2,-2)" />
                </g>
            </svg>
        </template>
        <div class="spool-tooltip">
            <div v-if="tooltipTitle" class="d-block font-weight-bold">{{ tooltipTitle }}</div>
            <div>{{ tooltipText }}</div>
        </div>
    </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu, FILAMENT_POS_LOADED, GATE_AVAILABLE, GATE_EMPTY, NO_FILAMENT_COLOR, TOOL_GATE_BYPASS } from '@/composables/useMmu'
import { filamentTextColor } from '@/plugins/helpers'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import { useServerSpoolmanStore } from '@/store/server/spoolman'
import { useGuiStore } from '@/store/gui'

const props = withDefaults(
    defineProps<{
        spoolWheelColor?: string
        gateIndex: number
        showDetails?: boolean
        isSelected?: boolean
        svgClass?: string
        unhighlightSpools?: boolean
    }>(),
    {
        spoolWheelColor: '#AD8762',
        showDetails: false,
        isSelected: false,
        svgClass: '',
        unhighlightSpools: false,
    }
)

const { t } = useI18n()
const { mmu, mmuFilamentPos, mmuNumGates, mmuSpoolmanSupport, mmuEspoolers, formColorString } = useMmu()
const spoolmanStore = useServerSpoolmanStore()
const guiStore = useGuiStore()

const showUnavailableSpoolColor = computed<boolean>(() => guiStore.view.mmu.showUnavailableSpoolColor ?? false)

const status = computed(() => {
    if (props.gateIndex === TOOL_GATE_BYPASS) {
        if (mmuFilamentPos.value === FILAMENT_POS_LOADED) return GATE_AVAILABLE
        return GATE_EMPTY
    }
    return mmu.value?.gate_status?.[props.gateIndex] ?? GATE_EMPTY
})

const filamentColor = computed(() => formColorString(mmu.value?.gate_color?.[props.gateIndex] ?? null))

const filamentAmount = computed(() => {
    if (status.value === GATE_EMPTY && !(showUnavailableSpoolColor.value && filamentColor.value !== NO_FILAMENT_COLOR)) return 0

    if (!spool.value || mmuSpoolmanSupport.value === 'off') return -1

    const remaining = spool.value.remaining_weight ?? null
    const total = spool.value.initial_weight ?? spool.value.filament?.weight ?? null
    if (remaining === null || total === null) return -1

    return Math.ceil(Math.max(0, Math.min(100, (remaining / total) * 100)))
})

const isNotEmpty = computed(() => filamentAmount.value !== 0 || status.value !== GATE_EMPTY)

const spoolId = computed(() => mmu.value?.gate_spool_id?.[props.gateIndex] ?? -1)

const spool = computed<ServerSpoolmanStateSpool | null>(() => {
    const spools = spoolmanStore.spools ?? []
    return spools.find((spool: ServerSpoolmanStateSpool) => spool.id === spoolId.value) ?? null
})

const spoolName = computed(() => {
    const mmuSpoolName = mmu.value?.gate_filament_name?.[props.gateIndex]

    return spool.value?.filament?.name || mmuSpoolName || t('Panels.MmuPanel.Unknown')
})

const filamentMaterial = computed(() => mmu.value?.gate_material?.[props.gateIndex] || t('Panels.MmuPanel.Unknown'))

const filamentTemperature = computed(() => mmu.value?.gate_temperature?.[props.gateIndex] ?? -1)

const filamentTransformScale1 = computed(() => {
    const start = 0.28
    const end = 0.4

    if (filamentAmount.value < 0) return end

    return start + (end - start) * (filamentAmount.value / 100)
})

const filamentTransformScale2 = computed(() => {
    const start = 1.65
    const end = 3.5

    if (filamentAmount.value < 0) return end

    return start + (end - start) * (filamentAmount.value / 100)
})

const filamentTransform = computed(() => `matrix(${filamentTransformScale1.value},0,0,${filamentTransformScale2.value},197,250)`)

const contrastColor = computed(() => filamentTextColor(filamentColor.value))

const isEspoolerRewind = computed(() => {
    if (mmuEspoolers.value) return mmuEspoolers.value[props.gateIndex] === 'rewind'

    return props.gateIndex === mmu.value?.gate && mmu.value?.espooler_active === 'rewind'
})

const isEspoolerAssist = computed(() => {
    if (mmuEspoolers.value) return mmuEspoolers.value[props.gateIndex] === 'assist'

    return props.gateIndex === mmu.value?.gate && mmu.value?.espooler_active === 'assist'
})

const spoolWidth = computed(() => {
    if (mmuNumGates.value <= 8) return 56
    if (mmuNumGates.value <= 16) return 48

    return 40
})

const tooltipTitle = computed(() => {
    if (status.value === GATE_EMPTY) return null

    return spoolName.value
})

const tooltipText = computed(() => {
    if (status.value === GATE_EMPTY) {
        return t('Panels.MmuPanel.ToolTip.Empty')
    }

    const output = []

    let temperature = ''
    if (filamentTemperature.value > 0) {
        temperature = ` | ${filamentTemperature.value}°C`
    }
    output.push(filamentMaterial.value + temperature)

    if (filamentColor.value !== NO_FILAMENT_COLOR) {
        let color = filamentColor.value.substring(0, 7)
        const alpha = filamentColor.value.length > 7 ? filamentColor.value.substring(7, 9) : 'FF'
        if (alpha.toUpperCase() !== 'FF') color += alpha

        output.push(`${t('Panels.MmuPanel.ToolTip.Color')}: ${color}`)
    }

    if (spoolId.value > 0) {
        output.push(`${t('Panels.MmuPanel.ToolTip.SpoolId')}: ${spoolId.value}`)
    }

    return output.join('\n')
})

const svgClasses = computed(() => {
    const classes = [props.svgClass]
    if (props.isSelected) classes.push('isSelected')
    if (!props.isSelected && props.unhighlightSpools) classes.push('unhighlighted')

    return classes
})
</script>

<style scoped>
svg {
    outline: none;
    transition:
        transform 0.2s,
        opacity 0.2s;
}

svg.unhighlighted {
    opacity: 0.4;
}

svg.isSelected {
    transform: translateY(-8px) !important;
    opacity: 1 !important;
}

svg:hover {
    transform: translateY(-4px);
}

.spool-tooltip {
    white-space: pre;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
