<template>
    <div class="webcamBackground" :style="wrapperStyle">
        <img v-show="status === 'connected'" ref="image" class="webcamImage" draggable="false" :style="webcamStyle" :alt="camSettings.name" src="#" @load="onload" />
        <span v-if="showFpsCounter && status === 'connected'" class="webcamFpsOutput">{{ t('Panels.WebcamPanel.FPS') }}: {{ fpsOutput }}</span>
        <webcam-nozzle-crosshair v-if="showNozzleCrosshair" :webcam="camSettings" />
        <v-row v-if="status !== 'connected'">
            <v-col class="_webcam_mjpegstreamer_output text-center d-flex flex-column justify-center align-center">
                <v-progress-circular v-if="status === 'connecting'" indeterminate color="primary" class="mb-3" />
                <span class="mt-3">{{ statusMessage }}</span>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { useBase } from '@/composables/useBase'
import { useWebcam } from '@/composables/useWebcam'
import { useGuiStore } from '@/store/gui'
import WebcamNozzleCrosshair from '@/components/webcams/WebcamNozzleCrosshair.vue'

const CONTENT_LENGTH = 'content-length'

const SOI = new Uint8Array(2)
SOI[0] = 0xff
SOI[1] = 0xd8

const props = withDefaults(
    defineProps<{
        camSettings: GuiWebcamStateWebcam
        printerUrl?: string | null
        showFps?: boolean
        page?: string | null
    }>(),
    {
        printerUrl: null,
        showFps: true,
        page: null,
    }
)

const { t } = useI18n()
const { viewport } = useBase()
const { convertUrl, getWrapperStyle, generateTransform, updateAspectRatioFromImage } = useWebcam()
const guiStore = useGuiStore()

// current read stream frames counter
let frames = 0
// current displayed fps
const currentFPS = ref(0)
const status = ref('connecting')
const statusMessage = ref('')
let streamState = false
const aspectRatio = ref<number | null>(null)
let timerFPS: number | null = null
let timerRestart: number | null = null
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
const image = ref<HTMLImageElement | null>(null)

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

const fpsOutput = computed(() => currentFPS.value.toString().padStart(2, '0'))

const showFpsCounter = computed(() => {
    if (!props.showFps) return false

    return !(props.camSettings.extra_data?.hideFps ?? false)
})

const expanded = computed<boolean>(() => {
    if (props.page !== 'dashboard') return true

    return guiStore.getPanelExpand('webcam-panel', viewport.value) ?? false
})

const showNozzleCrosshair = computed(() => {
    const nozzleCrosshair = props.camSettings.extra_data?.nozzleCrosshair ?? false

    return nozzleCrosshair && status.value === 'connected'
})

function log(msg: string, obj?: unknown) {
    if (obj) {
        window.console.log(`[MJPEG streamer] ${msg}`, obj)
        return
    }

    window.console.log(`[MJPEG streamer] ${msg}`)
}

function getLength(headers: string) {
    let contentLength = -1
    headers.split('\n').forEach((header: string) => {
        const pair = header.split(':')
        if (pair[0].toLowerCase() === CONTENT_LENGTH) {
            // Fix for issue https://github.com/aruntj/mjpeg-readable-stream/issues/3 suggested by martapanc
            contentLength = Number(pair[1])
        }
    })
    return contentLength
}

function clearTimeouts() {
    frames = 0
    if (timerFPS) {
        window.clearInterval(timerFPS)
        timerFPS = null
    }
    if (timerRestart) {
        window.clearTimeout(timerRestart)
        timerRestart = null
    }
}

async function readStream() {
    // stop if the stream is not ready
    if (!reader) return

    try {
        // variables to read the stream
        let headers = ''
        let contentLength = -1
        let imageBuffer: Uint8Array = new Uint8Array(0)
        let bytesRead = 0
        let skipFrame = false

        let done: boolean | null = null
        let value

        do {
            ;({ done, value } = await reader.read())

            if (done || !value) continue

            for (let index = 0; index < value.length; index++) {
                // we've found the start of the frame. Everything we've read till now is the header.
                if (value[index] === SOI[0] && value[index + 1] === SOI[1]) {
                    contentLength = getLength(headers)
                    imageBuffer = new Uint8Array(new ArrayBuffer(contentLength))
                }

                // we're still reading the header.
                if (contentLength <= 0) {
                    headers += String.fromCharCode(value[index])
                    continue
                }

                // we're now reading the jpeg.
                if (bytesRead < contentLength) {
                    imageBuffer[bytesRead++] = value[index]
                    continue
                }

                // we're done reading the jpeg. Time to render it.
                if (image.value && !skipFrame) {
                    const objectURL = URL.createObjectURL(new Blob([imageBuffer as BlobPart], { type: 'image/jpeg' }))
                    image.value.src = objectURL
                    skipFrame = true

                    // update status to 'connected' if the first frame is received
                    if (status.value !== 'connected') {
                        status.value = 'connected'
                        statusMessage.value = ''
                    }

                    image.value.onload = () => {
                        URL.revokeObjectURL(objectURL)
                        skipFrame = false
                    }
                }
                frames++
                contentLength = 0
                bytesRead = 0
                headers = ''
            }
        } while (!done)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        log(`readStream error: ${message}`, error)
    } finally {
        reader?.releaseLock()
    }
}

async function stopStream(skipStatus: boolean = false) {
    streamState = false

    if (!skipStatus) {
        status.value = 'disconnected'
        statusMessage.value = t('Panels.WebcamPanel.Disconnected')
    }
    clearTimeouts()

    try {
        await reader?.cancel()
        reader?.releaseLock()
        reader = null
    } catch (error) {
        log('Error cancelling reader:', error)
    }
}

async function restartStream(skipStatus: boolean = false) {
    await stopStream(skipStatus)
    await startStream(skipStatus)
}

async function startStream(skipStatus: boolean = false) {
    if (streamState) {
        return
    }
    streamState = true

    if (!skipStatus) {
        status.value = 'connecting'
        statusMessage.value = t('Panels.WebcamPanel.ConnectingTo', { url: url.value })
    }

    // reset counter and timeout/interval
    clearTimeouts()

    try {
        //readable stream credit to from https://github.com/aruntj/mjpeg-readable-stream

        const fetchUrl = new URL(url.value)
        fetchUrl.searchParams.append('timestamp', new Date().getTime().toString())

        let response: Response | null = await fetch(fetchUrl.toString(), { mode: 'cors' })

        if (!response.ok) {
            log(`${response.status}: ${response.statusText}`)
            await stopStream()
            return
        }

        if (!response.body) {
            log('ReadableStream not yet supported in this browser.')
            await stopStream()
            return
        }

        timerFPS = window.setInterval(() => {
            currentFPS.value = frames
            frames = 0
        }, 1000)

        timerRestart = window.setTimeout(() => {
            restartStream(true)
        }, 10000)

        reader = response.body?.getReader()

        await readStream()

        // cleanup
        reader = null
        response = null
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        log(message)
        status.value = 'error'
        statusMessage.value = t('Panels.WebcamPanel.ErrorWhileConnecting', { url: url.value })

        timerRestart = window.setTimeout(() => {
            restartStream()
        }, 5000)
    }
}

// this function check if you changed the browser tab
function documentVisibilityChanged() {
    const visibility = document.visibilityState
    let bool = visibility === 'visible'

    if (props.page === 'dashboard' && !expanded.value) {
        bool = false
    }

    if (!bool) {
        stopStream()
        return
    }

    startStream()
}

function onload() {
    if (aspectRatio.value !== null) return

    aspectRatio.value = updateAspectRatioFromImage(image.value)
}

onMounted(() => {
    document.addEventListener('visibilitychange', documentVisibilityChanged)
})

onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', documentVisibilityChanged)
    stopStream()
})

// start or stop the video when the expanded state changes
watch(
    expanded,
    (newExpanded) => {
        if (!newExpanded) {
            stopStream()
            return
        }

        startStream()
    },
    { immediate: true }
)

watch(
    () => props.camSettings,
    () => {
        aspectRatio.value = null
        restartStream()
    },
    { deep: true }
)
</script>

<style scoped>
.webcamFpsOutput {
    display: inline-block;
    position: absolute;
    bottom: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.8);
    padding: 3px 10px;
    border-top-left-radius: 5px;
}

html.theme--light .webcamFpsOutput {
    background: rgba(255, 255, 255, 0.7);
}

._webcam_mjpegstreamer_output {
    aspect-ratio: calc(3 / 2);
}
</style>
