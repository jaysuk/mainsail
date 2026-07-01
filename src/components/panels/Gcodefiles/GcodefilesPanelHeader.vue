<template>
    <v-row>
        <v-col class="col-12 d-flex align-center">
            <v-text-field v-model="search" :append-inner-icon="mdiMagnify" :label="t('Files.Search')" single-line variant="outlined" clearable hide-details density="compact" class="max-width-300" />
            <v-spacer />
            <v-btn v-if="selectedFiles.length" :title="t('Files.Download')" color="primary" class="px-2 minwidth-0 ml-3" :loading="loadings.includes('gcodeDownloadZip')" @click="downloadSelectedFiles">
                <v-icon>{{ mdiCloudDownload }}</v-icon>
            </v-btn>
            <v-btn v-if="selectedFiles.length" :title="t('Files.Delete')" color="error" class="px-2 minwidth-0 ml-3" @click="showDeleteSelectedDialog = true">
                <v-icon>{{ mdiDelete }}</v-icon>
            </v-btn>
            <confirmation-dialog v-model="showDeleteSelectedDialog" :title="t('Files.Delete')" :text="deleteSelectedText" :action-button-text="t('Buttons.Delete')" @action="deleteSelectedFiles" />
            <input ref="fileUpload" type="file" :accept="gcodeInputFileAccept.join(', ')" class="d-none" multiple @change="uploadFile" />
            <v-btn :title="t('Files.UploadNewGcode')" class="text-primary px-2 minwidth-0 ml-3" :loading="loadings.includes('gcodeUpload')" @click="clickUploadButton">
                <v-icon>{{ mdiUpload }}</v-icon>
            </v-btn>
            <v-btn :title="t('Files.CreateNewDirectory')" class="px-2 minwidth-0 ml-3" @click="showCreateDirectoryDialog = true">
                <v-icon>{{ mdiFolderPlus }}</v-icon>
            </v-btn>
            <gcodefiles-create-directory-dialog v-model="showCreateDirectoryDialog" />
            <v-btn :title="t('Files.RefreshCurrentDirectory')" class="px-2 minwidth-0 ml-3" @click="refreshFileList">
                <v-icon>{{ mdiRefresh }}</v-icon>
            </v-btn>
            <gcodefiles-panel-header-settings />
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toast-notification'
import { mdiCloudDownload, mdiDelete, mdiFolderPlus, mdiMagnify, mdiRefresh, mdiUpload } from '@mdi/js'
import type { FileStateFile } from '@/store/files/types'
import { escapePath, generateTimestamp } from '@/plugins/helpers'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import GcodefilesCreateDirectoryDialog from '@/components/dialogs/GcodefilesCreateDirectoryDialog.vue'
import GcodefilesPanelHeaderSettings from '@/components/panels/Gcodefiles/GcodefilesPanelHeaderSettings.vue'
import { validGcodeExtensions } from '@/store/variables'
import { useBase } from '@/composables/useBase'
import { useGcodefiles } from '@/composables/useGcodefiles'
import { useFilesStore } from '@/store/files'
import { useSocketStore } from '@/store/socket'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { apiUrl, isIOS, loadings } = useBase()
const { search, currentPath, selectedFiles } = useGcodefiles()
const filesStore = useFilesStore()

const showCreateDirectoryDialog = ref(false)
const showDeleteSelectedDialog = ref(false)

const fileUpload = ref<HTMLInputElement | null>(null)

const gcodeInputFileAccept = computed(() => {
    if (isIOS.value) return []

    return validGcodeExtensions
})

const deleteSelectedText = computed<string>(() => {
    if (selectedFiles.value.length === 1) {
        return t('Files.DeleteSingleFileQuestion', { name: selectedFiles.value[0].filename })
    }

    return t('Files.DeleteSelectedQuestion', { count: selectedFiles.value.length })
})

function downloadSelectedFiles() {
    if (selectedFiles.value.length === 1) {
        const filepath = `${currentPath.value}/${selectedFiles.value[0].filename}`
        const href = `${apiUrl.value}/server/files/gcodes${escapePath(filepath)}`
        window.open(href)

        selectedFiles.value = []
        return
    }

    const items: string[] = []

    const addElementToItems = (absolutPath: string, directory: FileStateFile[]) => {
        for (const file of directory) {
            const filePath = `${absolutPath}/${escapePath(file.filename)}`

            if (file.isDirectory && file.childrens) {
                addElementToItems(filePath, file.childrens)

                continue
            }

            items.push(filePath)
        }
    }

    addElementToItems('gcodes/' + currentPath.value, selectedFiles.value)

    webSocketClient.emit('server.files.zip', { items, dest: `config/gcodes-${generateTimestamp()}.zip` }, { action: 'files/downloadZip', loading: 'gcodeDownloadZip' })

    selectedFiles.value = []
}

async function uploadFile() {
    if (fileUpload.value?.files === null || fileUpload.value?.files === undefined || fileUpload.value.files.length === 0) return

    const files = [...fileUpload.value.files]
    fileUpload.value.value = ''

    const socketStore = useSocketStore()
    socketStore.addLoading('gcodeUpload')
    filesStore.uploadSetCurrentNumber(0)
    filesStore.uploadSetMaxNumber(files.length)

    for (const file of files) {
        filesStore.uploadIncrementCurrentNumber()
        const path = currentPath.value.slice(0, 1) === '/' ? currentPath.value.slice(1) : currentPath.value
        const result = await filesStore.uploadFile({
            file,
            path,
            root: 'gcodes',
        })

        if (result !== false) useToast().success(t('Files.SuccessfullyUploaded', { filename: result }))
    }

    socketStore.removeLoading('gcodeUpload')
}

function clickUploadButton() {
    fileUpload.value?.click()
}

function refreshFileList() {
    webSocketClient.emit('server.files.get_directory', { path: 'gcodes' + currentPath.value }, { action: 'files/getDirectory' })
}

function deleteSelectedFiles(): void {
    selectedFiles.value.forEach((item) => {
        if (item.isDirectory) {
            webSocketClient.emit('server.files.delete_directory', { path: 'gcodes' + currentPath.value + '/' + item.filename, force: true }, { action: 'files/getDeleteDir' })

            return
        }

        webSocketClient.emit('server.files.delete_file', { path: 'gcodes' + currentPath.value + '/' + item.filename }, { action: 'files/getDeleteFile' })
    })

    selectedFiles.value = []
}
</script>

<style scoped>
.max-width-300 {
    max-width: 300px;
}
</style>
