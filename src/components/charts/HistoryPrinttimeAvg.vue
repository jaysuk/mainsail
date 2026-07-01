<template>
    <e-chart ref="historyPrinttimeAvg" :option="chartOptions" :init-options="{ renderer: 'svg' }" style="height: 175px; width: 100%"></e-chart>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ECBasicOption } from 'echarts/types/dist/shared'
import type { EChartRef } from '@/types/echarts'
import type { ServerHistoryStateJob } from '@/store/server/history/types'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { useHistory } from '@/composables/useHistory'

const { t } = useI18n()
const { fgColorFaint, fgColorLow } = useMainsailTheme()
const { allJobs, selectedJobs } = useHistory()

const historyPrinttimeAvg = ref<EChartRef | undefined>()
let observer: IntersectionObserver | null = null

const chart = computed(() => historyPrinttimeAvg.value?.chart ?? null)

const printtimeAvgArray = computed<number[]>(() => {
    const output: number[] = [0, 0, 0, 0, 0]
    const startDate = new Date(new Date().getTime() - 60 * 60 * 24 * 14 * 1000)

    let jobsFiltered = [...allJobs.value.filter((job: ServerHistoryStateJob) => new Date(job.start_time * 1000) >= startDate && job.status === 'completed')]
    if (selectedJobs.value.length)
        jobsFiltered = [...selectedJobs.value.filter((job: ServerHistoryStateJob) => new Date(job.start_time * 1000) >= startDate && job.status === 'completed')]

    if (jobsFiltered.length) {
        const hours = (duration: number) => duration / 3600

        jobsFiltered.forEach((current) => {
            const printHours = hours(current.print_duration)

            if (printHours > 0 && printHours <= 2) output[0]++
            else if (printHours <= 6) output[1]++
            else if (printHours <= 12) output[2]++
            else if (printHours <= 24) output[3]++
            else output[4]++
        })
    }

    return output
})

const chartOptions = computed<ECBasicOption>(() => ({
    animation: false,
    grid: {
        top: 25,
        right: 40,
        bottom: 30,
        left: 40,
    },
    tooltip: {
        trigger: 'item',
        borderWidth: 0,
    },
    xAxis: {
        type: 'category',
        data: ['0-2h', '2-6h', '6-12h', '12-24h', '>24h'],
        splitLine: {
            show: true,
            lineStyle: {
                color: fgColorFaint.value,
            },
        },
        axisLabel: {
            color: fgColorLow.value,
            margin: 10,
        },
    },
    yAxis: {
        name: t('History.HistoryPrinttimeAVG'),
        type: 'value',
        minInterval: 10,
        maxInterval: 100,
        nameLocation: 'end',
        nameGap: 5,
        nameTextStyle: {
            color: fgColorLow.value,
            align: 'left',
        },
        splitLine: {
            lineStyle: {
                color: fgColorLow.value,
            },
        },
        axisLabel: {
            color: fgColorLow.value,
            formatter: '{value}',
            showMinLabel: true,
            margin: 5,
        },
        axisLine: {
            show: true,
            lineStyle: {
                color: fgColorLow.value,
            },
        },
    },
    series: [
        {
            type: 'bar',
            data: printtimeAvgArray.value,
            itemStyle: {
                color: '#BDBDBD',
            },
        },
    ],
}))

onMounted(() => {
    observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) chart.value?.resize()
    })
    if (historyPrinttimeAvg.value?.$el) observer.observe(historyPrinttimeAvg.value.$el)
})

onBeforeUnmount(() => {
    observer?.disconnect()

    if (typeof window === 'undefined') return
    if (chart.value) chart.value.dispose()
})

watch(printtimeAvgArray, (newVal) => {
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
