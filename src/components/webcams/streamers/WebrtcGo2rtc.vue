<template>
    <div class="webcamBackground" :style="wrapperStyle">
        <video v-show="status === 'connected'" ref="video" :style="webcamStyle" class="webcamImage" autoplay playsinline muted @loadedmetadata="onLoadedMetadata" />
        <v-row v-if="status !== 'connected'">
            <v-col class="_webcam_webrtc_output text-center d-flex flex-column justify-center align-center">
                <v-progress-circular v-if="status === 'connecting'" indeterminate color="primary" class="mb-3" />
                <span class="mt-3">{{ status }}</span>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { useBase } from '@/composables/useBase'
import { useWebcam } from '@/composables/useWebcam'
import { useGuiStore } from '@/store/gui'
import { useSocketStore } from '@/store/socket'

const props = withDefaults(
    defineProps<{
        camSettings: GuiWebcamStateWebcam
        printerUrl?: string | null
    }>(),
    { printerUrl: null }
)

const { viewport } = useBase()
const { convertUrl, getWrapperStyle, generateTransform, updateAspectRatioFromVideo } = useWebcam()
const guiStore = useGuiStore()
const socketStore = useSocketStore()

let pc: RTCPeerConnection | null = null
let ws: WebSocket | null = null
const restartPause = 2000
let restartTimeout: number | null = null
const status = ref('connecting')
const aspectRatio = ref<number | null>(null)
const video = ref<HTMLVideoElement | null>(null)

const wrapperStyle = computed(() => getWrapperStyle(aspectRatio.value, props.camSettings.rotation))

const webcamStyle = computed(() => ({
    transform: generateTransform(
        props.camSettings.flip_horizontal ?? false,
        props.camSettings.flip_vertical ?? false,
        props.camSettings.rotation ?? 0,
        aspectRatio.value ?? 1
    ),
}))

const enableAudio = computed(() => props.camSettings.extra_data?.enableAudio ?? false)

const url = computed(() => {
    // eslint-disable-next-line no-useless-assignment -- urlSearch is used inside try after reassignment
    let urlSearch = ''
    let urlObj = new URL(location.href)

    try {
        urlSearch = new URL(props.camSettings.stream_url).search.toString()
        urlObj = new URL('api/ws' + urlSearch, props.camSettings.stream_url)
    } catch {
        log('invalid url', props.camSettings.stream_url)
    }

    // create media types array
    const media = ['video']
    if (enableAudio.value) media.push('audio')

    urlObj.searchParams.set('media', media.join('+'))
    // change protocol to ws
    urlObj.protocol = socketStore.protocol + ':'

    // output a warning, if no src is set in the url
    if (!urlObj.searchParams.has('src')) {
        log('no src set in url')
    }

    return convertUrl(urlObj.toString(), props.printerUrl)
})

const expanded = computed<boolean>(() => guiStore.getPanelExpand('webcam-panel', viewport.value) ?? false)

function log(msg: string, obj?: unknown) {
    if (obj) {
        window.console.log(`[WebRTC go2rtc] ${msg}`, obj)
        return
    }

    window.console.log(`[WebRTC go2rtc] ${msg}`)
}

function terminate() {
    log('terminating')

    if (pc !== null) {
        pc.close()
        pc = null
    }

    if (ws !== null) {
        ws.close()
        ws = null
    }
}

function scheduleRestart() {
    if (restartTimeout !== null) return

    terminate()

    restartTimeout = window.setTimeout(() => {
        restartTimeout = null
        start()
    }, restartPause)
}

function onWebSocketMessage(ev: MessageEvent) {
    const msg = JSON.parse(ev.data)

    if (msg.type === 'webrtc/candidate') {
        pc?.addIceCandidate({ candidate: msg.value, sdpMid: '0' })
    } else if (msg.type === 'webrtc/answer') {
        pc?.setRemoteDescription({ type: 'answer', sdp: msg.value })
    }
}

function onWebSocketClose(ev: CloseEvent) {
    log('close')
    status.value = 'disconnected'

    if (!ev.wasClean) scheduleRestart()
}

function onWebSocketOpen() {
    log('open')

    if (restartTimeout !== null) {
        clearTimeout(restartTimeout)
        restartTimeout = null
    }

    pc?.addEventListener('icecandidate', (ev) => {
        if (!ev.candidate) return
        const msg = { type: 'webrtc/candidate', value: ev.candidate.candidate }
        ws?.send(JSON.stringify(msg))
    })

    pc?.addEventListener('connectionstatechange', () => {
        status.value = (pc?.connectionState ?? '').toString()
        log('connection state changed', status.value)

        if (['failed', 'disconnected'].includes(status.value)) {
            scheduleRestart()
        }
    })

    pc?.createOffer()
        .then((offer) => pc?.setLocalDescription(offer))
        .then(() => {
            const msg = { type: 'webrtc/offer', value: pc?.localDescription?.sdp }
            ws?.send(JSON.stringify(msg))
        })
}

// webrtc player methods
// adapted from https://github.com/AlexxIT/go2rtc/blob/master/www/webrtc.html
function start() {
    if (!video.value) {
        scheduleRestart()
        return
    }

    log('connecting to ' + url.value)
    status.value = 'connecting'

    pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    const localTracks: MediaStreamTrack[] = []
    const kinds = ['video', 'audio']
    kinds.forEach((kind: string) => {
        const track = pc?.addTransceiver(kind, { direction: 'recvonly' }).receiver.track
        if (track) localTracks.push(track)
    })
    video.value.srcObject = new MediaStream(localTracks)

    ws = new WebSocket(url.value)
    ws.addEventListener('open', () => onWebSocketOpen())
    ws.addEventListener('message', (ev) => onWebSocketMessage(ev))
    ws.addEventListener('close', (ev) => onWebSocketClose(ev))
}

function onLoadedMetadata() {
    aspectRatio.value = updateAspectRatioFromVideo(video.value)
}

onMounted(() => {
    start()
})

// stop the video and close the streams if the component is going to be destroyed so we don't leave hanging streams
onBeforeUnmount(() => {
    terminate()

    // clear any potentially open restart timeout
    if (restartTimeout) clearTimeout(restartTimeout)
})

// stop and restart the video if the url changes
watch(url, () => {
    terminate()
    start()
})

// stop and restart the video if enableAudio changes
watch(enableAudio, () => {
    terminate()
    start()
})

// start or stop the video when the expand state changes
watch(
    expanded,
    (newExpanded) => {
        if (!newExpanded) {
            terminate()
            return
        }

        start()
    },
    { immediate: true }
)
</script>

<style scoped>
._webcam_webrtc_output {
    aspect-ratio: calc(3 / 2);
}
</style>
