<template>
    <v-data-table
        v-model="selectedFiles"
        v-model:sort-by="vuetifySortBy"
        v-model:items-per-page="countPerPage"
        :items="files"
        class="files-table"
        :headers="vuetifyHeaders"
        item-value="filename"
        return-object
        :search="search"
        :custom-filter="advancedSearch"
        :mobile-breakpoint="0"
        show-select
        @update:current-items="refreshMetadata">
        <template #no-data>
            <div class="text-center">{{ t('Files.Empty') }}</div>
        </template>

        <template v-if="currentPath !== ''" #body.prepend>
            <gcodefiles-panel-table-row-back />
        </template>

        <template #item="{ index, item, isSelected, toggleSelect, internalItem }">
            <gcodefiles-panel-table-row-file v-if="!item.isDirectory" :key="`${index} ${item.filename}`" :item="item" :is-selected="isSelected(internalItem)" :select="() => toggleSelect(internalItem)" />
            <gcodefiles-panel-table-row-directory v-else :key="`${index} ${item.filename}`" :item="item" :is-selected="isSelected(internalItem)" :select="() => toggleSelect(internalItem)" />
        </template>
    </v-data-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DataTableSortItem } from 'vuetify'
import type { FileStateGcodefile } from '@/store/files/types'
import GcodefilesPanelTableRowBack from '@/components/panels/Gcodefiles/GcodefilesPanelTableRowBack.vue'
import GcodefilesPanelTableRowDirectory from '@/components/panels/Gcodefiles/GcodefilesPanelTableRowDirectory.vue'
import GcodefilesPanelTableRowFile from '@/components/panels/Gcodefiles/GcodefilesPanelTableRowFile.vue'
import { useGcodefiles } from '@/composables/useGcodefiles'
import { useFilesStore } from '@/store/files'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { files, filteredHeaders, search, currentPath, selectedFiles } = useGcodefiles()
const filesStore = useFilesStore()
const guiStore = useGuiStore()

const sortBy = computed<string>({
    get: () => guiStore.view.gcodefiles.sortBy ?? 'modified',
    set: (newVal) => guiStore.saveSetting({ name: 'view.gcodefiles.sortBy', value: newVal ?? 'modified' }),
})

const sortDesc = computed<boolean>({
    get: () => guiStore.view.gcodefiles.sortDesc ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.gcodefiles.sortDesc', value: newVal ?? false }),
})

const vuetifySortBy = computed<DataTableSortItem[]>({
    get: () => [{ key: sortBy.value, order: sortDesc.value ? ('desc' as const) : ('asc' as const) }],
    set: (newVal: DataTableSortItem[]) => {
        if (!newVal.length) return

        sortBy.value = newVal[0].key
        sortDesc.value = newVal[0].order === 'desc'
    },
})

const countPerPage = computed<number>({
    get: () => guiStore.view.gcodefiles.countPerPage ?? 10,
    set: (newVal) => guiStore.saveSetting({ name: 'view.gcodefiles.countPerPage', value: newVal }),
})

// Vuetify 4's per-column value functions double as the sort key -- prefixing
// with the directory flag reproduces the old customSort's "directories
// always first" behaviour without a whole-array custom comparator.
function sortableValue(item: FileStateGcodefile, columnKey: string): string {
    const prefix = item.isDirectory ? '0' : '1'
    const raw = (item as unknown as Record<string, unknown>)[columnKey]

    if (raw === null || raw === undefined) return `${prefix}_`
    if (raw instanceof Date) return `${prefix}_${String(raw.getTime()).padStart(20, '0')}`
    if (typeof raw === 'number') return `${prefix}_${String(raw).padStart(20, '0')}`
    if (Array.isArray(raw)) {
        const sum = raw.reduce((acc: number, cur: unknown) => acc + (typeof cur === 'number' ? cur : 0), 0)
        return `${prefix}_${String(sum).padStart(20, '0')}`
    }

    return `${prefix}_${String(raw).toLowerCase()}`
}

const vuetifyHeaders = computed(() =>
    filteredHeaders.value.map((header) => ({
        title: header.text,
        key: header.value,
        align: header.class?.includes('text-right') ? ('end' as const) : undefined,
        sortable: header.sortable !== false,
        value: (item: FileStateGcodefile) => sortableValue(item, header.value),
    }))
)

function advancedSearch(value: unknown, search: string | null) {
    if (search === null) return false
    if (typeof value !== 'string') return false

    const stringValue = value.toLowerCase()
    const searchSplits = search.toLowerCase().split(' ')
    for (const searchWord of searchSplits) {
        if (!stringValue.includes(searchWord)) return false
    }

    return true
}

function refreshMetadata(data: unknown[]) {
    const rawItems = data.map((entry) => (entry !== null && typeof entry === 'object' && 'raw' in entry ? (entry as { raw: FileStateGcodefile }).raw : (entry as FileStateGcodefile)))
    const items = rawItems.filter((file) => !file.isDirectory && !file.metadataRequested && !file.metadataPulled)

    filesStore.requestMetadata(
        items.map((file: FileStateGcodefile) => ({
            filename: 'gcodes' + currentPath.value + '/' + file.filename,
        }))
    )
}
</script>

<style scoped>
.files-table :deep(.v-data-table-header__icon) {
    margin-left: 7px;
}

.files-table :deep(.file-list-cursor:hover) {
    cursor: pointer;
}

.files-table :deep(.v-data-table-header th:first-child) {
    padding-right: 0;
}
</style>
