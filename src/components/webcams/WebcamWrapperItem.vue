<template>
    <div>
        <mjpegstreamer-async v-if="service === 'mjpegstreamer'" :cam-settings="webcam" :show-fps="showFps" :printer-url="printerUrl" :page="page" />
        <mjpegstreamer-adaptive-async v-else-if="service === 'mjpegstreamer-adaptive'" :cam-settings="webcam" :show-fps="showFps" :printer-url="printerUrl" />
        <uv4l-mjpeg-async v-else-if="service === 'uv4l-mjpeg'" :cam-settings="webcam" :printer-url="printerUrl" />
        <html-iframe-async v-else-if="service === 'iframe'" :cam-settings="webcam" :printer-url="printerUrl" />
        <html-video-async v-else-if="service === 'html-video'" :cam-settings="webcam" :printer-url="printerUrl" />
        <hlsstreamer-async v-else-if="service === 'hlsstream'" :cam-settings="webcam" :printer-url="printerUrl" />
        <j-muxer-stream-async v-else-if="service === 'jmuxer-stream'" :cam-settings="webcam" :printer-url="printerUrl" />
        <webrtc-camera-streamer-async v-else-if="service === 'webrtc-camerastreamer'" :cam-settings="webcam" :printer-url="printerUrl" :page="page" />
        <janus-streamer-async v-else-if="service === 'webrtc-janus'" :cam-settings="webcam" :printer-url="printerUrl" />
        <webrtc-media-m-t-x-async v-else-if="service === 'webrtc-mediamtx'" :cam-settings="webcam" :printer-url="printerUrl" :page="page" />
        <webrtc-go2rtc-async v-else-if="service === 'webrtc-go2rtc'" :cam-settings="webcam" :printer-url="printerUrl" />
        <p v-else class="text-center py-3 font-italic">{{ t('Panels.WebcamPanel.UnknownWebcamService') }}</p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { DynamicCamLoader } from '@/components/webcams/streamers/DynamicCamLoader'

const HlsstreamerAsync = DynamicCamLoader('Hlsstreamer')
const HtmlVideoAsync = DynamicCamLoader('HtmlVideo')
const HtmlIframeAsync = DynamicCamLoader('HtmlIframe')
const JanusStreamerAsync = DynamicCamLoader('JanusStreamer')
const JMuxerStreamAsync = DynamicCamLoader('JMuxerStream')
const MjpegstreamerAsync = DynamicCamLoader('Mjpegstreamer')
const MjpegstreamerAdaptiveAsync = DynamicCamLoader('MjpegstreamerAdaptive')
const Uv4lMjpegAsync = DynamicCamLoader('Uv4lMjpeg')
const WebrtcCameraStreamerAsync = DynamicCamLoader('WebrtcCameraStreamer')
const WebrtcMediaMTXAsync = DynamicCamLoader('WebrtcMediaMTX')
const WebrtcGo2rtcAsync = DynamicCamLoader('WebrtcGo2rtc')

const props = withDefaults(
    defineProps<{
        webcam: GuiWebcamStateWebcam
        showFps?: boolean
        printerUrl?: string | null
        page?: string | null
    }>(),
    {
        showFps: true,
        printerUrl: null,
        page: null,
    }
)

const { t } = useI18n()

const service = computed(() => props.webcam?.service ?? 'unknown')
</script>

<style scoped>
:deep(.webcamBackground) {
    display: flex;
    justify-content: center;
    overflow: hidden;
    position: relative;
    background: rgba(0, 0, 0, 0.8);
    margin: 0 auto;
    max-height: calc(100vh - 155px);
}

:deep(.webcamImage) {
    width: 100%;
    transform-origin: center center;
    object-fit: contain;
}

html.theme--light :deep(.webcamBackground) {
    background: rgba(255, 255, 255, 0.7);
}
</style>
