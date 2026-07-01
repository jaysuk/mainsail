<template>
    <e-chart ref="historyAllPrintStatus" :option="chartOptions" :autoresize="true" :init-options="{ renderer: 'svg' }" class="w-100" style="height: 200px" />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { ECBasicOption } from 'echarts/types/dist/shared'
import type { EChartRef } from '@/types/echarts'
import { formatPrintTime } from '@/plugins/helpers'
import type { HistoryStatsValueNames, ServerHistoryStateAllPrintStatusEntry } from '@/store/server/history/types'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { useHistoryStats } from '@/composables/useHistoryStats'

const props = withDefaults(
    defineProps<{
        valueName?: HistoryStatsValueNames
    }>(),
    { valueName: 'jobs' }
)

const { fgColorHi } = useMainsailTheme()
const { groupedPrintStatusArray } = useHistoryStats(computed(() => props.valueName))

const historyAllPrintStatus = ref<EChartRef | undefined>()
let observer: IntersectionObserver | null = null

const chart = computed(() => historyAllPrintStatus.value?.chart ?? null)

function getNumericTooltipValue(value: unknown): number {
    const rawValue = Array.isArray(value) ? value[0] : value
    const numericValue = Number(rawValue)

    return Number.isFinite(numericValue) ? numericValue : 0
}

const chartOptions = computed<ECBasicOption>(() => ({
    animation: false,
    grid: {
        top: 10,
        right: 0,
        bottom: 0,
        left: 10,
    },
    tooltip: {
        trigger: 'item',
        borderWidth: 0,
        valueFormatter: (value: unknown) => {
            const numericValue = getNumericTooltipValue(value)

            if (props.valueName === 'filament') {
                if (numericValue > 1000) return Math.round(numericValue / 1000).toString() + ' m'

                return numericValue.toString() + ' mm'
            }

            if (props.valueName === 'time') {
                return formatPrintTime(numericValue, false)
            }

            return numericValue.toString()
        },
    },
    series: [
        {
            type: 'pie',
            data: groupedPrintStatusArray.value,
            avoidLabelOverlap: false,
            minAngle: 5,
            radius: ['35%', '60%'],
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)',
                },
            },
            label: {
                color: fgColorHi.value,
            },
        },
    ],
}))

onMounted(() => {
    observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) chart.value?.resize()
    })
    if (historyAllPrintStatus.value?.$el) observer.observe(historyAllPrintStatus.value.$el)
})

onBeforeUnmount(() => {
    observer?.disconnect()

    if (typeof window === 'undefined') return

    chart.value?.dispose()
})

watch(groupedPrintStatusArray, (newVal: ServerHistoryStateAllPrintStatusEntry[]) => {
    chart.value?.setOption(
        {
            series: {
                data: newVal,
            },
        },
        false,
        true
    )
})
</script>
