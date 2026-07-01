<template>
    <tr
        v-longpress:600="showContextMenuAction"
        :class="trClasses"
        draggable="true"
        @click="goToDirectory"
        @contextmenu="showContextMenuAction($event)"
        @dragenter.prevent="isHover = true"
        @dragleave.prevent="isHover = false"
        @drop="onDrop"
        @dragover="onDragOver"
        @dragstart="onDragStart"
        @drag="onDrag">
        <td class="file-list__select-td pr-0">
            <v-checkbox-btn :model-value="isSelected" class="pa-0 mr-0" @click.stop="select(!isSelected)" />
        </td>
        <td class="px-0 text-center" style="width: 32px">
            <v-icon>{{ mdiFolder }}</v-icon>
        </td>
        <td class=" " :colspan="tableColumns.length + 2">{{ item.filename }}</td>
        <v-menu v-model="showContextMenu" :target="[showContextMenuX, showContextMenuY]">
            <v-list>
                <v-list-item @click="showRenameDirectoryDialog = true">
                    <v-icon class="mr-1">{{ mdiRenameBox }}</v-icon>
                    {{ t('Files.Rename') }}
                </v-list-item>
                <v-list-item class="text-red" @click="showDeleteDirectoryDialog = true">
                    <v-icon class="mr-1" color="error">{{ mdiDelete }}</v-icon>
                    {{ t('Files.Delete') }}
                </v-list-item>
            </v-list>
        </v-menu>
        <gcodefiles-rename-directory-dialog v-model="showRenameDirectoryDialog" :item="item" />
        <confirmation-dialog v-model="showDeleteDirectoryDialog" :title="t('Files.DeleteDirectory')" :text="t('Files.DeleteDirectoryQuestion', { name: item.filename })" :action-button-text="t('Buttons.Delete')" @action="deleteDirectory" />
    </tr>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LongpressEvent } from '@/directives/longpress'
import type { FileStateGcodefile } from '@/store/files/types'
import { mdiDelete, mdiFolder, mdiRenameBox } from '@mdi/js'
import { CLOSE_CONTEXT_MENU, on, off, emit } from '@/plugins/mainsail'
import GcodefilesRenameDirectoryDialog from '@/components/dialogs/GcodefilesRenameDirectoryDialog.vue'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import { useGcodefiles } from '@/composables/useGcodefiles'
import { webSocketClient } from '@/plugins/webSocketClient'

const props = defineProps<{
    item: FileStateGcodefile
    isSelected: boolean
    select: (value: boolean) => void
}>()

const { t } = useI18n()
const { currentPath, tableColumns } = useGcodefiles()

const showContextMenu = ref(false)
const showContextMenuX = ref(0)
const showContextMenuY = ref(0)

const showRenameDirectoryDialog = ref(false)
const showDeleteDirectoryDialog = ref(false)

const isHover = ref(false)

const trClasses = computed(() => ({
    'file-list-cursor': true,
    'user-select-none': true,
    'file-list-row-hover': isHover.value,
}))

function showContextMenuAction(e: MouseEvent | LongpressEvent) {
    e?.preventDefault()
    emit(CLOSE_CONTEXT_MENU)

    showContextMenuX.value = e?.clientX || e?.pageX || window.screenX / 2
    showContextMenuY.value = e?.clientY || e?.pageY || window.screenY / 2

    showContextMenu.value = true
}

function closeContextMenu() {
    showContextMenu.value = false
}

function goToDirectory() {
    currentPath.value += '/' + props.item.filename
}

function deleteDirectory() {
    webSocketClient.emit('server.files.delete_directory', { path: 'gcodes' + currentPath.value + '/' + props.item.filename, force: true }, { action: 'files/getDeleteDir' })
}

function onDrop(e: DragEvent) {
    e.preventDefault()
    isHover.value = false

    const dragFilename = e.dataTransfer?.getData('filename')

    const source = [currentPath.value, dragFilename].join('/')
    const dest = [currentPath.value, props.item.filename, dragFilename].join('/')

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
    on(CLOSE_CONTEXT_MENU, closeContextMenu)
})

onBeforeUnmount(() => {
    off(CLOSE_CONTEXT_MENU, closeContextMenu)
})
</script>

<style scoped>
.file-list-row-hover {
    background-color: #43a04720;
}
</style>
