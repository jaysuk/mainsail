<template>
    <v-snackbar v-if="show" :timeout="-1" location="bottom right">
        <span v-if="maxNumber > 1" class="mr-1">({{ currentNumber }}/{{ maxNumber }})</span>
        <strong>{{ t('Editor.Uploading') + ' ' + filename }}</strong>
        <br />
        {{ percent }} % @ {{ speed }}/s
        <br />
        <v-progress-linear class="mt-2" :model-value="percent" />
        <template #actions>
            <v-btn color="red" variant="text" style="min-width: auto" @click="cancelUpload">
                <v-icon>{{ mdiClose }}</v-icon>
            </v-btn>
        </template>
    </v-snackbar>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiClose } from '@mdi/js'
import { formatFilesize } from '@/plugins/helpers'
import { useFilesStore } from '@/store/files'
import { useSocketStore } from '@/store/socket'

const { t } = useI18n()
const filesStore = useFilesStore()
const socketStore = useSocketStore()

const show = computed(() => filesStore.upload.show ?? false)
const cancelTokenSource = computed(() => filesStore.upload.cancelTokenSource)
const filename = computed(() => filesStore.upload.filename ?? '')
const currentNumber = computed(() => filesStore.upload.currentNumber ?? 0)
const maxNumber = computed(() => filesStore.upload.maxNumber ?? 0)
const speed = computed(() => formatFilesize(Math.round(filesStore.upload.speed ?? 0)))
const percent = computed(() => Math.round(filesStore.upload.percent ?? 0))

function cancelUpload() {
    cancelTokenSource.value?.cancel()
    filesStore.uploadSetShow(false)
    socketStore.removeLoading('gcodeUpload')
    socketStore.removeLoading('configFileUpload')
}

watch(show, (newVal) => {
    const body = document.getElementsByTagName('body')[0]

    if (newVal) body.classList.add('fullscreenUpload--active')
    else body.classList.remove('fullscreenUpload--active')
})
</script>
