<template>
    <tr v-longpress:600="showContextMenuAction" class="file-list-cursor user-select-none" draggable="true" @click="clickOnRow" @contextmenu="showContextMenuAction($event)" @dragstart="onDragStart" @drag="onDrag">
        <td class="file-list__select-td pr-0">
            <v-checkbox-btn :model-value="isSelected" class="pa-0 mr-0" @click.stop="select(!isSelected)" />
        </td>
        <td class="px-0 text-center" style="width: 32px">
            <gcodefiles-thumbnail :item="item" />
        </td>
        <td class=" ">{{ item.filename }}</td>
        <td class="text-right text-no-wrap">
            <v-tooltip v-if="item.last_status" location="top">
                <template #activator="{ props: activatorProps }">
                    <span v-bind="activatorProps">
                        <span v-if="item.count_printed > 0" :class="`file-list__count_printed ${printStatusTextColor}`">
                            {{ item.count_printed }}
                        </span>
                        <v-icon size="small" :color="printStatusIconColor">{{ printStatusIcon }}</v-icon>
                    </span>
                </template>
                <span>{{ item.last_status.replace(/_/g, ' ') }}</span>
            </v-tooltip>
        </td>
        <template v-for="col in tableColumns" :key="col.value">
            <gcodefiles-panel-table-row-file-metadata-slicer v-if="col.value === 'slicer'" :item="item" />
            <gcodefiles-panel-table-row-file-metadata-filaments v-else-if="col.value === 'filaments'" :item="item" />
            <gcodefiles-panel-table-row-file-metadata-filament-strings v-else-if="['filament_name', 'filament_type'].includes(col.value)" :item="item" :column="col.value" />
            <gcodefiles-panel-table-row-file-metadata v-else :col="col" :item="item" />
        </template>
        <v-menu v-model="showContextMenu" :target="[showContextMenuX, showContextMenuY]">
            <v-list>
                <v-list-item v-if="isGcodeFile" :disabled="!klipperReadyForGui || ['error', 'printing', 'paused'].includes(printer_state)" @click="showStartPrintDialog = true">
                    <v-icon class="mr-1">{{ mdiPlay }}</v-icon>
                    {{ t('Files.PrintStart') }}
                </v-list-item>
                <v-list-item v-if="moonrakerComponents.includes('job_queue')" :disabled="!isGcodeFile" @click="addToQueue">
                    <v-icon class="mr-1">{{ mdiPlaylistPlus }}</v-icon>
                    {{ t('Files.AddToQueue') }}
                </v-list-item>
                <v-list-item v-if="moonrakerComponents.includes('job_queue')" :disabled="!isGcodeFile" @click="showAddBatchToQueueDialog = true">
                    <v-icon class="mr-1">{{ mdiPlaylistPlus }}</v-icon>
                    {{ t('Files.AddBatchToQueue') }}
                </v-list-item>
                <v-list-item v-if="item.preheat_gcode !== null" :disabled="['error', 'printing', 'paused'].includes(printer_state)" @click="doSend(item.preheat_gcode)">
                    <v-icon class="mr-1">{{ mdiFire }}</v-icon>
                    {{ t('Files.Preheat') }}
                </v-list-item>
                <v-list-item :disabled="!isGcodeFile" @click="view3D">
                    <v-icon class="mr-1">{{ mdiVideo3d }}</v-icon>
                    {{ t('Files.View3D') }}
                </v-list-item>
                <v-list-item :disabled="!isGcodeFile" @click="scanMeta">
                    <v-icon class="mr-1">{{ mdiMagnify }}</v-icon>
                    {{ t('Files.ScanMeta') }}
                </v-list-item>
                <v-list-item @click="downloadFile">
                    <v-icon class="mr-1">{{ mdiCloudDownload }}</v-icon>
                    {{ t('Files.Download') }}
                </v-list-item>
                <v-list-item @click="editFile">
                    <v-icon class="mr-1">{{ mdiFileDocumentEditOutline }}</v-icon>
                    {{ t('Files.EditFile') }}
                </v-list-item>
                <v-list-item @click="showRenameFileDialog = true">
                    <v-icon class="mr-1">{{ mdiRenameBox }}</v-icon>
                    {{ t('Files.Rename') }}
                </v-list-item>
                <v-list-item @click="showDuplicateFileDialog = true">
                    <v-icon class="mr-1">{{ mdiContentCopy }}</v-icon>
                    {{ t('Files.Duplicate') }}
                </v-list-item>
                <v-list-item class="text-red" @click="showDeleteFileDialog = true">
                    <v-icon class="mr-1" color="error">{{ mdiDelete }}</v-icon>
                    {{ t('Files.Delete') }}
                </v-list-item>
            </v-list>
        </v-menu>
        <start-print-dialog v-model="showStartPrintDialog" :file="item" :current-path="currentPath" />
        <add-batch-to-queue-dialog v-model="showAddBatchToQueueDialog" :filename="item.full_filename" />
        <gcodefiles-rename-file-dialog v-model="showRenameFileDialog" :item="item" />
        <gcodefiles-duplicate-file-dialog v-model="showDuplicateFileDialog" :item="item" />
        <confirmation-dialog v-model="showDeleteFileDialog" :title="t('Files.Delete')" :text="t('Files.DeleteSingleFileQuestion', { name: item.filename })" :action-button-text="t('Buttons.Delete')" @action="deleteFile" />
    </tr>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { LongpressEvent } from '@/directives/longpress'
import type { FileStateGcodefile } from '@/store/files/types'
import { validGcodeExtensions } from '@/store/variables'
import GcodefilesThumbnail from '@/components/panels/Gcodefiles/GcodefilesThumbnail.vue'
import { mdiCloudDownload, mdiContentCopy, mdiDelete, mdiFileDocumentEditOutline, mdiFire, mdiMagnify, mdiPlay, mdiPlaylistPlus, mdiRenameBox, mdiVideo3d } from '@mdi/js'
import { convertPrintStatusIcon, convertPrintStatusIconColor, escapePath } from '@/plugins/helpers'
import GcodefilesRenameFileDialog from '@/components/dialogs/GcodefilesRenameFileDialog.vue'
import GcodefilesDuplicateFileDialog from '@/components/dialogs/GcodefilesDuplicateFileDialog.vue'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import StartPrintDialog from '@/components/dialogs/StartPrintDialog.vue'
import AddBatchToQueueDialog from '@/components/dialogs/AddBatchToQueueDialog.vue'
import GcodefilesPanelTableRowFileMetadata from '@/components/panels/Gcodefiles/GcodefilesPanelTableRowFileMetadata.vue'
import GcodefilesPanelTableRowFileMetadataFilaments from '@/components/panels/Gcodefiles/GcodefilesPanelTableRowFileMetadataFilaments.vue'
import GcodefilesPanelTableRowFileMetadataSlicer from '@/components/panels/Gcodefiles/GcodefilesPanelTableRowFileMetadataSlicer.vue'
import GcodefilesPanelTableRowFileMetadataFilamentStrings from '@/components/panels/Gcodefiles/GcodefilesPanelTableRowFileMetadataFilamentStrings.vue'
import { CLOSE_CONTEXT_MENU, EventBus } from '@/plugins/eventBus'
import { useBase } from '@/composables/useBase'
import { useControl } from '@/composables/useControl'
import { useGcodefiles } from '@/composables/useGcodefiles'
import { useFilesStore } from '@/store/files'
import { useServerJobQueueStore } from '@/store/server/jobQueue'
import { useEditorStore } from '@/store/editor'
import { webSocketClient } from '@/plugins/webSocketClient'

const props = defineProps<{
    item: FileStateGcodefile
    isSelected: boolean
    select: (value: boolean) => void
}>()

const { t } = useI18n()
const router = useRouter()
const { apiUrl, klipperReadyForGui, moonrakerComponents, printer_state } = useBase()
const { doSend } = useControl()
const { currentPath, tableColumns } = useGcodefiles()

const showContextMenu = ref(false)
const showContextMenuX = ref(0)
const showContextMenuY = ref(0)

const showStartPrintDialog = ref(false)
const showAddBatchToQueueDialog = ref(false)
const showRenameFileDialog = ref(false)
const showDuplicateFileDialog = ref(false)
const showDeleteFileDialog = ref(false)

const isGcodeFile = computed(() => {
    const format = props.item.filename.slice(props.item.filename.lastIndexOf('.'))

    return validGcodeExtensions.includes(format)
})

const printStatusTextColor = computed(() => {
    switch (props.item.last_status) {
        case 'in_progress':
            return 'text-blue'
        case 'completed':
            return 'text-green'
        case 'cancelled':
            return 'text-red'

        default:
            return 'text-orange'
    }
})

const printStatusIcon = computed(() => convertPrintStatusIcon(props.item.last_status ?? ''))

const printStatusIconColor = computed(() => convertPrintStatusIconColor(props.item.last_status ?? ''))

function showContextMenuAction(e: MouseEvent | LongpressEvent) {
    e?.preventDefault()
    EventBus.$emit(CLOSE_CONTEXT_MENU)

    showContextMenuX.value = e?.clientX || e?.pageX || window.screenX / 2
    showContextMenuY.value = e?.clientY || e?.pageY || window.screenY / 2

    showContextMenu.value = true
}

function closeContextMenu() {
    showContextMenu.value = false
}

function clickOnRow() {
    if (!isGcodeFile.value || ['error', 'printing', 'paused'].includes(printer_state.value)) return

    showStartPrintDialog.value = true
}

function addToQueue() {
    let filename = [currentPath.value, props.item.filename].join('/')
    if (filename.startsWith('/')) filename = filename.slice(1)

    useServerJobQueueStore().addToQueue([filename])
}

function view3D() {
    router.push({
        path: '/viewer',
        query: { filename: 'gcodes' + currentPath.value + '/' + props.item.filename },
    })
}

function scanMeta() {
    useFilesStore().scanMetadata({
        filename: 'gcodes' + currentPath.value + '/' + props.item.filename,
    })
}

function downloadFile() {
    const filename = currentPath.value + '/' + props.item.filename
    const href = apiUrl.value + '/server/files/gcodes' + escapePath(filename)

    window.open(href)
}

function editFile() {
    useEditorStore().openFile({
        root: 'gcodes',
        path: currentPath.value,
        filename: props.item.filename,
        size: props.item.size ?? null,
        permissions: props.item.permissions,
    })
}

function deleteFile() {
    webSocketClient.emit('server.files.delete_file', { path: 'gcodes' + currentPath.value + '/' + props.item.filename }, { action: 'files/getDeleteFile' })
}

function onDragStart(e: DragEvent) {
    if (e.dataTransfer === null) return

    e.dataTransfer.setData('filename', props.item.filename)
    e.dataTransfer.effectAllowed = 'move'
}

function onDrag(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
}

onMounted(() => {
    EventBus.$on(CLOSE_CONTEXT_MENU, closeContextMenu)
})

onBeforeUnmount(() => {
    EventBus.$off(CLOSE_CONTEXT_MENU, closeContextMenu)
})
</script>

<style scoped>
.file-list__count_printed {
    position: relative;
    top: 1px;
}
</style>
