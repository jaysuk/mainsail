<template>
    <div style="position: relative">
        <div id="tooltipObjectMap" ref="tooltipObjectMap" />
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" :viewBox="viewBox" xml:space="preserve">
            <defs>
                <marker id="arrowhead" markerWidth="5" markerHeight="4" refX="2" refY="2" orient="auto">
                    <polygon points="0 0, 5 2, 0 4" :fill="coordinationCrossColor" />
                </marker>
            </defs>
            <line :x1="convertX(0)" :y1="convertY(1)" :x2="convertX(stepperXmax / 4)" :y2="convertY(1)" :stroke="coordinationCrossColor" stroke-width="2" marker-end="url(#arrowhead)" />
            <line :x1="convertX(1)" :y1="convertY(0)" :x2="convertX(1)" :y2="convertY(stepperYmax / 4)" :stroke="coordinationCrossColor" stroke-width="2" marker-end="url(#arrowhead)" />
            <g>
                <line
                    v-for="x in xStripes"
                    :key="'xLines' + x"
                    :x1="convertX(x)"
                    :x2="convertX(x)"
                    :y1="convertY(stepperYmin)"
                    :y2="convertY(stepperYmax)"
                    :stroke="coordinationCrossColor"
                    :stroke-opacity="0.25"
                    stroke-width="1" />
                <line
                    v-for="y in yStripes"
                    :key="'yLines' + y"
                    :x1="convertX(stepperXmin)"
                    :x2="convertX(stepperXmax)"
                    :y1="convertY(y)"
                    :y2="convertY(y)"
                    :stroke="coordinationCrossColor"
                    :stroke-opacity="0.25"
                    stroke-width="1" />
            </g>

            <g v-for="(object, index) in printing_objects_with_polygons" :key="index">
                <polygon
                    :points="(object.polygon ?? []).map((point) => convertX(point[0]) + ',' + convertY(point[1])).join(' ')"
                    style="cursor: pointer"
                    :stroke="current_object === object.name ? primaryColor : '#666'"
                    stroke-width="2"
                    fill-rule="evenodd"
                    :fill="hoverName === object.name ? primaryColor : excluded_objects.includes(object.name) ? '#6668' : '#bbb'"
                    @mouseover="showObjectTooltip(object.name)"
                    @mouseout="hideObjectTooltip"
                    @click="openExcludeObjectDialog(object.name)" />
            </g>
        </svg>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { defaultPrimaryColor } from '@/store/variables'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'

type PolygonPoint = [number, number]

interface ExcludeObjectStateEntry {
    center?: PolygonPoint
    name: string
    polygon?: PolygonPoint[]
}

interface PrintingObject {
    center?: PolygonPoint
    name: string
    polygon?: PolygonPoint[]
    size: number
}

const props = withDefaults(
    defineProps<{
        hoverName?: string
    }>(),
    {
        hoverName: '',
    }
)

const emit = defineEmits<{
    'update:name': [name: string]
    'update:bool': [value: boolean]
}>()

const printerStore = usePrinterStore()
const guiStore = useGuiStore()

const tooltipObjectMap = ref<HTMLDivElement | null>(null)

const coordinationCrossColor = '#888'
const stripesOffset = 50

const printing_objects = computed<PrintingObject[]>(() => {
    const objects = printerStore.exclude_object?.objects ?? []

    return objects
        .map((object: ExcludeObjectStateEntry) => {
            let total = 0
            const polygon = object.polygon ?? []

            for (let i = 0; i < polygon.length; i++) {
                const pointA = polygon[i]
                const pointB = i === polygon.length - 1 ? polygon[0] : polygon[i + 1]

                total += pointA[0] * pointB[1] - pointA[1] * pointB[0]
            }

            return {
                center: object.center,
                name: object.name,
                polygon: object.polygon,
                size: Math.abs(total),
            }
        })
        .sort((a: PrintingObject, b: PrintingObject) => b.size - a.size)
})

const printing_objects_with_polygons = computed(() => printing_objects.value.filter((object) => Array.isArray(object.polygon)))

const current_object = computed(() => printerStore.exclude_object?.current_object ?? null)

const excluded_objects = computed<string[]>(() => printerStore.exclude_object?.excluded_objects ?? [])

const viewBox = computed(() => convertX(stepperXmin.value) + ' ' + convertY(stepperYmax.value) + ' ' + absoluteX.value + ' ' + absoluteY.value)

const toolhead = computed(() => printerStore.toolhead ?? {})

const axis_minimum = computed(() => toolhead.value.axis_minimum ?? [])
const axis_maximum = computed(() => toolhead.value.axis_maximum ?? [])

const stepperXmin = computed(() => axis_minimum.value[0] ?? 0)
const stepperXmax = computed(() => axis_maximum.value[0] ?? 200)
const stepperYmin = computed(() => axis_minimum.value[1] ?? 0)
const stepperYmax = computed(() => axis_maximum.value[1] ?? 200)

const absoluteX = computed(() => Math.abs(stepperXmin.value) + Math.abs(stepperXmax.value))
const absoluteY = computed(() => Math.abs(stepperYmin.value) + Math.abs(stepperYmax.value))

const xStripes = computed(() => {
    const output = []
    const minXstripe = Math.floor(stepperXmin.value / stripesOffset) * stripesOffset
    const maxXstripe = Math.floor(stepperXmax.value / stripesOffset) * stripesOffset

    for (let i = minXstripe; i <= maxXstripe; i = i + stripesOffset) {
        output.push(i)
    }

    return output
})

const yStripes = computed(() => {
    const output = []
    const minYstripe = Math.floor(stepperYmin.value / stripesOffset) * stripesOffset
    const maxYstripe = Math.floor(stepperYmax.value / stripesOffset) * stripesOffset

    for (let i = minYstripe; i <= maxYstripe; i = i + stripesOffset) {
        output.push(i)
    }

    return output
})

const primaryColor = computed(() => guiStore.getTheme.colorPrimary ?? defaultPrimaryColor)

function convertX(x: number) {
    return x
}

function convertY(y: number) {
    return y * -1
}

function moveTooltip(event: MouseEvent) {
    if (!tooltipObjectMap.value) return

    const top = event.offsetY - tooltipObjectMap.value.clientHeight - 15
    tooltipObjectMap.value.style.left = `${event.offsetX - 20}px`
    tooltipObjectMap.value.style.top = `${top}px`
}

function showObjectTooltip(text: string) {
    if (!tooltipObjectMap.value) return

    tooltipObjectMap.value.innerHTML = text
    tooltipObjectMap.value.style.display = 'block'

    window.addEventListener('mousemove', moveTooltip)
}

function hideObjectTooltip() {
    if (!tooltipObjectMap.value) return

    tooltipObjectMap.value.style.display = 'none'

    window.removeEventListener('mousemove', moveTooltip)
}

function openExcludeObjectDialog(name: string) {
    emit('update:name', name)
    emit('update:bool', true)
}
</script>

<style scoped>
svg {
    border: 2px solid #888;
}

#tooltipObjectMap {
    display: none;
    position: absolute;
    background: black;
    border-radius: 3px;
    color: white;
    padding: 3px 7px;
    z-index: 100;

    &:before {
        display: block;
        content: ' ';
        width: 0;
        height: 0;
        position: absolute;
        bottom: -10px;
        left: 10px;
        border-top: 10px solid black;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
    }
}
</style>
