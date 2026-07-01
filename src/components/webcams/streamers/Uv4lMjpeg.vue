<template>
    <div class="webcamBackground" :style="wrapperStyle">
        <img ref="image" :style="webcamStyle" class="webcamImage" draggable="false" :alt="camSettings.name" @load="onload" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { useWebcam } from '@/composables/useWebcam'

const props = withDefaults(
    defineProps<{
        camSettings: GuiWebcamStateWebcam
        printerUrl?: string | null
    }>(),
    { printerUrl: null }
)

const { convertUrl, getWrapperStyle, generateTransform, updateAspectRatioFromImage } = useWebcam()

const aspectRatio = ref<number | null>(null)
const isVisibleViewport = ref(false)
const isVisibleDocument = ref(true)
const image = ref<HTMLImageElement | null>(null)
let observer: IntersectionObserver | null = null

const url = computed(() => convertUrl(props.camSettings?.stream_url, props.printerUrl))

const wrapperStyle = computed(() => getWrapperStyle(aspectRatio.value, props.camSettings.rotation))

const webcamStyle = computed(() => ({
    transform: generateTransform(
        props.camSettings.flip_horizontal ?? false,
        props.camSettings.flip_vertical ?? false,
        props.camSettings.rotation ?? 0,
        aspectRatio.value ?? 1
    ),
}))

function startStream() {
    image.value?.setAttribute('src', url.value)
}

function stopStream() {
    if (!image.value) return

    image.value.removeAttribute('src')
    URL.revokeObjectURL(url.value)
}

// checks whether the webcam is in the viewport and whether the browser tab
// is active, and starts/stops the mjpeg stream accordingly
function visibilityChanged() {
    if (isVisibleViewport.value && isVisibleDocument.value) {
        startStream()
        return
    }

    stopStream()
}

function documentVisibilityChanged() {
    isVisibleDocument.value = document.visibilityState === 'visible'
    if (!isVisibleDocument.value) stopStream()
    visibilityChanged()
}

function onload() {
    if (aspectRatio.value !== null) return

    aspectRatio.value = updateAspectRatioFromImage(image.value)
}

onMounted(() => {
    document.addEventListener('visibilitychange', documentVisibilityChanged)

    observer = new IntersectionObserver((entries) => {
        isVisibleViewport.value = entries[0]?.isIntersecting ?? false
        visibilityChanged()
    })
    if (image.value) observer.observe(image.value)
})

onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', documentVisibilityChanged)
    observer?.disconnect()
    stopStream()
})

watch(url, () => {
    stopStream()
    startStream()
})
</script>
