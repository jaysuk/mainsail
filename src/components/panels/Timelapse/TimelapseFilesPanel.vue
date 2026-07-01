<template>
    <div>
        <panel :title="t('Timelapse.TimelapseFiles')" :icon="mdiFileDocumentMultipleOutline" card-class="timelapse-files-panel">
            <v-card-text>
                <v-row>
                    <v-col class="col-12 d-flex align-center">
                        <v-text-field
                            v-model="search"
                            :append-inner-icon="mdiMagnify"
                            :label="t('Timelapse.Search')"
                            single-line
                            variant="outlined"
                            clearable
                            hide-details
                            density="compact"
                            style="max-width: 300px" />
                        <v-spacer />
                        <v-btn v-if="selectedFiles.length" :title="t('Timelapse.Download')" color="primary" class="px-2 minwidth-0 ml-3" :loading="loadings.includes('timelapseDownloadZip')" @click="downloadSelectedFiles">
                            <v-icon>{{ mdiCloudDownload }}</v-icon>
                        </v-btn>
                        <v-btn v-if="selectedFiles.length" :title="t('Buttons.Delete')" color="error" class="px-2 minwidth-0 ml-3" @click="deleteSelectedDialog = true">
                            <v-icon>{{ mdiDelete }}</v-icon>
                        </v-btn>
                        <v-btn v-if="directoryPermissions.includes('w')" :title="t('Timelapse.CreateNewDirectory')" class="px-2 minwidth-0 ml-3" @click="createDirectory">
                            <v-icon>{{ mdiFolderPlus }}</v-icon>
                        </v-btn>
                        <v-btn :title="t('Timelapse.RefreshCurrentDirectory')" class="px-2 minwidth-0 ml-3" @click="refreshFileList">
                            <v-icon>{{ mdiRefresh }}</v-icon>
                        </v-btn>
                    </v-col>
                </v-row>
            </v-card-text>
            <v-card-text>
                <v-row>
                    <v-col class="col-12 py-2 d-flex align-center">
                        <span>
                            <b class="mr-1">{{ t('Timelapse.CurrentPath') }}:</b>
                            <path-navigation :path="currentPathForNavigation" :base-directory-label="`/${rootDirectory}`" :on-segment-click="clickPathNavGoToDirectory" />
                        </span>
                        <v-spacer />
                        <template v-if="disk_usage !== null">
                            <v-tooltip location="top">
                                <template #activator="{ props: activatorProps }">
                                    <span v-bind="activatorProps">
                                        <b>{{ t('Timelapse.FreeDisk') }}:</b>
                                        {{ formatFilesize(disk_usage.free) }}
                                    </span>
                                </template>
                                <span>
                                    {{ t('Timelapse.Used') }}: {{ formatFilesize(disk_usage.used) }}
                                    <br />
                                    {{ t('Timelapse.Free') }}: {{ formatFilesize(disk_usage.free) }}
                                    <br />
                                    {{ t('Timelapse.Total') }}: {{ formatFilesize(disk_usage.total) }}
                                </span>
                            </v-tooltip>
                        </template>
                    </v-col>
                </v-row>
            </v-card-text>
            <v-divider class="mb-3" />
            <v-data-table
                v-model="selectedFiles"
                v-model:sort-by="vuetifySortBy"
                :items="displayFiles"
                class="files-table"
                :headers="headers"
                v-model:items-per-page="countPerPage"
                item-value="filename"
                return-object
                :search="search"
                :custom-filter="advancedSearch"
                :mobile-breakpoint="0"
                show-select>
                <template #no-data>
                    <div class="text-center font-italic">{{ t('Timelapse.Empty') }}</div>
                </template>

                <template v-if="currentPath !== rootDirectory" #body.prepend>
                    <tr class="file-list-cursor" @click="clickRowGoBack">
                        <td class="pr-0 text-center" style="width: 32px">
                            <v-icon>{{ mdiFolderUpload }}</v-icon>
                        </td>
                        <td class=" " :colspan="headers.length">..</td>
                    </tr>
                </template>

                <template #item="{ index, item, isSelected, toggleSelect, internalItem }">
                    <tr
                        :key="`${index} ${item.filename}`"
                        v-longpress:600="{ handler: showContextMenu, args: [item] }"
                        class="file-list-cursor user-select-none"
                        @contextmenu="showContextMenu($event, item)"
                        @click="clickRow(item)">
                        <td class="file-list__select-td pr-0">
                            <v-checkbox-btn :model-value="isSelected(internalItem)" class="pa-0 mr-0" @click.stop="toggleSelect(internalItem)" />
                        </td>
                        <td class="px-0 text-center" style="width: 32px">
                            <template v-if="item.isDirectory">
                                <v-icon width="32">{{ mdiFolder }}</v-icon>
                            </template>
                            <template v-else-if="item.filename.endsWith('zip')">
                                <v-icon width="32">{{ mdiFolderZipOutline }}</v-icon>
                            </template>
                            <template v-else-if="getThumbnail(item)">
                                <v-tooltip v-if="!item.isDirectory && getThumbnail(item)" location="top" content-class="tooltip__content-opacity1">
                                    <template #activator="{ props: activatorProps }">
                                        <load-image :src="getThumbnail(item)">
                                            <template #image>
                                                <img :src="getThumbnail(item)" :alt="item.filename" width="32" v-bind="activatorProps" />
                                            </template>
                                            <template #preloader>
                                                <v-progress-circular indeterminate color="primary" />
                                            </template>
                                            <template #error>
                                                <v-icon>{{ mdiFile }}</v-icon>
                                            </template>
                                        </load-image>
                                    </template>
                                    <span><img :src="getThumbnail(item)" :alt="item.filename" width="250" /></span>
                                </v-tooltip>
                            </template>
                            <template v-else>
                                <v-icon>{{ mdiFile }}</v-icon>
                            </template>
                        </td>
                        <td class=" ">{{ item.filename }}</td>
                        <td v-if="headers.find((header) => header.key === 'size')?.visible" class="text-no-wrap text-right">
                            {{ item.isDirectory ? '--' : formatFilesize(item.size ?? 0) }}
                        </td>
                        <td v-if="headers.find((header) => header.key === 'modified')?.visible" class="text-right">
                            {{ formatDateTime(item.modified.getTime()) }}
                        </td>
                    </tr>
                </template>
            </v-data-table>
        </panel>
        <v-menu v-model="contextMenu.shown" :target="[contextMenu.x, contextMenu.y]">
            <v-list>
                <v-list-item v-if="!contextMenu.item.isDirectory" @click="downloadFile(contextMenu.item.filename)">
                    <v-icon class="mr-1">{{ mdiCloudDownload }}</v-icon>
                    {{ t('Timelapse.Download') }}
                </v-list-item>
                <v-list-item v-if="contextMenu.item.isDirectory && contextMenu.item.permissions.includes('w')" @click="renameDirectory(contextMenu.item)">
                    <v-icon class="mr-1">{{ mdiRenameBox }}</v-icon>
                    {{ t('Timelapse.Rename') }}
                </v-list-item>
                <v-list-item v-if="!contextMenu.item.isDirectory && contextMenu.item.permissions.includes('w')" @click="renameFile(contextMenu.item)">
                    <v-icon class="mr-1">{{ mdiRenameBox }}</v-icon>
                    {{ t('Timelapse.Rename') }}
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
        <v-dialog v-model="dialogRenameFile.show" max-width="400">
            <panel :title="t('Timelapse.RenameFile')" card-class="gcode-files-rename-file-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="dialogRenameFile.show = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-text-field
                        ref="inputFieldRenameFile"
                        v-model="dialogRenameFile.newName"
                        :label="t('Timelapse.Name')"
                        required
                        :rules="nameInputRules"
                        @update:error="onInvalidNameUpdate"
                        @keypress.enter="renameFileAction" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="dialogRenameFile.show = false">{{ t('Buttons.Cancel') }}</v-btn>
                    <v-btn :disabled="isInvalidName" color="primary" variant="text" @click="renameFileAction">
                        {{ t('Timelapse.Rename') }}
                    </v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>
        <v-dialog v-model="dialogCreateDirectory.show" max-width="400">
            <panel :title="t('Timelapse.NewDirectory')" card-class="gcode-files-new-directory-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="dialogCreateDirectory.show = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-text-field
                        ref="inputFieldCreateDirectory"
                        v-model="dialogCreateDirectory.name"
                        :label="t('Timelapse.Name')"
                        required
                        :rules="nameInputRules"
                        @update:error="onInvalidNameUpdate"
                        @keypress.enter="createDirectoryAction" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="dialogCreateDirectory.show = false">
                        {{ t('Buttons.Cancel') }}
                    </v-btn>
                    <v-btn :disabled="isInvalidName" color="primary" variant="text" @click="createDirectoryAction">
                        {{ t('Timelapse.Create') }}
                    </v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>
        <v-dialog v-model="dialogRenameDirectory.show" max-width="400">
            <panel :title="t('Timelapse.RenameDirectory')" card-class="gcode-files-rename-directory-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="dialogRenameDirectory.show = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-text-field
                        ref="inputFieldRenameDirectory"
                        v-model="dialogRenameDirectory.newName"
                        :label="t('Timelapse.Name')"
                        required
                        :rules="nameInputRules"
                        @update:error="onInvalidNameUpdate"
                        @keyup.enter="renameDirectoryAction" />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="dialogRenameDirectory.show = false">
                        {{ t('Buttons.Cancel') }}
                    </v-btn>
                    <v-btn :disabled="isInvalidName" color="primary" variant="text" @click="renameDirectoryAction">
                        {{ t('Timelapse.Rename') }}
                    </v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>
        <confirmation-dialog
            v-model="dialogDeleteDirectory.show"
            :title="t('Timelapse.DeleteDirectory')"
            :text="t('Timelapse.DeleteDirectoryQuestion', { name: dialogDeleteDirectory.item.filename })"
            :action-button-text="t('Buttons.Delete')"
            @action="deleteDirectoryAction" />
        <v-dialog v-model="boolVideoDialog" :max-width="700">
            <panel :title="t('Timelapse.Video')" :icon="mdiFileVideo" card-class="timelapse-video-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="boolVideoDialog = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text class="">
                    <v-row>
                        <v-col class="pb-0">
                            <video :src="apiUrl + '/server/files/' + videoDialogFilename" controls style="width: 100%">
                                Sorry, your browser doesn't support embedded videos, but don't worry, you can
                                <a :href="apiUrl + '/server/files/' + videoDialogFilename">download it</a>
                                and watch it with your favorite video player!
                            </video>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col class="text-center">
                            <v-btn variant="text" color="primary" :href="apiUrl + '/server/files/' + videoDialogFilename" target="_blank">
                                {{ t('Timelapse.Download') }}
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-card-text>
            </panel>
        </v-dialog>

        <!-- CONFIRM DELETE SINGLE FILE DIALOG -->
        <confirmation-dialog v-model="deleteDialog" :title="t('Timelapse.Delete')" :text="t('Timelapse.DeleteSingleFileQuestion', { name: contextMenu.item.filename })" :action-button-text="t('Buttons.Delete')" @action="removeFile" />

        <!-- CONFIRM DELETE MULTIPLE FILES DIALOG -->
        <confirmation-dialog v-model="deleteSelectedDialog" :title="t('Timelapse.Delete')" :text="deleteSelectedDialogText" :action-button-text="t('Buttons.Delete')" @action="deleteSelectedFiles" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DataTableSortItem } from 'vuetify'
import type { LongpressEvent } from '@/directives/longpress'
import { escapePath, formatFilesize, sortFiles } from '@/plugins/helpers'
import type { FileStateFile } from '@/store/files/types'
import Panel from '@/components/ui/Panel.vue'
import PathNavigation from '@/components/ui/PathNavigation.vue'
import LoadImage from '@/components/ui/LoadImage.vue'
import {
    mdiFolderPlus,
    mdiCloseThick,
    mdiFileDocumentMultipleOutline,
    mdiFileVideo,
    mdiFolder,
    mdiFolderUpload,
    mdiMagnify,
    mdiFile,
    mdiFolderZipOutline,
    mdiRefresh,
    mdiCloudDownload,
    mdiRenameBox,
    mdiDelete,
} from '@mdi/js'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import type { FocusableRef } from '@/types/vuetify'
import { useBase } from '@/composables/useBase'
import { useFilesStore } from '@/store/files'
import { useGuiStore } from '@/store/gui'
import { webSocketClient } from '@/plugins/webSocketClient'

interface dialogRenameObject {
    show: boolean
    newName: string
    item: FileStateFile
}

const { t } = useI18n()
const { apiUrl, loadings, formatDateTime } = useBase()
const filesStore = useFilesStore()
const guiStore = useGuiStore()

const inputFieldRenameFile = ref<FocusableRef | undefined>()
const inputFieldCreateDirectory = ref<FocusableRef | undefined>()
const inputFieldRenameDirectory = ref<FocusableRef | undefined>()

const search = ref('')
const boolVideoDialog = ref(false)
const videoDialogFilename = ref('')

const dialogCreateDirectory = ref({
    show: false,
    name: '',
})

const emptyFile = (): FileStateFile => ({
    isDirectory: false,
    filename: '',
    permissions: '',
    modified: new Date(),
})

const contextMenu = ref({
    shown: false,
    isDirectory: false,
    x: 0,
    y: 0,
    item: emptyFile(),
})

const dialogRenameFile = ref<dialogRenameObject>({
    show: false,
    newName: '',
    item: emptyFile(),
})

const dialogRenameDirectory = ref<dialogRenameObject>({
    show: false,
    newName: '',
    item: emptyFile(),
})

const dialogDeleteDirectory = ref<dialogRenameObject>({
    show: false,
    newName: '',
    item: emptyFile(),
})

const deleteDialog = ref(false)
const deleteSelectedDialog = ref(false)

const isInvalidName = ref(true)
const nameInputRules = [(value: string) => !!value || t('Files.InvalidNameEmpty'), (value: string) => !existsFilename(value) || t('Files.InvalidNameAlreadyExists')]

function onInvalidNameUpdate(bool: boolean) {
    isInvalidName.value = bool
}

const rootDirectory = 'timelapse'

function existsFilename(name: string) {
    return files.value.findIndex((file) => file.filename === name) >= 0
}

// Vuetify 4's per-column value functions double as the sort key -- prefixing
// with the directory flag reproduces the old customSort's "directories
// always first" behaviour without a whole-array custom comparator.
const headers = computed(() => [
    { title: '', key: 'select', value: '', align: 'start' as const, configable: false, visible: true, sortable: false },
    {
        title: t('Timelapse.Name'),
        key: 'filename',
        value: (item: FileStateFile) => `${item.isDirectory ? '0' : '1'}_${item.filename.toLowerCase()}`,
        align: 'start' as const,
        configable: false,
        visible: true,
    },
    {
        title: t('Timelapse.Filesize'),
        key: 'size',
        value: (item: FileStateFile) => `${item.isDirectory ? '0' : '1'}_${String(item.size ?? 0).padStart(20, '0')}`,
        align: 'end' as const,
        configable: true,
        visible: true,
    },
    {
        title: t('Timelapse.LastModified'),
        key: 'modified',
        value: (item: FileStateFile) => `${item.isDirectory ? '0' : '1'}_${String(item.modified?.getTime() ?? 0).padStart(20, '0')}`,
        align: 'end' as const,
        configable: true,
        visible: true,
    },
])

const currentPath = computed(() => guiStore.view.timelapse.currentPath)

const directory = computed(() => filesStore.getDirectory(currentPath.value))

const disk_usage = computed(() => directory.value?.disk_usage ?? { used: 0, free: 0, total: 0 })

const directoryPermissions = computed(() => directory.value?.permissions ?? 'r')

const files = computed(() => [...(directory.value?.childrens ?? [])])

const sortByField = computed<string>({
    get: () => guiStore.view.timelapse.sortBy ?? 'modified',
    set: (newVal) => guiStore.saveSetting({ name: 'view.timelapse.sortBy', value: newVal ?? 'modified' }),
})

const sortDescBool = computed<boolean>({
    get: () => guiStore.view.timelapse.sortDesc ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.timelapse.sortDesc', value: newVal ?? false }),
})

const vuetifySortBy = computed<DataTableSortItem[]>({
    get: () => [{ key: sortByField.value, order: sortDescBool.value ? ('desc' as const) : ('asc' as const) }],
    set: (newVal: DataTableSortItem[]) => {
        if (!newVal.length) return

        sortByField.value = newVal[0].key
        sortDescBool.value = newVal[0].order === 'desc'
    },
})

const countPerPage = computed<number>({
    get: () => guiStore.view.timelapse?.countPerPage ?? 10,
    set: (newVal) => guiStore.saveSetting({ name: 'view.timelapse.countPerPage', value: newVal }),
})

const displayFiles = computed(() => {
    const output = files.value?.filter((file) => {
        if (file.isDirectory) return true

        return file.filename.endsWith('mp4') || file.filename.endsWith('zip')
    }) ?? []

    return sortFiles(output, [sortByField.value], [sortDescBool.value])
})

const currentPathForNavigation = computed(() => {
    if (currentPath.value === rootDirectory) {
        return ''
    }

    return currentPath.value.substring(rootDirectory.length)
})

function setCurrentPath(newVal: string) {
    guiStore.saveSetting({ name: 'view.timelapse.currentPath', value: newVal })
}

const selectedFiles = computed<FileStateFile[]>({
    get: () => guiStore.view.timelapse.selectedFiles ?? [],
    set: (newVal) => guiStore.saveSetting({ name: 'view.timelapse.selectedFiles', value: newVal }),
})

const deleteSelectedDialogText = computed<string>(() => {
    if (selectedFiles.value.length === 1) {
        return t('Timelapse.DeleteSingleFileQuestion', { name: selectedFiles.value[0].filename })
    }

    return t('Timelapse.DeleteSelectedQuestion', { count: selectedFiles.value.length })
})

function createDirectory() {
    dialogCreateDirectory.value.name = ''
    dialogCreateDirectory.value.show = true

    setTimeout(() => {
        inputFieldCreateDirectory.value?.focus()
    }, 200)
}

function createDirectoryAction() {
    dialogCreateDirectory.value.show = false

    webSocketClient.emit('server.files.post_directory', { path: currentPath.value + '/' + dialogCreateDirectory.value.name }, { action: 'files/getCreateDir' })
}

function refreshFileList() {
    webSocketClient.emit('server.files.get_directory', { path: currentPath.value }, { action: 'files/getDirectory' })
}

function advancedSearch(value: string | number, search: string) {
    return value != null && search != null && typeof value === 'string' && value.toString().toLowerCase().indexOf(search.toLowerCase()) !== -1
}

function getThumbnail(item: FileStateFile) {
    const filename = item.filename.slice(0, item.filename.lastIndexOf('.'))
    const preview = files.value?.find((file) => file.filename === filename + '.jpg')
    if (preview) {
        return `${apiUrl.value}/server/files/${escapePath(currentPath.value)}/${escapePath(preview.filename)}?timestamp=${preview.modified.getTime()}`
    }

    return ''
}

function clickRow(item: FileStateFile, force = false) {
    if (!contextMenu.value.shown || force) {
        if (force) contextMenu.value.shown = false

        if (item.isDirectory) setCurrentPath(currentPath.value + '/' + item.filename)
        else if (item.filename.endsWith('zip')) {
            downloadFile(item.filename)
        } else if (item.filename.endsWith('mp4')) {
            videoDialogFilename.value = escapePath(`${currentPath.value}/${item.filename}`)
            boolVideoDialog.value = true
        }
    }
}

function clickRowGoBack() {
    setCurrentPath(currentPath.value.slice(0, currentPath.value.lastIndexOf('/')))
}

function clickPathNavGoToDirectory(segment: { location: string }) {
    setCurrentPath(`${rootDirectory}${segment.location}`)
}

function showContextMenu(e: MouseEvent | LongpressEvent, item: FileStateFile) {
    if (!contextMenu.value.shown) {
        e?.preventDefault()
        contextMenu.value.shown = true
        contextMenu.value.x = e?.clientX || e?.pageX || window.screenX / 2
        contextMenu.value.y = e?.clientY || e?.pageY || window.screenY / 2
        contextMenu.value.item = item
    }
}

function downloadFile(filename: string) {
    const path = currentPath.value + '/' + filename
    const href = apiUrl.value + '/server/files/' + escapePath(path)

    window.open(href)
}

async function downloadSelectedFiles() {
    const items: string[] = []

    const addElementToItems = async (absolutPath: string, directory: FileStateFile[]) => {
        for (const file of directory) {
            const filePath = `${absolutPath}/${file.filename}`

            if (file.isDirectory && file.childrens) {
                await addElementToItems(filePath, file.childrens)

                continue
            }

            items.push(filePath)

            if (file.filename.endsWith('.mp4')) {
                const indexLastPoint = file.filename.lastIndexOf('.')
                const filenameWithoutExtension = file.filename.slice(0, indexLastPoint)
                const filenameJpg = `${filenameWithoutExtension}.jpg`

                if (files.value.some((f: FileStateFile) => f.filename === filenameJpg)) {
                    items.push(`${absolutPath}/${filenameJpg}`)
                }
            }
        }
    }

    await addElementToItems(currentPath.value, selectedFiles.value)
    const date = new Date()
    const timestamp = `${date.getFullYear()}${date.getMonth()}${date.getDate()}-${date.getHours()}${date.getMinutes()}${date.getSeconds()}`

    webSocketClient.emit('server.files.zip', { items, dest: `timelapse/timelapse-${timestamp}.zip` }, { action: 'files/downloadZip', loading: 'timelapseDownloadZip' })

    selectedFiles.value = []
}

function renameFile(item: FileStateFile) {
    const posLastPoint = item.filename.lastIndexOf('.')
    dialogRenameFile.value.newName = item.filename.slice(0, posLastPoint)

    dialogRenameFile.value.item = item
    dialogRenameFile.value.show = true

    setTimeout(() => {
        inputFieldRenameFile.value?.focus()
    }, 200)
}

function renameFileAction() {
    const posLastPoint = dialogRenameFile.value.item.filename.lastIndexOf('.')
    const oldNameWithoutExtension = dialogRenameFile.value.item.filename.slice(0, posLastPoint)
    const fileExtension = dialogRenameFile.value.item.filename.split('.').pop()

    dialogRenameFile.value.show = false

    /**
     * rename the file regardless of its file-extension
     */
    webSocketClient.emit(
        'server.files.move',
        {
            source: `${currentPath.value}/${dialogRenameFile.value.item.filename}`,
            dest: `${currentPath.value}/${dialogRenameFile.value.newName}.${fileExtension}`,
        },
        { action: 'files/getMove' }
    )

    if (fileExtension !== 'mp4') return

    /**
     * mp4 and jpg always require to have the same name as the
     * jpg is used as a mp4-thumbnail in the timelapse file-browser
     */
    const fileJpg = files.value.find((file) => file.filename === `${oldNameWithoutExtension}.jpg`)

    if (fileJpg) {
        webSocketClient.emit('server.files.move', {
            source: `${currentPath.value}/${oldNameWithoutExtension}.jpg`,
            dest: `${currentPath.value}/${dialogRenameFile.value.newName}.jpg`,
        })
    }
}

function renameDirectory(item: FileStateFile) {
    dialogRenameDirectory.value.item = item
    dialogRenameDirectory.value.newName = item.filename
    dialogRenameDirectory.value.show = true

    setTimeout(() => {
        inputFieldRenameDirectory.value?.focus()
    }, 200)
}

function renameDirectoryAction() {
    dialogRenameDirectory.value.show = false
    webSocketClient.emit(
        'server.files.move',
        {
            source: currentPath.value + '/' + dialogRenameDirectory.value.item.filename,
            dest: currentPath.value + '/' + dialogRenameDirectory.value.newName,
        },
        { action: 'files/getMove' }
    )
}

function removeFile() {
    const filename = contextMenu.value.item.filename.slice(0, contextMenu.value.item.filename.lastIndexOf('.'))
    const fileExtension = contextMenu.value.item.filename.split('.').pop()

    /**
     * delete the file regardless of its file-extension
     */
    webSocketClient.emit('server.files.delete_file', { path: currentPath.value + '/' + contextMenu.value.item.filename }, { action: 'files/getDeleteFile' })

    if (fileExtension !== 'mp4') return

    /**
     * if file-extension is mp4, also delete its corresponding thumbnail jpg
     */
    const previewFilename = filename + '.jpg'
    const previewExists = files.value.findIndex((file) => file.filename === previewFilename) !== -1

    if (previewExists) webSocketClient.emit('server.files.delete_file', { path: currentPath.value + '/' + previewFilename }, { action: 'files/getDeleteFile' })
}

function deleteDirectory(item: FileStateFile) {
    dialogDeleteDirectory.value.item = item
    dialogDeleteDirectory.value.show = true
}

function deleteDirectoryAction() {
    webSocketClient.emit('server.files.delete_directory', { path: currentPath.value + '/' + contextMenu.value.item.filename, force: true }, { action: 'files/getDeleteDir' })
}

function deleteSelectedFiles() {
    selectedFiles.value.forEach((item: FileStateFile) => {
        if (item.isDirectory) {
            webSocketClient.emit('server.files.delete_directory', { path: currentPath.value + '/' + item.filename, force: true }, { action: 'files/getDeleteDir' })
        } else {
            const filename = item.filename.slice(0, item.filename.lastIndexOf('.'))
            const fileExtension = item.filename.split('.').pop()

            webSocketClient.emit('server.files.delete_file', { path: currentPath.value + '/' + item.filename }, { action: 'files/getDeleteFile' })

            if (fileExtension !== 'mp4') return

            /**
             * if file-extension is mp4, also delete its corresponding thumbnail jpg
             */
            const previewFilename = filename + '.jpg'
            const previewExists = files.value.findIndex((file) => file.filename === previewFilename) !== -1

            if (previewExists) webSocketClient.emit('server.files.delete_file', { path: currentPath.value + '/' + previewFilename }, { action: 'files/getDeleteFile' })
        }
    })

    selectedFiles.value = []
}
</script>

<style scoped>
.v-data-table .v-data-table-header__icon {
    margin-left: 7px;
}

.v-data-table th {
    white-space: nowrap;
}

.v-data-table .file-list-cursor:hover {
    cursor: pointer;
}
</style>
