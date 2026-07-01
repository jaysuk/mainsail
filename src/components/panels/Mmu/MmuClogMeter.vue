<template>
    <svg viewBox="0 0 140 140" preserveAspectRatio="xMidYMid meet" :class="svgClasses">
        <g transform="rotate(120 70 70)">
            <circle cx="70" cy="70" r="50" class="v-progress-circular__underlay" fill="transparent" stroke-width="18" :stroke-dasharray="CIRCUMFERENCE" :stroke-dashoffset="DIAL_ARC" />
            <circle ref="dialCircle" cx="70" cy="70" r="50" class="primary-color" fill="transparent" stroke-width="18" :stroke-dasharray="CIRCUMFERENCE" :stroke-dashoffset="dashOffset" />
        </g>
        <g :transform="headroomTransform">
            <circle cx="70" cy="70" r="50" class="warning-color" fill="transparent" stroke-width="18" opacity="0.3" :stroke-dasharray="CIRCUMFERENCE" :stroke-dashoffset="headroomArc" />
        </g>

        <line :x1="x1MinHeadroom" :y1="y1MinHeadroom" x2="70" y2="70" :class="minHeadroomLineClasses" stroke-width="4" stroke-dashoffset="0" stroke-dasharray="23,63" />
        <line :x1="X1_START" :y1="Y1_START" x2="70" y2="70" stroke="white" stroke-width="2" stroke-dashoffset="0" stroke-dasharray="22,63" />
        <line :x1="X1_END" :y1="Y1_END" x2="70" y2="70" class="warning-color" stroke-width="2" stroke-dashoffset="0" stroke-dasharray="22,63" />

        <text x="70" y="68" text-anchor="middle" class="small-text-color" font-size="12px">
            {{ t('Panels.MmuPanel.Flowrate').toUpperCase() }}
        </text>
        <text x="70" y="90" text-anchor="middle" class="small-text-color" font-size="20px">{{ encoderFlowRate }}%</text>
        <text v-if="encoderDetectionMode === 2" x="70" y="122" text-anchor="middle" class="small-text-color" font-size="12px">Auto</text>
        <text x="32" y="139" text-anchor="end" class="small-text-color" font-size="12px">
            {{ encoderDetectionLength }}
        </text>
        <text x="106" y="139" class="small-text-color" font-size="12px">0</text>
    </svg>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu, DIRECTION_UNKNOWN } from '@/composables/useMmu'

const { t } = useI18n()
const { mmuEncoder } = useMmu()

const dialCircle = ref<SVGCircleElement | null>(null)

const ROTATION_TIME = 1
const CIRCUMFERENCE = 2 * Math.PI * 50
const DIAL_ARC = CIRCUMFERENCE * (60 / 360)
const X1_START = 70 + 63 * Math.cos((120 * Math.PI) / 180)
const Y1_START = 70 + 63 * Math.sin((120 * Math.PI) / 180)
const X1_END = 70 + 63 * Math.cos((60 * Math.PI) / 180)
const Y1_END = 70 + 63 * Math.sin((60 * Math.PI) / 180)

const encoderDesiredHeadroom = computed(() => mmuEncoder.value?.desired_headroom ?? 0)

const encoderDetectionLength = computed(() => mmuEncoder.value?.detection_length ?? 0)

const encoderDetectionMode = computed(() => mmuEncoder.value?.detection_mode ?? DIRECTION_UNKNOWN)

const encoderEnabled = computed(() => mmuEncoder.value?.enabled ?? false)

const encoderFlowRate = computed(() => mmuEncoder.value?.flow_rate ?? 0)

const svgClasses = computed(() => ({ 'disabled-clog': encoderDetectionMode.value === 0 || !encoderEnabled.value }))

const headroom = computed(() => mmuEncoder.value?.headroom ?? 0)

const headroomMin = computed(() => mmuEncoder.value?.min_headroom ?? 0)

const headroomWarning = computed(() => headroomMin.value < encoderDesiredHeadroom.value)

const minHeadroomLineClasses = computed(() => ({
    'warning-color': headroomWarning.value,
    'primary-color': !headroomWarning.value,
}))

const headroomArc = computed(() => CIRCUMFERENCE * (1 - (encoderDesiredHeadroom.value / encoderDetectionLength.value) * (300 / 360)))

const headroomRotate = computed(() => {
    if (encoderDetectionLength.value === 0) return 120

    return 420 - (encoderDesiredHeadroom.value / encoderDetectionLength.value) * 300
})

const headroomTransform = computed(() => `rotate(${headroomRotate.value} 70 70)`)

function calcClogPercent(value: number, encoderDetectionLength: number) {
    return (Math.min(Math.max(0, encoderDetectionLength - value), encoderDetectionLength) / encoderDetectionLength) * 100
}

const clogPercent = computed(() => {
    if (encoderDetectionLength.value === 0) return 100

    return calcClogPercent(headroom.value, encoderDetectionLength.value)
})

const minHeadroomPercent = computed(() => {
    if (encoderDetectionLength.value === 0) return 100

    return calcClogPercent(headroomMin.value, encoderDetectionLength.value)
})

const minHeadroomAngle = computed(() => minHeadroomPercent.value * 3)

const x1MinHeadroom = computed(() => 70 + 64 * Math.cos(((120 + minHeadroomAngle.value) * Math.PI) / 180))

const y1MinHeadroom = computed(() => 70 + 64 * Math.sin(((120 + minHeadroomAngle.value) * Math.PI) / 180))

const dashOffset = computed(() => CIRCUMFERENCE * ((100 - (clogPercent.value * 300) / 360) / 100))

watch(
    dashOffset,
    (newValue) => {
        if (!dialCircle.value) return

        const currentOffset = parseFloat(dialCircle.value?.style?.strokeDashoffset) || CIRCUMFERENCE
        const difference = Math.abs(currentOffset - newValue)
        const duration = (difference / CIRCUMFERENCE) * ROTATION_TIME
        dialCircle.value.style.transition = `stroke-dashoffset ${duration}s ease-out`
    },
    { immediate: true }
)
</script>

<style scoped>
.disabled-clog {
    opacity: 0.5;
    cursor: not-allowed;
}
.primary-color {
    stroke: rgb(var(--v-theme-primary, 44 169 188));
}
.warning-color {
    stroke: rgb(var(--v-theme-error, 255 0 0));
}
.small-text-color {
    fill: rgb(var(--v-theme-primary, 44 169 188));
}
</style>
