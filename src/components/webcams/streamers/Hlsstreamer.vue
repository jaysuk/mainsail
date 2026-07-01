<template>
    <div class="webcamBackground" :style="wrapperStyle">
        <video ref="video" autoplay muted :style="webcamStyle" class="webcamImage" @loadedmetadata="onLoadedMetadata" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUpdated, onBeforeUnmount } from 'vue'
import Hls from 'hls.js'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { useWebcam } from '@/composables/useWebcam'

const props = withDefaults(
    defineProps<{
        camSettings: GuiWebcamStateWebcam
        printerUrl?: string | null
    }>(),
    { printerUrl: null }
)

const { convertUrl, getWrapperStyle, generateTransform, updateAspectRatioFromVideo } = useWebcam()

const aspectRatio = ref<number | null>(null)
const isVisible = ref(true)
const video = ref<HTMLVideoElement | null>(null)
let hls: Hls | null = null
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

function onLoadedMetadata() {
    aspectRatio.value = updateAspectRatioFromVideo(video.value)
}

function play() {
    if (!video.value) return

    if (Hls.isSupported()) {
        hls?.destroy()

        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            maxLiveSyncPlaybackRate: 2,
            liveSyncDuration: 0.5,
            liveMaxLatencyDuration: 2,
            backBufferLength: 5,
        })
        hls.loadSource(url.value)
        hls.attachMedia(video.value)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.value?.play()
        })
    } else if (video.value.canPlayType('application/vnd.apple.mpegurl')) {
        fetch(url.value).then(() => {
            if (!video.value) return
            video.value.src = url.value
            video.value.play()
        })
    }
}

onMounted(() => {
    play()

    observer = new IntersectionObserver((entries) => {
        isVisible.value = entries[0]?.isIntersecting ?? false
    })
    if (video.value) observer.observe(video.value)
})

onUpdated(() => {
    play()
})

onBeforeUnmount(() => {
    observer?.disconnect()
    hls?.destroy()
})
</script>
