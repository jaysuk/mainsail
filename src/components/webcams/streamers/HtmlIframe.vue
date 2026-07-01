<template>
    <div class="webcamBackground" :style="wrapperStyle">
        <iframe class="webcamImage" :src="url" :style="iframeStyle" :title="camSettings.name" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { useWebcam } from '@/composables/useWebcam'

const DEFAULT_ASPECT_RATIO = 16 / 9

const props = withDefaults(
    defineProps<{
        camSettings: GuiWebcamStateWebcam
        printerUrl?: string | null
    }>(),
    { printerUrl: null }
)

const { convertUrl, getWrapperStyle, generateTransform } = useWebcam()

const url = computed(() => convertUrl(props.camSettings?.stream_url, props.printerUrl))

const wrapperStyle = computed(() => getWrapperStyle(aspectRatio.value, props.camSettings.rotation))

const aspectRatio = computed(() => {
    const value = props.camSettings.aspect_ratio?.trim()
    if (!value) return DEFAULT_ASPECT_RATIO

    const match = value.match(/^(\d+)\s*[:/]\s*(\d+)$/)
    if (!match) return DEFAULT_ASPECT_RATIO

    const width = parseInt(match[1]) || 1
    const height = parseInt(match[2]) || 1

    return width / height
})

const iframeStyle = computed(() => ({
    border: 'none',
    transform: generateTransform(
        props.camSettings.flip_horizontal ?? false,
        props.camSettings.flip_vertical ?? false,
        props.camSettings.rotation ?? 0,
        aspectRatio.value
    ),
    'aspect-ratio': aspectRatio.value,
}))
</script>
