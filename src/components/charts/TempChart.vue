<template>
    <e-chart
        ref="tempchart"
        :option="chartOptions"
        :init-options="{ renderer: 'svg' }"
        :autoresize="true"
        :style="tempchartStyle"
        class="w-100"
        @mouseenter="hoverChart = true"
        @mouseleave="hoverChart = false" />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { convertName } from '@/plugins/helpers'
import type { PrinterTempHistoryStateSerie, PrinterTempHistoryStateSourceEntry } from '@/store/printer/tempHistory/types'
import type { ECBasicOption, TopLevelFormatterParams, TooltipPositionCallback } from 'echarts/types/dist/shared'
import type { EChartRef } from '@/types/echarts'
import { mdiClock } from '@mdi/js'
import { datasetTypesInPercents } from '@/store/variables'
import { useBase } from '@/composables/useBase'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { usePrinterStore } from '@/store/printer'
import { usePrinterTempHistoryStore } from '@/store/printer/tempHistory'
import { useGuiStore } from '@/store/gui'
import { webSocketClient } from '@/plugins/webSocketClient'

interface TempChartTooltipPosition {
    top: number
    left?: number
    right?: number
}

const { t } = useI18n()
const { hours12Format, formatTime } = useBase()
const { isDark, bgColor, fgColorHi, fgColorMid, fgColorLow, fgColorFaint } = useMainsailTheme()
const printerStore = usePrinterStore()
const tempHistoryStore = usePrinterTempHistoryStore()
const guiStore = useGuiStore()

const tempchart = ref<EChartRef | undefined>()
const hoverChart = ref(false)
const isVisible = ref(true)
let observer: IntersectionObserver | null = null

const chart = computed(() => tempchart.value?.chart ?? null)

const maxHistory = computed(() => tempHistoryStore.getTemperatureStoreSize)
const series = computed<PrinterTempHistoryStateSerie[]>(() => tempHistoryStore.series ?? [])
const source = computed<PrinterTempHistoryStateSourceEntry[]>(() => tempHistoryStore.source ?? [])
const autoscale = computed(() => guiStore.view.tempchart.autoscale ?? true)
const maxTemp = computed(() => printerStore.getMaxTemp ?? 300)
const boolDisplayPwmAxis = computed(() => tempHistoryStore.getBoolDisplayPwmAxis)
const selectedLegends = computed(() => tempHistoryStore.getSelectedLegends)
const timeFormat = computed(() => (hours12Format.value ? '{hh}:{mm}' : '{HH}:{mm}'))
const tempchartHeight = computed(() => guiStore.uiSettings.tempchartHeight ?? 250)
const tempchartStyle = computed(() => ({ height: tempchartHeight.value + 'px' }))
const gridRight = computed(() => (boolDisplayPwmAxis.value ? 25 : 15))
const optionGridRight = computed(() => (boolDisplayPwmAxis.value ? 35 : 15))

// tooltip will be fixed on the right if mouse hovering on the left,
// and on the left if hovering on the right.
const tooltipPosition: TooltipPositionCallback = (point, _params, _el, _rect, size) => {
    const position: TempChartTooltipPosition = { top: 60 }
    const side: 'left' | 'right' = point[0] < size.viewSize[0] / 2 ? 'left' : 'right'
    position[side] = 5

    return position
}

function tooltipFormatter(params: TopLevelFormatterParams): string {
    const entries = Array.isArray(params) ? params : [params]
    if (!entries.length) return ''

    let outputTime = ''
    const axisPayload = entries[0] as { axisValue?: string | number; axisValueLabel?: string }

    if (typeof axisPayload.axisValue === 'number') outputTime = formatTime(axisPayload.axisValue)
    else if (typeof axisPayload.axisValue === 'string') {
        const parsedAxisDate = Date.parse(axisPayload.axisValue)
        outputTime = Number.isNaN(parsedAxisDate) ? axisPayload.axisValue : formatTime(parsedAxisDate)
    } else if (typeof axisPayload.axisValueLabel === 'string') outputTime = axisPayload.axisValueLabel

    let outputRows = ''

    for (const entry of entries) {
        if (
            typeof entry.seriesName !== 'string' ||
            typeof entry.marker !== 'string' ||
            typeof entry.value !== 'object' ||
            entry.value === null ||
            !entry.seriesName.endsWith('-temperature')
        )
            continue

        const value = entry.value as Record<string, number | null>
        const baseSeriesName = entry.seriesName.substring(0, entry.seriesName.lastIndexOf('-'))
        let displayName = baseSeriesName
        if (displayName.indexOf(' ') !== -1) displayName = displayName.substring(displayName.indexOf(' ') + 1)

        outputRows += '<div class="row">'
        outputRows += `<div class="col-auto py-0">${entry.marker}<span class='ml-2'>${convertName(displayName)}:</span></div>`
        outputRows += '<div class="col text-right py-0 font-weight-bold">'

        const seriesNameTemperature = `${baseSeriesName}-temperature`
        const seriesNameTarget = `${baseSeriesName}-target`

        if (seriesNameTemperature in value) {
            const temperatureValue = value[seriesNameTemperature]
            outputRows += temperatureValue !== null ? temperatureValue.toFixed(1) : '--'
        }
        if (seriesNameTarget in value) {
            outputRows += ' / '
            const targetValue = value[seriesNameTarget]
            outputRows += targetValue !== null ? targetValue.toFixed(1) : '--'
        }
        outputRows += '°C'

        datasetTypesInPercents.forEach((attrKey) => {
            const seriesName = `${baseSeriesName}-${attrKey}`
            if (!(seriesName in value) || value[seriesName] === null) return

            outputRows += ` [ ${((value[seriesName] ?? 0) * 100).toFixed(0)}% ]`
        })

        outputRows += '</div>'
        outputRows += '</div>'
    }

    if (!outputRows) return ''

    const theme = isDark.value ? 'theme-dark' : ''

    const header =
        '<div class="row">' +
        '<div class="col py-1" style=\'border-bottom: 1px solid rgba(255, 255, 255, 0.24);\'>' +
        `<span class="v-icon mdi ${theme}" style="margin-right: 5px;">` +
        '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" viewBox="0 0 24 24" class="v-icon__svg" style="font-size: 12px; width: 12px; height: 12px;">' +
        `<path d="${mdiClock}"></path>` +
        '</svg>' +
        '</span>' +
        `<span class="font-weight-bold">${outputTime}</span>` +
        '</div>' +
        '</div>'

    return header + outputRows
}

const tooltip = computed(() => ({
    animation: false,
    trigger: 'axis',
    backgroundColor: bgColor(1),
    borderWidth: 0,
    textStyle: {
        color: fgColorHi.value,
        fontSize: '14px',
    },
    padding: 15,
    formatter: (params: TopLevelFormatterParams) => tooltipFormatter(params),
    confine: true,
    className: 'echarts-tooltip',
    position: tooltipPosition,
}))

const yAxis = computed(() => [
    {
        name: t('Panels.TemperaturePanel.TemperaturesInChart'),
        type: 'value',
        min: 0,
        max: (value: { max: number }) => {
            if (!autoscale.value) return maxTemp.value

            return Math.ceil((value.max + 5) / 20) * 20
        },
        minInterval: 20,
        maxInterval: 100,
        nameLocation: 'end',
        nameGap: 5,
        nameTextStyle: {
            color: fgColorMid.value,
            align: 'left',
        },
        splitLine: {
            lineStyle: {
                color: fgColorFaint.value,
            },
        },
        axisLabel: {
            color: fgColorMid.value,
            formatter: '{value}',
            rotate: 90,
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
    {
        show: boolDisplayPwmAxis.value,
        name: 'PWM [%]',
        min: 0,
        max: 1,
        minInterval: 0.25,
        type: 'value',
        nameLocation: 'end',
        nameGap: 5,
        nameTextStyle: {
            color: fgColorMid.value,
            align: 'right',
        },
        splitLine: {
            show: false,
        },
        axisLabel: {
            color: fgColorMid.value,
            formatter: (value: number) => {
                return value * 100
            },
            showMinLabel: true,
            rotate: 90,
            margin: 5,
        },
        axisLine: {
            show: true,
            lineStyle: {
                color: fgColorLow.value,
            },
        },
    },
])

const media = computed(() => [
    {
        query: {
            minWidth: 500,
        },
        option: {
            grid: {
                right: optionGridRight.value,
                left: 40,
            },
            yAxis: [
                {
                    maxInterval: 50,
                    axisLabel: {
                        showMinLabel: false,
                        showMaxLabel: true,
                        rotate: 0,
                    },
                },
                {
                    maxInterval: 25,
                    axisLabel: {
                        showMinLabel: false,
                        rotate: 0,
                    },
                },
            ],
        },
    },
])

const chartOptions = computed<ECBasicOption>(() => ({
    renderer: 'svg',
    animation: false,
    tooltip: tooltip.value,
    grid: {
        top: 35,
        right: gridRight.value,
        bottom: 30,
        left: 25,
    },
    legend: {
        animation: false,
        show: false,
        selected: selectedLegends.value,
    },
    xAxis: {
        type: 'time',
        splitNumber: 5,
        minInterval: 60 * 1000,
        splitLine: {
            show: true,
            lineStyle: {
                color: fgColorFaint.value,
            },
        },
        axisLabel: {
            color: fgColorLow.value,
            margin: 10,
            formatter: timeFormat.value,
        },
    },
    yAxis: yAxis.value,
    media: media.value,
    dataset: {
        source: [],
    },
    series: series.value,
}))

onMounted(() => {
    observer = new IntersectionObserver((entries) => {
        isVisible.value = entries[0]?.isIntersecting ?? false
    })
    if (tempchart.value?.$el) observer.observe(tempchart.value.$el)
})

onBeforeUnmount(() => {
    observer?.disconnect()

    if (typeof window === 'undefined') return

    chart.value?.dispose()
})

watch(selectedLegends, (newVal) => {
    if (chart.value?.isDisposed() === true) return

    chart.value?.setOption({ legend: { selected: newVal } })
})

watch(source, (newVal) => {
    // break if the chart isn't initialized or not visible or is hovered
    if (!chart.value || !isVisible.value || hoverChart.value) return

    chart.value?.setOption({
        dataset: {
            source: newVal,
        },
    })

    const limitDate = new Date(Date.now() - maxHistory.value * 1000)
    const newSource = newVal.filter((entry: PrinterTempHistoryStateSourceEntry) => {
        return entry.date >= limitDate
    })

    // reset tempHistory if working sources are smaller than 80%
    if (newVal.length > 0 && newSource.length < maxHistory.value * 0.8) {
        webSocketClient.emit('server.temperature_store', { include_monitors: true }, { action: 'printer/tempHistory/init' })
    }
})
</script>
