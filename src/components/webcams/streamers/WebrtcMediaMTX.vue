<template>
    <div class="webcamBackground" :style="wrapperStyle">
        <video v-show="status === 'connected'" ref="video" :style="webcamStyle" class="webcamImage" autoplay playsinline muted @loadedmetadata="onLoadedMetadata" />
        <v-row v-if="status !== 'connected'">
            <v-col class="_webcam_webrtc_output text-center d-flex flex-column justify-center align-center">
                <v-progress-circular v-if="status === 'connecting'" indeterminate color="primary" class="mb-3" />
                <span class="mt-3">{{ capitalize(status) }}</span>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { capitalize } from '@/plugins/helpers'
import { useBase } from '@/composables/useBase'
import { useWebcam } from '@/composables/useWebcam'
import { useGuiStore } from '@/store/gui'

interface OfferData {
    iceUfrag: string
    icePwd: string
    medias: string[]
}

interface RTCIceServerWithCredentialType extends RTCIceServer {
    credentialType?: string
}

const props = withDefaults(
    defineProps<{
        camSettings: GuiWebcamStateWebcam
        printerUrl?: string | null
        page?: string | null
    }>(),
    {
        printerUrl: null,
        page: null,
    }
)

const { viewport } = useBase()
const { convertUrl, getWrapperStyle, generateTransform, updateAspectRatioFromVideo } = useWebcam()
const guiStore = useGuiStore()

let pc: RTCPeerConnection | null = null
let restartTimeout: ReturnType<typeof setTimeout> | null = null
const status = ref('connecting')
let eTag: string | null = null
let sessionUuid: string | null = null
let queuedCandidates: RTCIceCandidate[] = []
let offerData: OfferData = {
    iceUfrag: '',
    icePwd: '',
    medias: [],
}
const RESTART_PAUSE = 2000
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

const url = computed(() => {
    let baseUrl = props.camSettings.stream_url
    if (!baseUrl.endsWith('/')) baseUrl += '/'
    baseUrl += 'whep'

    return convertUrl(baseUrl, props.printerUrl)
})

const expanded = computed<boolean>(() => {
    if (props.page !== 'dashboard') return true

    return guiStore.getPanelExpand('webcam-panel', viewport.value) ?? false
})

function log(msg: string, obj?: unknown) {
    if (obj) {
        window.console.log(`[WebRTC mediamtx] ${msg}`, obj)
        return
    }

    window.console.log(`[WebRTC mediamtx] ${msg}`)
}

// webrtc player methods
// adapted from https://github.com/bluenviron/mediamtx/blob/main/internal/core/webrtc_read_index.html

const unquoteCredential = (v: string) => JSON.parse(`"${v}"`)

function linkToIceServers(links: string | null): RTCIceServer[] {
    if (links === null) return []

    return links.split(', ').map((link) => {
        const m: RegExpMatchArray | null = link.match(/^<(.+?)>; rel="ice-server"(; username="(.*?)"; credential="(.*?)"; credential-type="password")?/i)

        // break if match is null
        if (m === null) return { urls: '' }

        const ret: RTCIceServerWithCredentialType = {
            urls: [m[1]],
        }

        if (m.length > 3) {
            ret.username = unquoteCredential(m[3])
            ret.credential = unquoteCredential(m[4])
            ret.credentialType = 'password'
        }

        return ret
    })
}

function parseOffer(offer: string) {
    const ret: OfferData = {
        iceUfrag: '',
        icePwd: '',
        medias: [],
    }

    for (const line of offer.split('\r\n')) {
        if (line.startsWith('m=')) {
            ret.medias.push(line.slice('m='.length))
        } else if (ret.iceUfrag === '' && line.startsWith('a=ice-ufrag:')) {
            ret.iceUfrag = line.slice('a=ice-ufrag:'.length)
        } else if (ret.icePwd === '' && line.startsWith('a=ice-pwd:')) {
            ret.icePwd = line.slice('a=ice-pwd:'.length)
        }
    }

    return ret
}

function generateSdpFragment(data: OfferData, candidates: RTCIceCandidate[]) {
    // I don't found a specification for this, but it seems to be the only way to make it work
    const candidatesByMedia: Record<number, RTCIceCandidate[]> = {}
    for (const candidate of candidates) {
        const mid = candidate.sdpMLineIndex
        if (mid === null) continue

        // create the array if it doesn't exist
        if (!(mid in candidatesByMedia)) candidatesByMedia[mid] = []
        candidatesByMedia[mid].push(candidate)
    }

    let frag = 'a=ice-ufrag:' + data.iceUfrag + '\r\n' + 'a=ice-pwd:' + data.icePwd + '\r\n'
    let mid = 0

    for (const media of data.medias) {
        if (candidatesByMedia[mid] !== undefined) {
            frag += 'm=' + media + '\r\n' + 'a=mid:' + mid + '\r\n'

            for (const candidate of candidatesByMedia[mid]) {
                frag += 'a=' + candidate.candidate + '\r\n'
            }
        }

        mid++
    }

    return frag
}

function terminate() {
    log('terminating')

    if (pc !== null) {
        pc.close()
        pc = null
    }
}

function scheduleRestart() {
    if (restartTimeout !== null) return

    terminate()

    restartTimeout = setTimeout(() => {
        log('scheduling restart')
        restartTimeout = null
        start()
    }, RESTART_PAUSE)

    eTag = ''
    queuedCandidates = []
}

async function sendLocalCandidates(candidates: RTCIceCandidate[]) {
    if (sessionUuid === null) {
        log('Session-UUID is null')
        scheduleRestart()

        return
    }

    const patchUrl = (url.value ?? '') + '/' + sessionUuid
    try {
        const res = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/trickle-ice-sdpfrag',
                'If-Match': eTag,
            } as HeadersInit,
            body: generateSdpFragment(offerData, candidates),
        })

        if (res.status === 204) return

        if (res.status === 404) {
            log('stream not found')
            scheduleRestart()
            return
        }

        log(`bad status code ${res.status}`)
        scheduleRestart()
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        log(message)
        scheduleRestart()
    }
}

function onLocalCandidate(evt: RTCPeerConnectionIceEvent) {
    if (restartTimeout !== null) return

    if (evt.candidate !== null) {
        if (eTag === '') {
            queuedCandidates.push(evt.candidate)
            return
        }

        sendLocalCandidates([evt.candidate])
    }
}

function onConnectionState() {
    if (restartTimeout !== null) return

    status.value = pc?.iceConnectionState ?? ''
    log('peer connection state:', status.value)

    switch (status.value) {
        case 'disconnected':
            scheduleRestart()
    }
}

function onRemoteAnswer(answer: RTCSessionDescription) {
    if (restartTimeout !== null) return

    try {
        pc?.setRemoteDescription(answer)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        log(message)
        scheduleRestart()
    }

    if (queuedCandidates.length !== 0) {
        sendLocalCandidates(queuedCandidates)
        queuedCandidates = []
    }
}

async function onLocalOffer(offer: RTCSessionDescriptionInit) {
    try {
        const res = await fetch(url.value ?? '', {
            method: 'POST',
            headers: { 'Content-Type': 'application/sdp' },
            body: offer.sdp,
        })

        if (res.status !== 201) {
            log('error: Received bad status code:', res.status)
            scheduleRestart()
            return
        }

        offerData = parseOffer(offer.sdp ?? '')
        pc?.setLocalDescription(offer)

        eTag = res.headers.get('ETag')
        const location = res.headers.get('Location') ?? ''
        sessionUuid = location?.substring(location.lastIndexOf('/') + 1) ?? null

        // fallback for MediaMTX v1.0.x with broken ETag header
        if (res.headers.has('E-Tag')) eTag = res.headers.get('E-Tag')

        const sdp = await res.text()
        onRemoteAnswer(
            new RTCSessionDescription({
                type: 'answer',
                sdp,
            })
        )
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err ?? 'unknown error')
        log(message)
        scheduleRestart()
    }
}

async function onIceServers(res: Response) {
    const iceServers = linkToIceServers(res.headers.get('Link'))
    log('ice servers:', iceServers)

    // https://webrtc.org/getting-started/unified-plan-transition-guide
    pc = new RTCPeerConnection({
        iceServers,
        sdpSemantics: 'unified-plan',
    } as RTCConfiguration & { sdpSemantics?: string })

    const direction = 'sendrecv'
    pc.addTransceiver('video', { direction })
    pc.addTransceiver('audio', { direction })

    pc.onicecandidate = (evt: RTCPeerConnectionIceEvent) => onLocalCandidate(evt)
    pc.oniceconnectionstatechange = () => onConnectionState()

    pc.ontrack = (evt) => {
        log('new track:', evt.track.kind)
        if (video.value) video.value.srcObject = evt.streams[0]
    }

    const offer = await pc.createOffer()
    await onLocalOffer(offer)
}

async function start() {
    // clear any potentially open restart timeout
    if (restartTimeout !== null) {
        clearTimeout(restartTimeout)
        restartTimeout = null
    }

    // stop if url is not valid
    if (url.value === null) {
        log('invalid url')

        scheduleRestart()
        return
    }

    log('requesting ICE servers from ' + url.value)

    try {
        const res = await fetch(url.value, { method: 'OPTIONS' })
        if (res.status !== 204) {
            log('error: Received bad status code:', res.status)
            scheduleRestart()
            return
        }

        await onIceServers(res)
    } catch {
        log('error: Cannot connect to backend')
        scheduleRestart()
    }
}

function onLoadedMetadata() {
    aspectRatio.value = updateAspectRatioFromVideo(video.value)
}

// stop and restart the video if the url changes
watch(url, () => {
    terminate()
    start()
})

// start or stop the video when the expanded state changes
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

// stop the video and close the streams if the component is going to be destroyed so we don't leave hanging streams
onBeforeUnmount(() => {
    terminate()

    // clear any potentially open restart timeout
    if (restartTimeout) clearTimeout(restartTimeout)
})
</script>

<style scoped>
._webcam_webrtc_output {
    aspect-ratio: calc(3 / 2);
}
</style>
