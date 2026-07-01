<template>
    <tr :class="trClasses" @click="goBackAction" @dragenter.prevent="isHover = true" @dragleave.prevent="isHover = false" @drop="onDrop" @dragover="onDragOver">
        <td class="file-list__select-td pr-0">
            <v-checkbox-btn disabled class="pa-0 mr-0" />
        </td>
        <td class="px-0 text-center" style="width: 32px">
            <v-icon>{{ mdiFolderUpload }}</v-icon>
        </td>
        <td class=" " :colspan="filteredHeaders.length">..</td>
    </tr>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mdiFolderUpload } from '@mdi/js'
import { useGcodefiles } from '@/composables/useGcodefiles'
import { webSocketClient } from '@/plugins/webSocketClient'

const { currentPath, filteredHeaders } = useGcodefiles()

const isHover = ref(false)

const trClasses = computed(() => ({
    'file-list-cursor': true,
    'file-list-row-hover': isHover.value,
}))

function goBackAction() {
    currentPath.value = currentPath.value.substring(0, currentPath.value.lastIndexOf('/'))
}

function onDrop(e: DragEvent) {
    e.preventDefault()
    isHover.value = false

    const dragFilename = e.dataTransfer?.getData('filename')

    const source = [currentPath.value, dragFilename].join('/')
    const dest = [currentPath.value, '..', dragFilename].join('/')

    webSocketClient.emit(
        'server.files.move',
        {
            source: 'gcodes' + source,
            dest: 'gcodes' + dest,
        },
        { action: 'files/getMove' }
    )
}

// this function is important to disable the browser default function to activate the onDrop function
function onDragOver(e: DragEvent) {
    e.preventDefault()
}
</script>

<style scoped>
.file-list-row-hover {
    background-color: #43a04720;
}
</style>
