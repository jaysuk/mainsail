<template>
    <div>
        <panel :title="t('Machine.ConfigFilesPanel.ConfigFiles')" card-class="machine-configfiles-panel" :icon="mdiInformation" :collapsible="true">
            <v-card-text>
                <v-row>
                    <v-col class="col-12 col-lg pr-lg-0">
                        <v-select v-model="root" class="machine-configfiles-panel__root-select" :items="registeredDirectoriesSelectItems" :label="t('Machine.ConfigFilesPanel.Root')" variant="outlined" hide-details density="compact" @update:model-value="changeRoot" />
                    </v-col>
                    <v-col class="col col-lg-auto pl-lg-0 text-right">
                        <input ref="fileUpload" type="file" style="display: none" multiple @change="uploadFile" />
                        <v-btn v-for="button in filteredToolbarButtons" :key="button.loadingName ?? button.text" class="px-2 minwidth-0 ml-3" :color="button.color" :loading="button.loadingName !== null && loadings.includes(button.loadingName)" @click="button.click">
                            <v-tooltip location="top">
                                <template #activator="{ props: activatorProps }">
                                    <v-icon v-bind="activatorProps">{{ button.icon }}</v-icon>
                                </template>
                                <span>{{ button.text }}</span>
                            </v-tooltip>
                        </v-btn>
                        <v-menu location="bottom end" :title="t('Machine.ConfigFilesPanel.SetupCurrentList')">
                            <template #activator="{ props: activatorProps }">
                                <v-btn class="px-2 minwidth-0 ml-3" v-bind="activatorProps">
                                    <v-icon class="machine-configfiles-panel__settings-icon">{{ mdiCog }}</v-icon>
                                </v-btn>
                            </template>
                            <v-list>
                                <v-list-item class="minHeight36">
                                    <v-checkbox v-model="showHiddenFiles" class="mt-0" hide-details :label="t('Machine.ConfigFilesPanel.HiddenFiles')" />
                                </v-list-item>
                                <v-list-item class="minHeight36">
                                    <v-checkbox v-model="hideBackupFiles" class="mt-0" hide-details :label="t('Machine.ConfigFilesPanel.HideBackupFiles')" />
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </v-col>
                </v-row>
            </v-card-text>
            <v-card-text>
                <v-row>
                    <v-col class="col-12 py-2 d-flex align-center">
                        <span>
                            <b class="mr-1">{{ t('Machine.ConfigFilesPanel.CurrentPath') }}:</b>
                            <path-navigation :path="currentPath" :base-directory-label="`/${root}`" :on-segment-click="clickPathNavGoToDirectory" />
                        </span>
                        <v-spacer />
                        <template v-if="disk_usage !== null && !showMissingConfigRootWarning">
                            <v-tooltip location="top">
                                <template #activator="{ props: activatorProps }">
                                    <span v-bind="activatorProps">
                                        <b>{{ t('Machine.ConfigFilesPanel.FreeDisk') }}:</b>
                                        {{ formatFilesize(disk_usage.free) }}
                                    </span>
                                </template>
                                <span>
                                    {{ t('Machine.ConfigFilesPanel.Used') }}: {{ formatFilesize(disk_usage.used) }}
                                    <br />
                                    {{ t('Machine.ConfigFilesPanel.Free') }}: {{ formatFilesize(disk_usage.free) }}
                                    <br />
                                    {{ t('Machine.ConfigFilesPanel.Total') }}: {{ formatFilesize(disk_usage.total) }}
                                </span>
                            </v-tooltip>
                        </template>
                    </v-col>
                </v-row>
            </v-card-text>
            <v-divider />
            <v-data-table
                v-if="!showMissingConfigRootWarning"
                v-model="selectedFiles"
                v-model:page="currentPage"
                v-model:sort-by="vuetifySortBy"
                v-model:items-per-page="countPerPage"
                :items="files"
                class="files-table"
                :headers="headers"
                item-value="filename"
                return-object
                :mobile-breakpoint="0"
                show-select>
                <template #no-data>
                    <div class="text-center">{{ t('Machine.ConfigFilesPanel.Empty') }}</div>
                </template>

                <template v-if="currentPath !== ''" #body.prepend>
                    <tr
                        class="file-list-cursor"
                        @click="clickRowGoBack"
                        @dragover="dragOverFilelist($event, { isDirectory: true, filename: '..' })"
                        @dragleave="dragLeaveFilelist"
                        @drop.prevent.stop="dragDropFilelist($event, { isDirectory: true, filename: '..' })">
                        <td class="file-list__select-td pr-0">
                            <v-checkbox-btn disabled class="pa-0 mr-0" />
                        </td>
                        <td class="px-0 text-center" style="width: 32px">
                            <v-icon>{{ mdiFolderUpload }}</v-icon>
                        </td>
                        <td class=" " colspan="4">..</td>
                    </tr>
                </template>

                <template #item="{ index, item, isSelected, toggleSelect, internalItem }">
                    <tr
                        :key="`${index} ${item.filename}`"
                        v-longpress:600="{ handler: showContextMenu, args: [item] }"
                        class="file-list-cursor user-select-none"
                        :data-name="item.filename"
                        draggable="true"
                        @contextmenu="showContextMenu($event, item)"
                        @click="clickRow(item)"
                        @drag="dragFile($event, item)"
                        @dragend="dragendFile($event)"
                        @dragover="dragOverFilelist($event, item)"
                        @dragleave="dragLeaveFilelist"
                        @drop.prevent.stop="dragDropFilelist($event, item)">
                        <td class="file-list__select-td pr-0">
                            <v-checkbox-btn :model-value="isSelected(internalItem)" class="pa-0 mr-0" @click.stop="toggleSelect(internalItem)" />
                        </td>
                        <td class="px-0 text-center" style="width: 32px">
                            <v-icon v-if="item.isDirectory">{{ mdiFolder }}</v-icon>
                            <v-icon v-if="!item.isDirectory">{{ mdiFile }}</v-icon>
                        </td>
                        <td class=" ">{{ item.filename }}</td>
                        <td class="text-no-wrap text-right">
                            {{ item.isDirectory ? '--' : formatFilesize(item.size ?? 0) }}
                        </td>
                        <td class="text-right">{{ formatDateTime(item.modified.getTime()) }}</td>
                    </tr>
                </template>
            </v-data-table>
            <v-card-text v-else>
                <v-row>
                    <v-col class="col-12 col-lg pr-lg-0">
                        <v-alert density="compact" variant="text" type="warning" elevation="2" class="mx-auto mt-6" max-width="500" :icon="mdiLockOutline">
                            {{ t('Machine.ConfigFilesPanel.ConfigRootDirectoryDoesntExists') }}
                        </v-alert>
                    </v-col>
                </v-row>
            </v-card-text>
        </panel>
        <v-menu v-model="contextMenu.shown" :target="[contextMenu.x, contextMenu.y]">
            <v-list>
                <v-list-item v-if="!contextMenu.item.isDirectory" @click="clickRow(contextMenu.item, true)">
                    <v-icon class="mr-1">{{ mdiFileDocumentEditOutline }}</v-icon>
                    {{ contextMenu.item.permissions.includes('w') ? t('Machine.ConfigFilesPanel.EditFile') : t('Machine.ConfigFilesPanel.ShowFile') }}
                </v-list-item>
                <v-list-item v-if="!contextMenu.item.isDirectory" @click="downloadFile">
                    <v-icon class="mr-1">{{ mdiCloudDownload }}</v-icon>
                    {{ t('Machine.ConfigFilesPanel.Download') }}
                </v-list-item>
                <v-list-item v-if="!contextMenu.item.isDirectory && contextMenu.item.permissions.includes('w')" @click="renameFile(contextMenu.item)">
                    <v-icon class="mr-1">{{ mdiRenameBox }}</v-icon>
                    {{ t('Machine.ConfigFilesPanel.Rename') }}
                </v-list-item>
                <v-list-item v-if="!contextMenu.item.isDirectory" @click="duplicateFile(contextMenu.item)">
                    <v-icon class="mr-1">{{ mdiContentCopy }}</v-icon>
                    {{ t('Machine.ConfigFilesPanel.Duplicate') }}
                </v-list-item>
                <v-list-item v-if="contextMenu.item.isDirectory && contextMenu.item.permissions.includes('w')" @click="renameDirectory(contextMenu.item)">
                    <v-icon class="mr-1">{{ mdiRenameBox }}</v-icon>
                    {{ t('Machine.ConfigFilesPanel.Rename') }}
                </v-list-item>
                <v-list-item v-if="!contextMenu.item.isDirectory && contextMenu.item.permissions.includes('w')" class="text-red" @click="deleteDialog = true">
                    <v-icon class="mr-1" color="error">{{ mdiDelete }}</v-icon>
                    {{ t('Buttons.Delete') }}
                </v-list-item>
                <v-list-item v-if="contextMenu.item.isDirectory && contextMenu.item.permissions.includes('w')" class="text-red" @click="deleteDirectory(contextMenu.item)">
                    <v-icon class="mr-1" color="error">{{ mdiDelete }}</v-icon>
                    {{ t('Buttons.Delete') }}
                </v-list-item>
            </v-list>
        </v-menu>
        <v-dialog
            v-model="dialogImage.show"
            fullscreen
            class="fill-height"
            @keydown.esc="closeImageDialog">
            <panel :title="dialogImage.item.name ?? ''" card-class="maschine-configfiles-imageviewer-dialog" style="position: relative">
                <template #buttons>
                    <v-btn icon tile @click="closeImageDialog">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <div class="d-flex justify-center" style="max-height: calc(var(--app-height) - 64px); overflow: auto">
                    <img v-if="dialogImage.item.url" :src="dialogImage.item.url" style="max-height: 100%; width: auto; max-width: 100%; object-fit: contain" alt="image" />
                    <div v-else-if="dialogImage.item.svg" class="fill-width" v-html="dialogImage.item.svg" />
                </div>
            </panel>
        </v-dialog>
        <v-dialog v-model="dialogCreateFile.show" max-width="400">
            <panel :title="t('Machine.ConfigFilesPanel.CreateFile')" card-class="maschine-configfiles-create-file-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="dialogCreateFile.show = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-text-field ref="inputDialogCreateFileName" v-model="dialogCreateFile.name" :label="t('Machine.ConfigFilesPanel.Name')" required :rules="nameInputRules" @update:error="setIsInvalidName" @keyup.enter="createFileAction" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="dialogCreateFile.show = false">
                        {{ t('Buttons.Cancel') }}
                    </v-btn>
                    <v-btn :disabled="isInvalidName" color="primary" variant="text" @click="createFileAction">
                        {{ t('Machine.ConfigFilesPanel.Create') }}
                    </v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>
        <v-dialog v-model="dialogRenameFile.show" max-width="400">
            <panel :title="t('Machine.ConfigFilesPanel.RenameFile')" card-class="maschine-configfiles-rename-file-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="dialogRenameFile.show = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-text-field ref="inputDialogRenameFileName" v-model="dialogRenameFile.newName" :label="t('Machine.ConfigFilesPanel.Name')" required :rules="nameInputRules" @update:error="setIsInvalidName" @keyup.enter="renameFileAction" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="dialogRenameFile.show = false">
                        {{ t('Buttons.Cancel') }}
                    </v-btn>
                    <v-btn :disabled="isInvalidName" color="primary" variant="text" @click="renameFileAction">
                        {{ t('Machine.ConfigFilesPanel.Rename') }}
                    </v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>
        <v-dialog v-model="dialogDuplicateFile.show" max-width="400">
            <panel :title="t('Machine.ConfigFilesPanel.DuplicateFile')" card-class="maschine-configfiles-duplicate-file-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="dialogDuplicateFile.show = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-text-field
                        ref="inputDialogDuplicateFileName"
                        v-model="dialogDuplicateFile.newName"
                        :label="t('Machine.ConfigFilesPanel.Name')"
                        required
                        :rules="nameInputRules"
                        @update:error="setIsInvalidName"
                        @keyup.enter="duplicateFileAction" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="dialogDuplicateFile.show = false">
                        {{ t('Buttons.Cancel') }}
                    </v-btn>
                    <v-btn :disabled="isInvalidName" color="primary" variant="text" @click="duplicateFileAction">
                        {{ t('Machine.ConfigFilesPanel.Duplicate') }}
                    </v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>
        <v-dialog v-model="dialogCreateDirectory.show" max-width="400">
            <panel :title="t('Machine.ConfigFilesPanel.CreateDirectory')" card-class="maschine-configfiles-create-directory-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="dialogCreateDirectory.show = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-text-field
                        ref="inputDialogCreateDirectoryName"
                        v-model="dialogCreateDirectory.name"
                        :label="t('Machine.ConfigFilesPanel.Name')"
                        required
                        :rules="nameInputRules"
                        @update:error="setIsInvalidName"
                        @keyup.enter="createDirectoryAction" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="dialogCreateDirectory.show = false">
                        {{ t('Buttons.Cancel') }}
                    </v-btn>
                    <v-btn :disabled="isInvalidName" color="primary" variant="text" @click="createDirectoryAction">
                        {{ t('Machine.ConfigFilesPanel.Create') }}
                    </v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>
        <v-dialog v-model="dialogRenameDirectory.show" max-width="400">
            <panel :title="t('Machine.ConfigFilesPanel.RenameDirectory')" card-class="maschine-configfiles-rename-directory-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="dialogRenameDirectory.show = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-text-field
                        ref="inputDialogRenameDirectoryName"
                        v-model="dialogRenameDirectory.newName"
                        :label="t('Machine.ConfigFilesPanel.Name')"
                        required
                        :rules="nameInputRules"
                        @update:error="setIsInvalidName"
                        @keyup.enter="renameDirectoryAction" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="dialogRenameDirectory.show = false">
                        {{ t('Buttons.Cancel') }}
                    </v-btn>
                    <v-btn :disabled="isInvalidName" color="primary" variant="text" @click="renameDirectoryAction">
                        {{ t('Machine.ConfigFilesPanel.Rename') }}
                    </v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>
        <confirmation-dialog
            v-model="dialogDeleteDirectory.show"
            :title="t('Machine.ConfigFilesPanel.DeleteDirectory')"
            :text="t('Machine.ConfigFilesPanel.DeleteDirectoryQuestion', { name: dialogDeleteDirectory.item.filename })"
            :action-button-text="t('Buttons.Delete')"
            @action="deleteDirectoryAction" />
        <confirmation-dialog
            v-model="deleteDialog"
            :title="t('Buttons.Delete')"
            :text="t('Machine.ConfigFilesPanel.DeleteSingleFileQuestion', { name: contextMenu.item.filename })"
            :action-button-text="t('Buttons.Delete')"
            @action="removeFile" />
        <confirmation-dialog v-model="deleteSelectedDialog" :title="t('Buttons.Delete')" :text="deleteSelectedDialogText" :action-button-text="t('Buttons.Delete')" @action="deleteSelectedFiles" />

        <v-snackbar v-model="uploadSnackbar.status" :timeout="-1" location="bottom end">
            <span v-if="uploadSnackbar.max > 1" class="mr-1"> ({{ uploadSnackbar.number }}/{{ uploadSnackbar.max }}) </span>
            <strong>{{ t('Machine.ConfigFilesPanel.Uploading') }} {{ uploadSnackbar.filename }}</strong>
            <br />
            {{ Math.round(uploadSnackbar.percent) }} % @ {{ formatFilesize(Math.round(uploadSnackbar.speed)) }}/s
            <br />
            <v-progress-linear class="mt-2" :model-value="uploadSnackbar.percent" />
            <template #actions>
                <v-btn color="red" variant="text" style="min-width: auto" @click="cancelUpload">
                    <v-icon class="0">{{ mdiClose }}</v-icon>
                </v-btn>
            </template>
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toast-notification'
import type { DataTableSortItem } from 'vuetify'
import { escapePath, formatFilesize, generateTimestamp, sortFiles } from '@/plugins/helpers'
import type { FileStateFile } from '@/store/files/types'
import axios from 'axios'
import type { CancelTokenSource } from 'axios'
import Panel from '@/components/ui/Panel.vue'
import PathNavigation from '@/components/ui/PathNavigation.vue'
import { hiddenRootDirectories } from '@/store/variables'
import { mdiFilePlus, mdiFileUpload, mdiFolderPlus, mdiInformation, mdiRefresh, mdiClose, mdiCog, mdiFolder, mdiFolderUpload, mdiFile, mdiFileDocumentEditOutline, mdiCloudDownload, mdiRenameBox, mdiDelete, mdiCloseThick, mdiLockOutline, mdiContentCopy } from '@mdi/js'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import type { FocusableRef } from '@/types/vuetify'
import type { LongpressEvent } from '@/directives/longpress'
import { useBase } from '@/composables/useBase'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { useFilesStore } from '@/store/files'
import { useGuiStore } from '@/store/gui'
import { useServerStore } from '@/store/server'
import { useSocketStore } from '@/store/socket'
import { useEditorStore } from '@/store/editor'
import { webSocketClient } from '@/plugins/webSocketClient'

interface dialogImageObject {
    show: boolean
    item: {
        name: string | null
        url: string | null
        svg: string | null
    }
}

interface dialogRenameObject {
    show: boolean
    newName: string
    item: FileStateFile
}

interface dialogDeleteObject {
    show: boolean
    item: FileStateFile
}

interface uploadSnackbar {
    status: boolean
    filename: string
    percent: number
    speed: number
    total: number
    number: number
    max: number
    cancelTokenSource: CancelTokenSource | null
}

const emptyFile = (): FileStateFile => ({
    isDirectory: false,
    filename: '',
    permissions: '',
    modified: new Date(),
})

const { t } = useI18n()
const { apiUrl, loadings, formatDateTime } = useBase()
const { machineButtonCol } = useMainsailTheme()
const filesStore = useFilesStore()
const guiStore = useGuiStore()

const inputDialogCreateFileName = ref<FocusableRef | undefined>()
const inputDialogRenameFileName = ref<FocusableRef | undefined>()
const inputDialogDuplicateFileName = ref<FocusableRef | undefined>()
const inputDialogCreateDirectoryName = ref<FocusableRef | undefined>()
const inputDialogRenameDirectoryName = ref<FocusableRef | undefined>()
const fileUpload = ref<HTMLInputElement | undefined>()

const currentPage = ref(1)

const contextMenu = ref({
    shown: false,
    isDirectory: false,
    x: 0,
    y: 0,
    item: emptyFile(),
})

const dialogImage = ref<dialogImageObject>({
    show: false,
    item: {
        name: null,
        url: null,
        svg: null,
    },
})

function closeImageDialog() {
    dialogImage.value.show = false
    dialogImage.value.item.url = null
    dialogImage.value.item.svg = null
}

const dialogCreateFile = ref({
    show: false,
    name: '',
})

const dialogRenameFile = ref<dialogRenameObject>({
    show: false,
    newName: '',
    item: emptyFile(),
})

const dialogDuplicateFile = ref<dialogRenameObject>({
    show: false,
    newName: '',
    item: emptyFile(),
})

const dialogCreateDirectory = ref({
    show: false,
    name: '',
})

const dialogRenameDirectory = ref<dialogRenameObject>({
    show: false,
    newName: '',
    item: emptyFile(),
})

const dialogDeleteDirectory = ref<dialogDeleteObject>({
    show: false,
    item: emptyFile(),
})

const uploadSnackbar = ref<uploadSnackbar>({
    status: false,
    filename: '',
    percent: 0,
    speed: 0,
    total: 0,
    number: 0,
    max: 0,
    cancelTokenSource: null,
})

const draggingFile = ref<{ item: FileStateFile }>({
    item: emptyFile(),
})

const deleteDialog = ref(false)
const deleteSelectedDialog = ref(false)

const isInvalidName = ref(true)
const nameInputRules = [(value: string) => !!value || t('Files.InvalidNameEmpty'), (value: string) => !existsFilename(value) || t('Files.InvalidNameAlreadyExists')]

function existsFilename(name: string) {
    return files.value.findIndex((file) => file.filename === name) >= 0
}

const blockFileUpload = computed<boolean>({
    get: () => guiStore.view.blockFileUpload ?? false,
    set: (newVal) => guiStore.saveSetting({ name: 'view.blockFileUpload', value: newVal }),
})

const selectedFiles = computed<FileStateFile[]>({
    get: () => guiStore.view.configfiles.selectedFiles ?? [],
    set: (newVal) => guiStore.saveSetting({ name: 'view.configfiles.selectedFiles', value: newVal }),
})

const toolbarButtons = computed(() => [
    {
        text: t('Machine.ConfigFilesPanel.Download'),
        color: 'primary',
        icon: mdiCloudDownload,
        loadingName: 'configDownloadZip',
        onlyWriteable: false,
        condition: selectedFiles.value.length > 0,
        click: () => {
            downloadSelectedFiles()
        },
    },
    {
        text: t('Buttons.Delete'),
        color: 'error',
        icon: mdiDelete,
        loadingName: null,
        onlyWriteable: true,
        condition: selectedFiles.value.length > 0,
        click: () => {
            deleteSelectedDialog.value = true
        },
    },
    {
        text: t('Machine.ConfigFilesPanel.UploadFile'),
        color: machineButtonCol.value,
        icon: mdiFileUpload,
        loadingName: null,
        onlyWriteable: true,
        condition: true,
        click: uploadFileButton,
    },
    {
        text: t('Machine.ConfigFilesPanel.CreateFile'),
        color: machineButtonCol.value,
        icon: mdiFilePlus,
        loadingName: null,
        onlyWriteable: true,
        condition: true,
        click: createFile,
    },
    {
        text: t('Machine.ConfigFilesPanel.CreateDirectory'),
        color: machineButtonCol.value,
        icon: mdiFolderPlus,
        loadingName: null,
        onlyWriteable: true,
        condition: true,
        click: createDirectory,
    },
    {
        text: t('Machine.ConfigFilesPanel.RefreshDirectory'),
        color: machineButtonCol.value,
        icon: mdiRefresh,
        loadingName: null,
        onlyWriteable: false,
        condition: true,
        click: refreshFileList,
    },
]).value.filter((rule) => rule.condition)

const filteredToolbarButtons = computed(() =>
    toolbarButtons.filter((button) => {
        return (directoryPermissions.value.includes('w') && button.onlyWriteable) || !button.onlyWriteable
    })
)

const absolutePath = computed(() => {
    let path = '/' + root.value
    if (currentPath.value) path += currentPath.value

    return path
})

const directory = computed(() => filesStore.getDirectory(absolutePath.value))

const disk_usage = computed(() => directory.value?.disk_usage ?? { used: 0, free: 0, total: 0 })

const directoryPermissions = computed(() => directory.value?.permissions ?? 'r')

const files = computed(() => {
    let output = [...(directory.value?.childrens ?? [])]

    if (!showHiddenFiles.value) {
        output = output.filter((file) => file.filename.slice(0, 1) !== '.')
    }

    if (hideBackupFiles.value) {
        const klipperBackupFileMatcher = /^printer-\d{8}_\d{6}\.cfg$/
        const crowsnestBackupFileMatcher = /^crowsnest\.conf\.\d{4}-\d{2}-\d{2}-\d{4}$/

        output = output.filter((file) => !file.filename.match(klipperBackupFileMatcher) && !file.filename.match(crowsnestBackupFileMatcher) && !file.filename.endsWith('.bkp'))
    }

    return sortFiles(output, [sortBy.value], [sortDesc.value])
})

// Vuetify 4's per-column value functions double as the sort key -- prefixing
// with the directory flag reproduces the old customSort's "directories
// always first" behaviour without a whole-array custom comparator.
const headers = computed(() => [
    { title: '', key: 'select', value: '', sortable: false },
    { title: t('Machine.ConfigFilesPanel.Name'), key: 'filename', value: (item: FileStateFile) => `${item.isDirectory ? '0' : '1'}_${item.filename.toLowerCase()}` },
    { title: t('Machine.ConfigFilesPanel.Filesize'), key: 'size', align: 'end' as const, value: (item: FileStateFile) => `${item.isDirectory ? '0' : '1'}_${String(item.size ?? 0).padStart(20, '0')}` },
    {
        title: t('Machine.ConfigFilesPanel.LastModified'),
        key: 'modified',
        align: 'end' as const,
        value: (item: FileStateFile) => `${item.isDirectory ? '0' : '1'}_${String(item.modified?.getTime() ?? 0).padStart(20, '0')}`,
    },
])

const countPerPage = computed<number>({
    get: () => guiStore.view.configfiles.countPerPage,
    set: (newVal) => guiStore.saveSetting({ name: 'view.configfiles.countPerPage', value: newVal }),
})

const showHiddenFiles = computed<boolean>({
    get: () => guiStore.view.configfiles.showHiddenFiles,
    set: (newVal) => guiStore.saveSetting({ name: 'view.configfiles.showHiddenFiles', value: newVal }),
})

const hideBackupFiles = computed<boolean>({
    get: () => guiStore.view.configfiles.hideBackupFiles,
    set: (newVal) => guiStore.saveSetting({ name: 'view.configfiles.hideBackupFiles', value: newVal }),
})

const sortBy = computed<string>({
    get: () => guiStore.view.configfiles.sortBy ?? 'filename',
    set: (newVal) => guiStore.saveSetting({ name: 'view.configfiles.sortBy', value: newVal ?? 'filename' }),
})

const sortDesc = computed<boolean>({
    get: () => guiStore.view.configfiles.sortDesc ?? false,
    set: (newVal) => guiStore.saveSetting({ name: 'view.configfiles.sortDesc', value: newVal ?? false }),
})

const vuetifySortBy = computed<DataTableSortItem[]>({
    get: () => [{ key: sortBy.value, order: sortDesc.value ? ('desc' as const) : ('asc' as const) }],
    set: (newVal: DataTableSortItem[]) => {
        if (!newVal.length) return

        sortBy.value = newVal[0].key
        sortDesc.value = newVal[0].order === 'desc'
    },
})

const registeredDirectories = computed<string[]>(() => useServerStore().registered_directories ?? [])

const existConfigRoot = computed(() => registeredDirectories.value.findIndex((root: string) => root === 'config') !== -1)

const showMissingConfigRootWarning = computed(() => absolutePath.value.startsWith('/config') && !absolutePath.value.startsWith('/config_example') && !existConfigRoot.value)

const registeredDirectoriesSelectItems = computed(() => {
    const items = registeredDirectories.value.filter((dir: string) => !hiddenRootDirectories.includes(dir)).sort()
    if (!existConfigRoot.value) items.push('config')

    return items
})

const root = computed<string>({
    get: () => guiStore.view.configfiles.rootPath,
    set: (newVal) => guiStore.saveSetting({ name: 'view.configfiles.rootPath', value: newVal }),
})

const currentPath = computed<string>({
    get: () => guiStore.view.configfiles.currentPath,
    set: (newVal) => {
        selectedFiles.value = []

        guiStore.saveSetting({ name: 'view.configfiles.currentPath', value: newVal })
    },
})

const deleteSelectedDialogText = computed<string>(() => {
    if (selectedFiles.value.length === 1) {
        return t('Machine.ConfigFilesPanel.DeleteSingleFileQuestion', { name: selectedFiles.value[0].filename })
    }

    return t('Machine.ConfigFilesPanel.DeleteSelectedQuestion', { count: selectedFiles.value.length })
})

function refreshFileList() {
    webSocketClient.emit('server.files.get_directory', { path: absolutePath.value.substring(1) }, { action: 'files/getDirectory' })
}

function changeRoot() {
    currentPath.value = ''
}

function clickRow(item: FileStateFile, force = false) {
    if (contextMenu.value.shown && !force) return
    if (force) contextMenu.value.shown = false

    if (item.isDirectory) {
        currentPath.value += '/' + item.filename
        currentPage.value = 1

        return
    }

    const extension = item.filename.split('.').pop()?.toLowerCase() ?? ''
    const url = `${apiUrl.value}/server/files${absolutePath.value}/${item.filename}?t=${Date.now()}`

    if (extension === 'svg') {
        fetch(url)
            .then((res) => res.text())
            .then((svg) => {
                dialogImage.value.show = true
                dialogImage.value.item.name = item.filename
                dialogImage.value.item.svg = svg
            })

        return
    }

    if (['png', 'jpeg', 'jpg', 'gif', 'bmp', 'tif'].includes(extension)) {
        dialogImage.value.show = true
        dialogImage.value.item.name = item.filename
        dialogImage.value.item.url = url
        return
    }

    useEditorStore().openFile({
        root: root.value,
        path: currentPath.value,
        filename: item.filename,
        size: item.size ?? null,
        permissions: item.permissions,
    })
}

function clickRowGoBack() {
    currentPath.value = currentPath.value.slice(0, currentPath.value.lastIndexOf('/'))
}

function clickPathNavGoToDirectory(segment: { location: string }) {
    currentPath.value = segment.location
}

function setIsInvalidName(bool: boolean) {
    isInvalidName.value = bool
}

function showContextMenu(e: MouseEvent | LongpressEvent, item: FileStateFile) {
    e?.preventDefault()
    contextMenu.value.x = e?.clientX || e?.pageX || window.screenX / 2
    contextMenu.value.y = e?.clientY || e?.pageY || window.screenY / 2
    contextMenu.value.item = item
    contextMenu.value.shown = true
}

function startDownloadFile(filename: string) {
    const filepath = `${absolutePath.value}/${filename}`
    const href = `${apiUrl.value}/server/files${escapePath(filepath)}`
    window.open(href)
}

function downloadFile() {
    startDownloadFile(contextMenu.value.item.filename)
    contextMenu.value.shown = false
}

async function downloadSelectedFiles() {
    if (selectedFiles.value.length === 1) {
        startDownloadFile(selectedFiles.value[0].filename)
        selectedFiles.value = []
        return
    }

    const items: string[] = []

    const addElementToItems = async (absolutPath: string, directory: FileStateFile[]) => {
        for (const file of directory) {
            const filePath = `${absolutPath}/${file.filename}`

            if (file.isDirectory && file.childrens) {
                await addElementToItems(filePath, file.childrens)

                continue
            }

            items.push(filePath)
        }
    }

    await addElementToItems(absolutePath.value, selectedFiles.value)

    webSocketClient.emit('server.files.zip', { items, dest: `config/${root.value}-${generateTimestamp()}.zip` }, { action: 'files/downloadZip', loading: 'configDownloadZip' })

    selectedFiles.value = []
}

function createDirectory() {
    dialogCreateDirectory.value.name = ''
    dialogCreateDirectory.value.show = true

    setTimeout(() => {
        inputDialogCreateDirectoryName.value?.focus()
    }, 200)
}

function createDirectoryAction() {
    dialogCreateDirectory.value.show = false

    webSocketClient.emit('server.files.post_directory', { path: absolutePath.value.substring(1) + '/' + dialogCreateDirectory.value.name }, { action: 'files/getCreateDir' })
}

function renameDirectory(item: FileStateFile) {
    dialogRenameDirectory.value.item = item
    dialogRenameDirectory.value.newName = item.filename
    dialogRenameDirectory.value.show = true

    setTimeout(() => {
        inputDialogRenameDirectoryName.value?.focus()
    }, 200)
}

function renameDirectoryAction() {
    dialogRenameDirectory.value.show = false
    webSocketClient.emit(
        'server.files.move',
        {
            source: (absolutePath.value + '/' + dialogRenameDirectory.value.item.filename).slice(1),
            dest: (absolutePath.value + '/' + dialogRenameDirectory.value.newName).slice(1),
        },
        { action: 'files/getMove' }
    )
}

function deleteDirectory(item: FileStateFile) {
    dialogDeleteDirectory.value.item = item
    dialogDeleteDirectory.value.show = true
}

function deleteDirectoryAction() {
    webSocketClient.emit('server.files.delete_directory', { path: absolutePath.value + '/' + dialogDeleteDirectory.value.item.filename, force: true }, { action: 'files/getDeleteDir' })
}

function createFile() {
    dialogCreateFile.value.name = ''
    dialogCreateFile.value.show = true

    setTimeout(() => {
        inputDialogCreateFileName.value?.focus()
    }, 200)
}

function createFileAction() {
    const file = new File([''], dialogCreateFile.value.name)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('root', root.value)
    if (currentPath.value.length) formData.append('path', currentPath.value.slice(1))

    axios
        .post(apiUrl.value + '/server/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(() => {
            useToast().success(t('Files.SuccessfullyCreated', { filename: dialogCreateFile.value.name }))
            dialogCreateFile.value.show = false
            dialogCreateFile.value.name = ''
        })
        .catch(() => {
            window.console.error('Error create file: ' + dialogCreateFile.value.name)
        })
}

function renameFile(item: FileStateFile) {
    dialogRenameFile.value.item = item
    dialogRenameFile.value.newName = item.filename
    dialogRenameFile.value.show = true

    setTimeout(() => {
        inputDialogRenameFileName.value?.focus()
    }, 200)
}

function renameFileAction() {
    dialogRenameFile.value.show = false
    webSocketClient.emit(
        'server.files.move',
        {
            source: (absolutePath.value + '/' + dialogRenameFile.value.item.filename).slice(1),
            dest: (absolutePath.value + '/' + dialogRenameFile.value.newName).slice(1),
        },
        { action: 'files/getMove' }
    )
}

function duplicateFile(item: FileStateFile) {
    dialogDuplicateFile.value.item = item
    dialogDuplicateFile.value.newName = item.filename
    dialogDuplicateFile.value.show = true

    setTimeout(() => {
        inputDialogDuplicateFileName.value?.focus()
    }, 200)
}

function duplicateFileAction() {
    dialogDuplicateFile.value.show = false
    webSocketClient.emit('server.files.copy', {
        source: (absolutePath.value + '/' + dialogDuplicateFile.value.item.filename).slice(1),
        dest: (absolutePath.value + '/' + dialogDuplicateFile.value.newName).slice(1),
    })
}

function removeFile() {
    webSocketClient.emit('server.files.delete_file', { path: absolutePath.value + '/' + contextMenu.value.item.filename }, { action: 'files/getDeleteFile' })
}

function deleteSelectedFiles() {
    selectedFiles.value.forEach((item: FileStateFile) => {
        if (item.isDirectory) {
            webSocketClient.emit('server.files.delete_directory', { path: absolutePath.value + '/' + item.filename, force: true }, { action: 'files/getDeleteDir' })
        } else {
            webSocketClient.emit('server.files.delete_file', { path: absolutePath.value + '/' + item.filename }, { action: 'files/getDeleteFile' })
        }
    })

    selectedFiles.value = []
}

function uploadFileButton() {
    fileUpload.value?.click()
}

async function uploadFile() {
    const files = [...(fileUpload.value?.files ?? [])]
    if (files.length === 0) return

    if (fileUpload.value) fileUpload.value.value = ''

    const socketStore = useSocketStore()
    socketStore.addLoading('configFileUpload')
    filesStore.uploadSetCurrentNumber(0)
    filesStore.uploadSetMaxNumber(files.length)

    for (const file of files) {
        filesStore.uploadIncrementCurrentNumber()
        const path = currentPath.value.slice(0, 1) === '/' ? currentPath.value.slice(1) : currentPath.value
        const result = await filesStore.uploadFile({
            file,
            path,
            root: 'config',
        })

        if (result !== false) useToast().success(t('Files.SuccessfullyUploaded', { filename: result }))
    }

    socketStore.removeLoading('configFileUpload')
}

function cancelUpload() {
    uploadSnackbar.value.cancelTokenSource?.cancel()
    uploadSnackbar.value.status = false
}

function dragFile(e: Event, item: FileStateFile) {
    e.preventDefault()
    blockFileUpload.value = true
    draggingFile.value.item = item
}

function dragendFile(e: Event) {
    e.preventDefault()
    blockFileUpload.value = false
    draggingFile.value.item = emptyFile()
}

function dragOverFilelist(e: DragEvent, row: Pick<FileStateFile, 'isDirectory' | 'filename'>) {
    if (!blockFileUpload.value) return
    e.preventDefault()

    const parentElement = (e.target as HTMLElement | null)?.parentElement
    if (row.isDirectory && parentElement) parentElement.style.backgroundColor = '#43A04720'
}

function dragLeaveFilelist(e: DragEvent) {
    if (!blockFileUpload.value) return
    e.preventDefault()
    e.stopPropagation()

    const parentElement = (e.target as HTMLElement | null)?.parentElement
    if (parentElement) parentElement.style.backgroundColor = 'transparent'
}

async function dragDropFilelist(e: DragEvent, row: Pick<FileStateFile, 'isDirectory' | 'filename'>) {
    if (!blockFileUpload.value) return
    e.preventDefault()
    const parentElement = (e.target as HTMLElement | null)?.parentElement
    if (parentElement) parentElement.style.backgroundColor = 'transparent'

    let dest = absolutePath.value + '/' + row.filename + '/' + draggingFile.value.item.filename
    if (row.filename === '..') {
        dest = absolutePath.value.slice(1, absolutePath.value.lastIndexOf('/') + 1) + draggingFile.value.item.filename
    }

    webSocketClient.emit(
        'server.files.move',
        {
            source: absolutePath.value.slice(1) + '/' + draggingFile.value.item.filename,
            dest: dest,
        },
        { action: 'files/getMove' }
    )
}
</script>
