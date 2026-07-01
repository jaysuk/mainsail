<template>
    <div class="webcamBackground" :style="wrapperStyle">
        <video v-show="status === 'started'" ref="stream" class="webcamImage" :style="webcamStyle" autoplay muted playsinline @loadedmetadata="onLoadedMetadata" />
        <v-row v-if="status !== 'started'">
            <v-col class="_webcam_webrtc_output text-center d-flex flex-column justify-center align-center">
                <v-progress-circular v-if="status === 'connecting'" indeterminate color="primary" class="mb-3" />
                <span class="mt-3">{{ status }}</span>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { JanusJs, JanusSession, JanusStreamingPlugin } from 'typed_janus_js'
import type { ConstructorOptions } from 'typed_janus_js/dist/interfaces/janus'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { useBase } from '@/composables/useBase'
import { useWebcam } from '@/composables/useWebcam'

const props = withDefaults(
    defineProps<{
        camSettings: GuiWebcamStateWebcam
        printerUrl?: string | null
    }>(),
    { printerUrl: null }
)

const { hostUrl } = useBase()
const { getWrapperStyle, generateTransform, updateAspectRatioFromVideo } = useWebcam()

let janusClient: JanusJs | null = null
let session: JanusSession | null = null
let handle: JanusStreamingPlugin | null = null
const useStun = false
const aspectRatio = ref<number | null>(null)
const status = ref('connecting')
const stream = ref<HTMLVideoElement | null>(null)

const url = computed(() => {
    const baseUrl = props.camSettings.stream_url
    let url = new URL(baseUrl, props.printerUrl === null ? hostUrl.value.toString() : props.printerUrl)
    url.port = '8188'
    url.protocol = props.printerUrl?.startsWith('https') ? 'wss' : 'ws'

    if (baseUrl.startsWith('ws') || baseUrl.startsWith('http')) {
        url = new URL(baseUrl)
        const pathnameParts = url.pathname.split('/')
        url.pathname = pathnameParts.slice(0, pathnameParts.length - 1).join('/')
    }

    return url
})

const wrapperStyle = computed(() => getWrapperStyle(aspectRatio.value, props.camSettings.rotation))

const streamId = computed(() => {
    const pathnameParts = new URL(props.camSettings.stream_url).pathname.split('/')
    return pathnameParts[pathnameParts.length - 1]
})

const webcamStyle = computed(() => ({
    transform: generateTransform(
        props.camSettings.flip_horizontal ?? false,
        props.camSettings.flip_vertical ?? false,
        props.camSettings.rotation ?? 0,
        aspectRatio.value ?? 1
    ),
}))

const streamConfig = computed(() => {
    const config: ConstructorOptions = {
        server: url.value.toString(),
    }

    if (useStun) {
        config.iceServers = [{ urls: ['stun:stun.l.google.com:19302'] }]
    }

    return config
})

async function startStream() {
    janusClient = new JanusJs(streamConfig.value)
    await janusClient.init({ debug: false })
    session = await janusClient.createSession()
    handle = await session.attach<JanusStreamingPlugin>(JanusStreamingPlugin, {})
    handle?.onMessage.subscribe(async ({ message, jsep }) => {
        if (message?.result?.status) {
            status.value = message.result.status
        }
        if (jsep) {
            const answer = await handle?.createAnswer({ jsep })
            handle?.send({ message: { request: 'start' }, jsep: answer })
        }
    })
    const remoteStream = new MediaStream()
    JanusJs.attachMediaStream(stream.value as HTMLMediaElement, remoteStream)
    handle?.onRemoteTrack.subscribe(({ on, track }) => {
        if (on) remoteStream.addTrack(track)
        else remoteStream.removeTrack(track)
    })
    handle.onIceState.subscribe((value) => {
        console.log(`ICE state changed to ${value}`)
    })
    handle.onError.subscribe((value) => {
        status.value = `errored: ${JSON.stringify(value)}`
    })
    await handle.send({ message: { request: 'watch', id: parseInt(streamId.value!) } })
}

function onLoadedMetadata() {
    aspectRatio.value = updateAspectRatioFromVideo(stream.value)
}

onMounted(() => {
    startStream()
})

onBeforeUnmount(() => {
    session?.destroy({})
})

watch(url, async () => {
    await session?.destroy({})
    await startStream()
})
</script>

<style scoped>
._webcam_webrtc_output {
    aspect-ratio: calc(3 / 2);
}
</style>
