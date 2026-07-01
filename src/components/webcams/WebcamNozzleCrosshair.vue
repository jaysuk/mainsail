<template>
    <div ref="container" class="crosshair-container">
        <div class="line horizontal" :style="styleLines" />
        <div class="line vertical" :style="styleLines" />
        <div class="circle" :style="styleCircle" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'

const props = defineProps<{ webcam: GuiWebcamStateWebcam }>()

const container = ref<HTMLDivElement | null>(null)
const clientHeight = ref(0)
let resizeObserver: ResizeObserver | null = null
let debounceTimer: ReturnType<typeof setTimeout> | undefined

const color = computed(() => props.webcam.extra_data?.nozzleCrosshairColor ?? '#ff0000')

const styleLines = computed(() => ({
    backgroundColor: color.value,
}))

const styleCircle = computed(() => {
    const nozzleCrosshairSize = props.webcam.extra_data?.nozzleCrosshairSize ?? 0.1
    const size = clientHeight.value * nozzleCrosshairSize

    return {
        borderColor: color.value,
        width: `${size}px`,
        height: `${size}px`,
        marginLeft: `-${size / 2}px`,
        marginTop: `-${size / 2}px`,
    }
})

// debounce replaces the removed vue-debounce-decorator @Debounce(200)
function handleResize() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        nextTick(() => {
            clientHeight.value = container.value?.clientHeight ?? 0
        })
    }, 200)
}

onMounted(() => {
    handleResize()

    if (container.value) {
        resizeObserver = new ResizeObserver(() => handleResize())
        resizeObserver.observe(container.value)
    }
})

onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<style scoped>
.crosshair-container {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
}

.line {
    position: absolute;
    background-color: #ff0000;
}

.horizontal {
    height: 1px;
    top: 50%;
    left: 0;
    right: 0;
}

.vertical {
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1px;
}

.circle {
    position: absolute;
    border: 1px solid #ff0000;
    border-radius: 50%;
    box-sizing: border-box;
    top: 50%;
    left: 50%;
}
</style>
