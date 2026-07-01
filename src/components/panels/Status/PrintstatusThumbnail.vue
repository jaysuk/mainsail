<template>
    <div v-if="current_filename" ref="wrapper" class="statusPanel-printstatus-thumbnail">
        <v-img
            v-if="boolBigThumbnail"
            ref="bigThumbnail"
            :src="thumbnailBig"
            tabindex="-1"
            class="d-flex align-end statusPanel-big-thumbnail"
            height="200"
            :style="thumbnailStyle"
            @focus="focus = true"
            @blur="focus = false">
            <v-card-title class="text-white py-2 px-2" :style="styleThumbnailOverlay">
                <v-row>
                    <v-col>
                        <span class="subtitle-2 text-truncate px-0 text-disabled d-block">
                            <v-icon size="small" class="mr-2">{{ mdiFileOutline }}</v-icon>
                            {{ current_filename }}
                        </span>
                    </v-col>
                </v-row>
            </v-card-title>
        </v-img>
        <template v-else>
            <v-container>
                <v-row>
                    <v-col :class="thumbnailSmall ? 'py-3' : 'py-2'" :style="thumbnailSmall ? 'width: calc(100% - 40px);' : ''">
                        <span class="subtitle-2 text-truncate d-block px-0 text-disabled">
                            <v-icon size="small" class="mr-2">{{ mdiFileOutline }}</v-icon>
                            {{ current_filename }}
                        </span>
                    </v-col>
                    <v-col v-if="thumbnailSmall" class="pa-2 pl-0 col-auto">
                        <template v-if="thumbnailSmall && thumbnailBig">
                            <v-tooltip location="top" content-class="tooltip__content-opacity1">
                                <template #activator="{ props: activatorProps }">
                                    <load-image :src="thumbnailSmall" class="d-flex">
                                        <template #image>
                                            <img :src="thumbnailSmall" width="32" height="32" :alt="current_filename" v-bind="activatorProps" />
                                        </template>
                                        <template #preloader>
                                            <v-progress-circular indeterminate color="primary" />
                                        </template>
                                        <template #error>
                                            <v-icon>{{ mdiFile }}</v-icon>
                                        </template>
                                    </load-image>
                                </template>
                                <span><img :src="thumbnailBig" width="250" :alt="current_filename" /></span>
                            </v-tooltip>
                        </template>
                        <template v-else-if="thumbnailSmall">
                            <load-image :src="thumbnailSmall">
                                <template #image>
                                    <img :src="thumbnailSmall" width="32" height="32" :alt="current_filename" />
                                </template>
                                <template #preloader>
                                    <v-progress-circular indeterminate color="primary" />
                                </template>
                                <template #error>
                                    <v-icon>{{ mdiFile }}</v-icon>
                                </template>
                            </load-image>
                        </template>
                    </v-col>
                </v-row>
            </v-container>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { defaultBigThumbnailBackground, thumbnailBigMin, thumbnailSmallMax, thumbnailSmallMin } from '@/store/variables'
import { mdiFileOutline, mdiFile } from '@mdi/js'
import { escapePath } from '@/plugins/helpers'
import type { FileStateFileThumbnail } from '@/store/files/types'
import LoadImage from '@/components/ui/LoadImage.vue'
import { useBase } from '@/composables/useBase'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'

const { apiUrl } = useBase()
const { isDark } = useMainsailTheme()
const printerStore = usePrinterStore()
const guiStore = useGuiStore()

const focus = ref(false)
const thumbnailFactor = ref(0)
let resizeObserver: ResizeObserver | null = null
let debounceTimer: ReturnType<typeof setTimeout> | undefined

const wrapper = ref<HTMLDivElement | null>(null)
const bigThumbnail = ref<{ $el: HTMLElement } | null>(null)

const current_filename = computed(() => printerStore.print_stats?.filename ?? '')

const current_file = computed(() => printerStore.current_file ?? {})

const thumbnailBig = computed(() => {
    if ('thumbnails' in current_file.value && current_file.value.thumbnails.length) {
        const thumbnail = current_file.value.thumbnails.find((thumb: FileStateFileThumbnail) => thumb.width >= thumbnailBigMin)

        if (thumbnail && 'relative_path' in thumbnail) {
            let relative_url = ''
            if (current_file.value.filename.lastIndexOf('/') !== -1) {
                relative_url = current_file.value.filename.substr(0, current_file.value.filename.lastIndexOf('/') + 1)
            }

            if (thumbnail && 'relative_path' in thumbnail) {
                return `${apiUrl.value}/server/files/gcodes/${escapePath(relative_url + thumbnail.relative_path)}?timestamp=${current_file.value.modified}`
            }
        }
    }

    return ''
})

const thumbnailBigHeight = computed(() => {
    if ('thumbnails' in current_file.value && current_file.value.thumbnails.length) {
        const thumbnail = current_file.value.thumbnails.find((thumb: FileStateFileThumbnail) => thumb.width >= thumbnailBigMin)

        if (thumbnail && 'height' in thumbnail) {
            return thumbnail.height
        }
    }

    return 200
})

const thumbnailBigWidth = computed(() => {
    if ('thumbnails' in current_file.value && current_file.value.thumbnails.length) {
        const thumbnail = current_file.value.thumbnails.find((thumb: FileStateFileThumbnail) => thumb.width >= thumbnailBigMin)

        if (thumbnail && 'width' in thumbnail) {
            return thumbnail.width
        }
    }

    return 300
})

const thumbnailSmall = computed(() => {
    if ('thumbnails' in current_file.value && current_file.value.thumbnails.length) {
        const thumbnail = current_file.value.thumbnails.find(
            (thumb: FileStateFileThumbnail) => thumb.width >= thumbnailSmallMin && thumb.width <= thumbnailSmallMax && thumb.height >= thumbnailSmallMin && thumb.height <= thumbnailSmallMax
        )

        if (thumbnail && 'relative_path' in thumbnail) {
            let relative_url = ''
            if (current_file.value.filename.lastIndexOf('/') !== -1) {
                relative_url = current_file.value.filename.substr(0, current_file.value.filename.lastIndexOf('/') + 1)
            }

            if (thumbnail && 'relative_path' in thumbnail) {
                return `${apiUrl.value}/server/files/gcodes/${escapePath(relative_url + thumbnail.relative_path)}?timestamp=${current_file.value.modified}`
            }
        }
    }

    return ''
})

const boolBigThumbnail = computed(() => {
    const setting = guiStore.uiSettings.boolBigThumbnail ?? true

    return current_filename.value && setting && thumbnailBig.value
})

const bigThumbnailBackground = computed(() => guiStore.uiSettings.bigThumbnailBackground ?? defaultBigThumbnailBackground)

const printstatusThumbnailZoom = computed(() => guiStore.uiSettings.printstatusThumbnailZoom ?? true)

const thumbnailBlurHeight = computed(() => {
    if (thumbnailFactor.value === 0) return 0

    return (thumbnailBigHeight.value * thumbnailFactor.value).toFixed()
})

const thumbnailStyle = computed(() => {
    const output: { height: string; backgroundColor?: string } = {
        height: '200px',
    }

    if (!printstatusThumbnailZoom.value) {
        output.height = '100%'
    } else if (focus.value && Number(thumbnailBlurHeight.value) > 0) {
        output.height = `${thumbnailBlurHeight.value}px`
    }

    if (defaultBigThumbnailBackground.toLowerCase() !== bigThumbnailBackground.value.toLowerCase()) {
        output.backgroundColor = bigThumbnailBackground.value

        return output
    }

    return output
})

const styleThumbnailOverlay = computed(() => {
    const style = {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(3px)',
    }

    if (!isDark.value) {
        style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
    }

    return style
})

function calcThumbnailFactor() {
    const thumbnailClientWidth = bigThumbnail.value?.$el.clientWidth ?? 0
    if (!thumbnailClientWidth || !thumbnailBigWidth.value) thumbnailFactor.value = 0

    thumbnailFactor.value = thumbnailClientWidth / thumbnailBigWidth.value
}

function handleResize() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        nextTick(() => {
            calcThumbnailFactor()
        })
    }, 200)
}

function setupResizeObserver() {
    resizeObserver?.disconnect()

    if (!wrapper.value) return

    resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(wrapper.value)
}

onMounted(() => {
    setupResizeObserver()
})

onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    if (debounceTimer) clearTimeout(debounceTimer)
})

watch(current_filename, () => {
    nextTick(() => calcThumbnailFactor())
})
</script>

<style scoped>
.statusPanel-big-thumbnail {
    transition: height 0.25s ease-out;
}

.statusPanel-printstatus-thumbnail {
    position: relative;
}

.statusPanel-thumbnail-overlay {
    background-color: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(3px);
}
</style>
