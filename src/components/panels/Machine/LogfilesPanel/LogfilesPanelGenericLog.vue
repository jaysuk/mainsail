<template>
    <v-col v-if="exists" :class="classes">
        <v-btn :href="href" block class="text-primary" @click="downloadLog">
            <v-icon class="mr-2">{{ mdiDownload }}</v-icon>
            {{ name }}
        </v-btn>
    </v-col>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiDownload } from '@mdi/js'
import type { FileStateFile } from '@/store/files/types'
import { useBase } from '@/composables/useBase'
import { useFilesStore } from '@/store/files'

const props = defineProps<{ name: string }>()

const { apiUrl, klipperState } = useBase()
const filesStore = useFilesStore()

const logfiles = computed(() => filesStore.getDirectory('logs')?.childrens ?? [])

const filename = computed(() => props.name + '.log')

const exists = computed<boolean>(() => {
    if (['klippy', 'moonraker'].includes(props.name)) return true

    return logfiles.value.findIndex((log: FileStateFile) => log.filename === filename.value) !== -1
})

const href = computed(() => {
    let path = '/server/files/logs/'
    if (['klippy', 'moonraker'].includes(props.name)) path = '/server/files/'

    return apiUrl.value + path + filename.value
})

const classes = computed(() => {
    const output = ['col-12', 'pt-0']

    if (klipperState.value !== 'ready') {
        output.push('col-md-6')
        output.push('mt-md-3')
    } else {
        output.push('col-md-12')
    }

    return output
})

function downloadLog(event: MouseEvent) {
    event.preventDefault()

    const target = event.target as HTMLElement | null
    const href = target?.closest('a')?.href ?? ''
    if (href) window.open(href)
}
</script>
