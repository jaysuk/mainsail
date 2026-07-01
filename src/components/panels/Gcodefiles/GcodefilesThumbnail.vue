<template>
    <v-icon v-if="'isDirectory' in item && item.isDirectory">{{ mdiFolder }}</v-icon>
    <v-tooltip v-else-if="smallThumbnailUrl" location="top" content-class="tooltip__content-opacity1" :color="bigThumbnailTooltipColor" :disabled="!bigThumbnailUrl">
        <template #activator="{ props: activatorProps }">
            <load-image :src="smallThumbnailUrl">
                <template #image>
                    <img :src="smallThumbnailUrl ?? undefined" width="32" height="32" :alt="item.filename" v-bind="activatorProps" />
                </template>
                <template #preloader>
                    <v-progress-circular indeterminate color="primary" />
                </template>
                <template #error>
                    <v-icon>{{ mdiFile }}</v-icon>
                </template>
            </load-image>
        </template>
        <span>
            <img :src="bigThumbnailUrl ?? undefined" width="250" :alt="item.filename" />
        </span>
    </v-tooltip>
    <v-icon v-else>{{ mdiFile }}</v-icon>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileStateGcodefile } from '@/store/files/types'
import { mdiFile, mdiFolder } from '@mdi/js'
import { defaultBigThumbnailBackground, thumbnailBigMin, thumbnailSmallMax, thumbnailSmallMin } from '@/store/variables'
import { escapePath } from '@/plugins/helpers'
import type { ServerJobQueueStateJob } from '@/store/server/jobQueue/types'
import LoadImage from '@/components/ui/LoadImage.vue'
import { useBase } from '@/composables/useBase'
import { useGuiStore } from '@/store/gui'

const props = defineProps<{ item: FileStateGcodefile | ServerJobQueueStateJob }>()

const { apiUrl } = useBase()
const guiStore = useGuiStore()

const bigThumbnailBackground = computed(() => guiStore.uiSettings.bigThumbnailBackground ?? defaultBigThumbnailBackground)

const bigThumbnailTooltipColor = computed(() => {
    if (defaultBigThumbnailBackground.toLowerCase() === bigThumbnailBackground.value.toLowerCase()) {
        return undefined
    }

    return bigThumbnailBackground.value
})

const fileTimestamp = computed(() => {
    if ('modified' in props.item && typeof props.item.modified?.getTime === 'function') {
        return props.item.modified.getTime()
    }

    if ('metadata' in props.item && typeof props.item.metadata?.modified?.getTime === 'function') {
        return props.item.metadata.modified.getTime()
    }

    return 0
})

const thumbnails = computed<FileStateGcodefile['thumbnails']>(() => {
    if ('thumbnails' in props.item) return props.item.thumbnails

    return props.item.metadata?.thumbnails ?? []
})

const subdirectory = computed(() => {
    let full_filename = props.item.filename
    if ('full_filename' in props.item) full_filename = props.item.full_filename
    if (!full_filename.includes('/')) return null

    return escapePath(full_filename.substring(0, full_filename.lastIndexOf('/')))
})

function buildUrl(relativePath: string) {
    const baseArray = [apiUrl.value, 'server/files/gcodes']
    if (subdirectory.value !== null) {
        let subdirectoryPath = subdirectory.value
        if (subdirectoryPath.startsWith('/')) subdirectoryPath = subdirectoryPath.substring(1)

        baseArray.push(subdirectoryPath)
    }
    baseArray.push(escapePath(relativePath))
    const baseUrl = baseArray.join('/')

    return `${baseUrl}?timestamp=${fileTimestamp.value}`
}

const smallThumbnail = computed(() =>
    thumbnails.value?.find((thumbnail) => thumbnail.width >= thumbnailSmallMin && thumbnail.width <= thumbnailSmallMax && thumbnail.height >= thumbnailSmallMin && thumbnail.height <= thumbnailSmallMax)
)

const smallThumbnailUrl = computed(() => {
    if (smallThumbnail.value === undefined || !('relative_path' in smallThumbnail.value)) return null

    return buildUrl(smallThumbnail.value.relative_path)
})

const bigThumbnail = computed(() => thumbnails.value?.find((thumbnail) => thumbnail.width >= thumbnailBigMin))

const bigThumbnailUrl = computed(() => {
    if (bigThumbnail.value === undefined || !('relative_path' in bigThumbnail.value)) return null

    return buildUrl(bigThumbnail.value.relative_path)
})
</script>
