<template>
    <e-chart ref="heightmap" :option="chartOptions" :init-options="{ renderer: 'canvas' }" class="w-100 overflow-hidden" style="height: 600px" />
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { use } from 'echarts/core'

// import ECharts modules manually to reduce bundle size
import { CanvasRenderer } from 'echarts/renderers'
import { VisualMapComponent } from 'echarts/components'

import { Grid3DComponent } from 'echarts-gl/components'
import { SurfaceChart } from 'echarts-gl/charts'
import type { CallbackDataParams } from 'echarts/types/dist/shared'
import type { EChartRef } from '@/types/echarts'
import { useBase } from '@/composables/useBase'
import { useBedmesh } from '@/composables/useBedmesh'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { usePrinterStore } from '@/store/printer'
import { useGuiHeightmapStore } from '@/store/gui/heightmap'

use([CanvasRenderer, VisualMapComponent, Grid3DComponent, SurfaceChart])

interface HeightmapSerie {
    type: string
    name: string
    data: number[][]
    dataShape?: number[]
    itemStyle?: {
        opacity?: number
        color?: number[]
    }
    wireframe: {
        show: boolean
    }
}

type HeightmapTooltipData = CallbackDataParams & {
    seriesName: string
    encode: Record<string, number[]>
    data: number[]
}

const props = withDefaults(
    defineProps<{
        showProbed?: boolean
        showMesh?: boolean
        showFlat?: boolean
        wireframe?: boolean
        scaleGradient?: boolean
        scaleZMax?: number
    }>(),
    {
        showProbed: false,
        showMesh: false,
        showFlat: false,
        wireframe: false,
        scaleGradient: false,
        scaleZMax: 1,
    }
)

const { isMobile } = useBase()
const { bed_mesh } = useBedmesh()
const { isDark, bgColor, fgColor, fgColorHi, fgColorMid, fgColorLow } = useMainsailTheme()
const printerStore = usePrinterStore()
const guiHeightmapStore = useGuiHeightmapStore()

const heightmap = ref<EChartRef | undefined>()

const chart = computed(() => heightmap.value?.chart ?? null)

const selected = computed<Record<'probed' | 'mesh' | 'flat', boolean>>(() => ({
    probed: props.showProbed,
    mesh: props.showMesh,
    flat: props.showFlat,
}))

const seriesProbed = computed<HeightmapSerie>(() => {
    const serie: HeightmapSerie = {
        type: 'surface',
        name: 'probed',
        data: [],
        itemStyle: { opacity: 1 },
        wireframe: { show: props.wireframe },
    }

    if (bed_mesh.value) {
        const xCount = bed_mesh.value.probed_matrix[0].length
        const yCount = bed_mesh.value.probed_matrix.length
        const xMin = bed_mesh.value.mesh_min[0]
        const xMax = bed_mesh.value.mesh_max[0]
        const yMin = bed_mesh.value.mesh_min[1]
        const yMax = bed_mesh.value.mesh_max[1]
        const xStep = (xMax - xMin) / (xCount - 1)
        const yStep = (yMax - yMin) / (yCount - 1)

        const data: number[][] = []

        let yPoint = 0
        bed_mesh.value.probed_matrix.forEach((meshRow: number[]) => {
            let xPoint = 0
            meshRow.forEach((value: number) => {
                data.push([xMin + xStep * xPoint, yMin + yStep * yPoint, value])
                xPoint++
            })
            yPoint++
        })

        serie.data = data
        serie.dataShape = [yCount, xCount]
    }

    return serie
})

const seriesMesh = computed<HeightmapSerie>(() => {
    const serie: HeightmapSerie = {
        type: 'surface',
        name: 'mesh',
        data: [],
        itemStyle: { opacity: 1 },
        wireframe: { show: props.wireframe },
    }

    if (bed_mesh.value) {
        const xCount = bed_mesh.value.mesh_matrix[0].length
        const yCount = bed_mesh.value.mesh_matrix.length
        const xMin = bed_mesh.value.mesh_min[0]
        const xMax = bed_mesh.value.mesh_max[0]
        const yMin = bed_mesh.value.mesh_min[1]
        const yMax = bed_mesh.value.mesh_max[1]
        const xStep = (xMax - xMin) / (xCount - 1)
        const yStep = (yMax - yMin) / (yCount - 1)

        const data: number[][] = []

        let yPoint = 0
        bed_mesh.value.mesh_matrix.forEach((meshRow: number[]) => {
            let xPoint = 0
            meshRow.forEach((value: number) => {
                data.push([xMin + xStep * xPoint, yMin + yStep * yPoint, value])
                xPoint++
            })
            yPoint++
        })

        serie.data = data
        serie.dataShape = [yCount, xCount]
    }

    return serie
})

const seriesFlat = computed<HeightmapSerie>(() => {
    const serie: HeightmapSerie = {
        type: 'surface',
        name: 'flat',
        data: [],
        itemStyle: {
            color: [1, 1, 1, 1],
            opacity: 0.5,
        },
        wireframe: { show: props.wireframe },
    }

    const config = printerStore.configfile?.settings?.bed_mesh
    if (config) {
        let probe_count = [1, 1]
        if (config.probe_count && typeof config.probe_count === 'string') {
            probe_count = config.probe_count.split(',')
        } else if (config.probe_count) {
            probe_count = config.probe_count.length < 2 ? [config.probe_count, config.probe_count] : config.probe_count
        } else if (config.round_probe_count) {
            probe_count = [config.round_probe_count, config.round_probe_count]
        }

        let mesh_min = config.mesh_min ?? [0, 0]
        let mesh_max = config.mesh_max ?? [200, 200]

        if ('mesh_radius' in config) {
            // delta min/max
            mesh_min = [config.mesh_radius * -1, config.mesh_radius * -1]

            mesh_max = [config.mesh_radius, config.mesh_radius]
        }

        const xCount = probe_count[0]
        const yCount = probe_count[1]
        const xMin = parseFloat(mesh_min[0])
        const xMax = parseFloat(mesh_max[0])
        const yMin = parseFloat(mesh_min[1])
        const yMax = parseFloat(mesh_max[1])
        const xStep = (xMax - xMin) / (xCount - 1)
        const yStep = (yMax - yMin) / (yCount - 1)

        const data: number[][] = []

        for (let y = 0; y < yCount; y++) {
            for (let x = 0; x < xCount; x++) {
                data.push([xMin + xStep * x, yMin + yStep * y, 0])
            }
        }

        serie.data = data
        serie.dataShape = [yCount, xCount]
    }

    return serie
})

const series = computed<HeightmapSerie[]>(() => {
    const output: HeightmapSerie[] = []

    if (bed_mesh.value) {
        output.push(seriesProbed.value)
        output.push(seriesMesh.value)
        output.push(seriesFlat.value)
    }

    return output
})

const colorMap = computed<string[]>(() => guiHeightmapStore.getActiveColorSchemeList)

const visualMapSeriesIndex = computed<number[]>(() => {
    const output = []

    if (props.showProbed) output.push(0)
    else if (props.showMesh) output.push(1)

    return output
})

const heightmapLimit = computed<number[]>(() => {
    let min = 0
    let max = 0

    if (bed_mesh.value) {
        const points: number[] = []
        if (props.showProbed) {
            for (const row of bed_mesh.value.probed_matrix) for (const col of row) points.push(col)
        }
        if (props.showMesh) {
            for (const row of bed_mesh.value.mesh_matrix) for (const col of row) points.push(col)
        }

        min = Math.min(min, ...points)
        max = Math.max(max, ...points)
    }

    return [min, max]
})

const visualMapRange = computed<number[]>(() => {
    if (!props.scaleGradient) return [-0.1, 0.1]

    return heightmapLimit.value
})

const rangeX = computed<number[]>(() => {
    const axis_minimum = printerStore.toolhead?.axis_minimum
    const axis_maximum = printerStore.toolhead?.axis_maximum

    return [axis_minimum?.[0] ?? 0, axis_maximum?.[0] ?? 0]
})

const rangeY = computed<number[]>(() => {
    const axis_minimum = printerStore.toolhead?.axis_minimum ?? [0, 0]
    const axis_maximum = printerStore.toolhead?.axis_maximum ?? [0, 0]

    return [axis_minimum[1] ?? 0, axis_maximum[1] ?? 0]
})

const absRangeX = computed(() => rangeX.value[1] - rangeX.value[0])
const absRangeY = computed(() => rangeY.value[1] - rangeY.value[0])
const minRangeXY = computed(() => Math.min(absRangeX.value, absRangeY.value))

const scaleX = computed(() => {
    if (minRangeXY.value === 0) return 1

    return absRangeX.value / minRangeXY.value
})

const scaleY = computed(() => {
    if (minRangeXY.value === 0) return 1

    return absRangeY.value / minRangeXY.value
})

const defaultOrientation = computed(() => {
    const orientation = guiHeightmapStore.defaultOrientation ?? 'rightFront'

    switch (orientation) {
        case 'leftFront':
            return { alpha: 25, beta: -40 }
        case 'front':
            return { alpha: 25, beta: 0 }
        case 'top':
            return { alpha: 90, beta: 0 }

        default:
            return { alpha: 25, beta: 40 }
    }
})

function tooltipFormatter(data: HeightmapTooltipData): string {
    const outputArray: string[] = []
    outputArray.push(`<b>${data.seriesName}</b>`)

    Object.keys(data.encode)
        .sort()
        .forEach((axisName: string) => {
            const value = data.data[data.encode[axisName][0]].toFixed(axisName === 'z' ? 3 : 1)

            outputArray.push(`<b>${axisName.toUpperCase()}</b>: ${value} mm`)
        })

    return outputArray.join('<br />')
}

const chartOptions = computed(() => ({
    tooltip: {
        backgroundColor: bgColor(0.9),
        borderWidth: 0,
        textStyle: {
            color: fgColor(1),
            fontSize: '14px',
        },
        padding: 15,
        formatter: tooltipFormatter,
    },
    darkMode: isDark.value,
    animation: false,
    legend: {
        show: false,
        selected: selected.value,
    },
    visualMap: {
        show: true,
        min: visualMapRange.value[0],
        max: visualMapRange.value[1],
        calculable: true,
        dimension: 2,
        inRange: {
            color: colorMap.value,
        },
        seriesIndex: visualMapSeriesIndex.value,
        left: isMobile.value ? 10 : 30,
        top: 20,
        bottom: 0,
        itemWidth: isMobile.value ? 10 : 30,
        itemHeight: 550,
        precision: 3,
        textStyle: {
            color: fgColorHi.value,
            fontSize: 14,
        },
    },
    xAxis3D: {
        type: 'value',
        nameTextStyle: {
            color: fgColorMid.value,
        },
        min: rangeX.value[0],
        max: rangeX.value[1],
        minInterval: 1,
    },
    yAxis3D: {
        type: 'value',
        nameTextStyle: {
            color: fgColorMid.value,
        },
        min: rangeY.value[0],
        max: rangeY.value[1],
    },
    zAxis3D: {
        type: 'value',
        min: props.scaleZMax * -1,
        max: props.scaleZMax,
        nameTextStyle: {
            color: fgColorMid.value,
        },
        axisPointer: {
            label: {
                formatter: (value: string | number) => {
                    const val = typeof value === 'string' ? parseFloat(value) : value
                    return val.toFixed(2)
                },
            },
        },
    },
    grid3D: {
        axisLabel: {
            textStyle: { color: fgColorMid.value },
        },
        axisLine: {
            lineStyle: { color: fgColorLow.value },
        },
        axisTick: {
            lineStyle: { color: fgColorLow.value },
        },
        splitLine: {
            lineStyle: { color: fgColorLow.value },
        },
        axisPointer: {
            lineStyle: { color: fgColorHi.value },
            label: {
                textStyle: { color: fgColorHi.value },
            },
        },
        boxWidth: 100 * scaleX.value,
        boxDepth: 100 * scaleY.value,
        viewControl: {
            distance: 200,
            ...defaultOrientation.value,
        },
    },
    series: series.value,
}))

onBeforeUnmount(() => {
    if (typeof window === 'undefined') return

    chart.value?.dispose()
})
</script>
