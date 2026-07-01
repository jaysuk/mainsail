import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGuiStore } from '@/store/gui'
import { useFilesStore } from '@/store/files'
import type { FileStateFile } from '@/store/files/types'

export interface tableColumnSetting {
    text: string
    value: string
    visible: boolean
    sortable?: boolean
    class?: string
    pos?: number
    outputType?: 'string' | 'date' | 'length' | 'weight' | 'filesize' | 'temp' | 'time'
}

/** Replaces the Vue 2 `GcodefilesMixin` class component. */
export function useGcodefiles() {
    const { t } = useI18n()
    const guiStore = useGuiStore()
    const filesStore = useFilesStore()

    const saveSetting = (name: string, value: unknown) => guiStore.saveSetting({ name, value })

    const search = computed<string>({
        get: () => guiStore.view.gcodefiles.search ?? '',
        set: (value) => saveSetting('view.gcodefiles.search', value),
    })

    const currentPath = computed<string>({
        get: () => {
            const path = guiStore.view.gcodefiles.currentPath ?? ''
            return path === 'gcodes' ? '' : path
        },
        set: (newVal) => saveSetting('view.gcodefiles.currentPath', newVal),
    })

    const showHiddenFiles = computed<boolean>({
        get: () => guiStore.view.gcodefiles.showHiddenFiles ?? false,
        set: (newVal) => saveSetting('view.gcodefiles.showHiddenFiles', newVal),
    })

    const showPrintedFiles = computed<boolean>({
        get: () => guiStore.view.gcodefiles.showPrintedFiles ?? true,
        set: (newVal) => saveSetting('view.gcodefiles.showPrintedFiles', newVal),
    })

    const files = computed(() => filesStore.getGcodeFiles(currentPath.value, showHiddenFiles.value, showPrintedFiles.value))

    const hideMetadataColumns = computed<string[]>({
        get: () => guiStore.view.gcodefiles.hideMetadataColumns ?? [],
        set: (newVal) => saveSetting('view.gcodefiles.hideMetadataColumns', newVal),
    })

    const orderMetadataColumns = computed<string[]>({
        get: () => guiStore.view.gcodefiles.orderMetadataColumns ?? [],
        set: (newVal) => saveSetting('view.gcodefiles.orderMetadataColumns', newVal),
    })

    const fixedHeaders = computed<tableColumnSetting[]>(() => [
        { text: '', value: '', visible: true, sortable: false },
        {
            text: t('Files.Name'),
            value: 'filename',
            visible: true,
            class: 'text-no-wrap',
        },
        { text: '', value: 'status', visible: true, class: 'text-no-wrap', sortable: false },
    ])

    const configurableHeaders = computed<tableColumnSetting[]>({
        get: () => {
            const headers: tableColumnSetting[] = [
                { text: t('Files.Filesize'), value: 'size', visible: true, class: 'text-no-wrap', outputType: 'filesize' },
                { text: t('Files.LastModified'), value: 'modified', visible: true, class: 'text-no-wrap', outputType: 'date' },
                { text: t('Files.ObjectHeight'), value: 'object_height', visible: true, class: 'text-no-wrap', outputType: 'length' },
                { text: t('Files.LayerHeight'), value: 'layer_height', visible: true, class: 'text-no-wrap', outputType: 'length' },
                { text: t('Files.NozzleDiameter'), value: 'nozzle_diameter', visible: true, class: 'text-no-wrap', outputType: 'length' },
                { text: t('Files.ExtruderTemp'), value: 'first_layer_extr_temp', visible: true, class: 'text-no-wrap', outputType: 'temp' },
                { text: t('Files.BedTemp'), value: 'first_layer_bed_temp', visible: true, class: 'text-no-wrap', outputType: 'temp' },
                { text: t('Files.ChamberTemp'), value: 'chamber_temp', visible: true, class: 'text-no-wrap', outputType: 'temp' },
                { text: t('Files.Filaments'), value: 'filaments', visible: true, class: 'text-no-wrap' },
                { text: t('Files.FilamentName'), value: 'filament_name', visible: true, class: 'text-no-wrap' },
                { text: t('Files.FilamentType'), value: 'filament_type', visible: true, class: 'text-no-wrap', outputType: 'string' },
                { text: t('Files.FilamentUsage'), value: 'filament_total', visible: true, class: 'text-no-wrap', outputType: 'length' },
                { text: t('Files.FilamentWeight'), value: 'filament_weight_total', visible: true, class: 'text-no-wrap', outputType: 'weight' },
                { text: t('Files.PrintTime'), value: 'estimated_time', visible: true, class: 'text-no-wrap', outputType: 'time' },
                { text: t('Files.LastStartTime'), value: 'last_start_time', visible: true, class: 'text-no-wrap', outputType: 'date' },
                { text: t('Files.LastEndTime'), value: 'last_end_time', visible: true, class: 'text-no-wrap', outputType: 'date' },
                { text: t('Files.LastPrintDuration'), value: 'last_print_duration', visible: true, class: 'text-no-wrap', outputType: 'time' },
                { text: t('Files.LastTotalDuration'), value: 'last_total_duration', visible: true, class: 'text-no-wrap', outputType: 'time' },
                { text: t('Files.LastFilamentUsed'), value: 'last_filament_used', visible: true, class: 'text-no-wrap', outputType: 'length' },
                { text: t('Files.Slicer'), value: 'slicer', visible: true, class: 'text-no-wrap', outputType: 'string' },
            ]

            let unknownPos = 0
            headers.forEach((header) => {
                header.visible = !hideMetadataColumns.value.includes(header.value)

                let pos = orderMetadataColumns.value?.findIndex((value: string) => value === header.value)
                if (pos === -1) {
                    unknownPos++
                    pos = orderMetadataColumns.value.length + unknownPos
                }
                header.pos = pos
            })

            return headers.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
        },
        set: (newVal) => {
            const orderArray: string[] = []
            newVal.forEach((row) => orderArray.push(row.value))

            orderMetadataColumns.value = orderArray
        },
    })

    const headers = computed(() => [...fixedHeaders.value, ...configurableHeaders.value])
    const filteredHeaders = computed(() => headers.value.filter((header) => header.visible))
    const tableColumns = computed(() => configurableHeaders.value.filter((column) => column.visible))

    const selectedFiles = computed<FileStateFile[]>({
        get: () => guiStore.view.gcodefiles.selectedFiles ?? [],
        set: (newVal) => saveSetting('view.gcodefiles.selectedFiles', newVal),
    })

    const existsFilename = (name: string) => files.value.findIndex((file: FileStateFile) => file.filename === name) >= 0

    return {
        search,
        currentPath,
        showHiddenFiles,
        showPrintedFiles,
        files,
        hideMetadataColumns,
        orderMetadataColumns,
        fixedHeaders,
        configurableHeaders,
        headers,
        filteredHeaders,
        tableColumns,
        selectedFiles,
        existsFilename,
    }
}
