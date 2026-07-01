<template>
    <div class="webcamBackground" :style="wrapperStyle">
        <video ref="video" autoplay :style="webcamStyle" class="webcamImage" @loadedmetadata="onLoadedMetadata" />
        <v-row v-if="status !== 'connected'">
            <v-col class="_webcam_jmuxer_output text-center d-flex flex-column justify-center align-center">
                <v-progress-circular v-if="status === 'connecting'" indeterminate color="primary" class="mb-3" />
                <span class="mt-3">{{ status }}</span>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import JMuxer from 'jmuxer'
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

let jmuxer: JMuxer | null = null
const status = ref('connecting')
const aspectRatio = ref<number | null>(null)
const video = ref<HTMLVideoElement | null>(null)

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

function play() {
    if (!video.value) return

    status.value = 'connecting'
    jmuxer?.destroy()

    // Only websocket streams supported
    if (!url.value.startsWith('ws://') && !url.value.startsWith('wss://')) {
        console.error('jmuxer error: only websocket streams supported (ws://.. or wss://..)')
        status.value = 'error'
        return
    }

    const targetFps = props.camSettings.target_fps || 10

    jmuxer = new JMuxer({
        node: video.value,
        mode: 'video',
        flushingTime: 0,
        fps: targetFps,
        onReady: () => {
            status.value = 'connected'
            console.log('jmuxer ready')
        },
        onError: (data: unknown) => {
            status.value = 'error'
            console.log('jmuxer error:', data)
        },
    })

    const ws = new WebSocket(url.value)
    ws.binaryType = 'arraybuffer'
    ws.addEventListener('message', (event) => {
        jmuxer?.feed({
            video: new Uint8Array(event.data),
        })
    })

    ws.addEventListener('error', (event) => {
        status.value = 'error'
        console.log('jmuxer ws error:', event)
    })
}

function onLoadedMetadata() {
    aspectRatio.value = updateAspectRatioFromVideo(video.value)
}

onMounted(() => {
    play()
})

onBeforeUnmount(() => {
    jmuxer?.destroy()
})

watch(
    () => props.camSettings,
    () => {
        // restart stream, when camSettings change
        play()
    },
    { deep: true }
)
</script>

<style scoped>
._webcam_jmuxer_output {
    aspect-ratio: calc(3 / 2);
}
</style>
