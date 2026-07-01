<template>
    <v-card ref="filesGcodeCard" class="filesGcodeCard" flat>
        <v-data-table :items="gcodeFiles" hide-default-footer class="dashboard-gcodes-table" :sort-by="[{ key: 'time_added', order: 'asc' }]" :mobile-breakpoint="0">
            <template #no-data>
                <div class="text-center">{{ t('Panels.StatusPanel.EmptyGcodes') }}</div>
            </template>

            <template #item="{ item }">
                <status-panel-gcodefiles-entry :key="item.filename" :content-td-width="contentTdWidth" :item="item" />
            </template>
        </v-data-table>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FileStateGcodefile } from '@/store/files/types'
import StatusPanelGcodefilesEntry from '@/components/panels/Status/GcodefilesEntry.vue'
import { useGuiStore } from '@/store/gui'
import { useFilesStore } from '@/store/files'

const { t } = useI18n()
const guiStore = useGuiStore()
const filesStore = useFilesStore()

const contentTdWidth = ref(100)
const filesGcodeCard = ref<{ $el: HTMLElement } | null>(null)
let resizeObserver: ResizeObserver | null = null
let debounceTimer: ReturnType<typeof setTimeout> | undefined

const filesLimit = computed(() => guiStore.uiSettings.dashboardFilesLimit ?? 5)

const filesFilter = computed(() => guiStore.uiSettings.dashboardFilesFilter ?? [])

const gcodeFiles = computed(() => {
    let gcodes = filesStore.getAllGcodes() ?? []

    if (filesFilter.value.length > 0 && filesFilter.value.length < 3) {
        gcodes = gcodes.filter((file: FileStateGcodefile) => {
            if (filesFilter.value.includes('new') && file.last_status === null) return true
            if (filesFilter.value.includes('completed') && file.last_status === 'completed') return true
            if (filesFilter.value.includes('failed') && file.last_status !== null && file.last_status !== 'completed') return true

            return false
        })
    }

    gcodes = gcodes.sort((a: FileStateGcodefile, b: FileStateGcodefile) => b.modified.getTime() - a.modified.getTime()).slice(0, filesLimit.value)

    const requestItems = gcodes.filter((file: FileStateGcodefile) => !file.metadataRequested && !file.metadataPulled)
    filesStore.requestMetadata(
        requestItems.map((file: FileStateGcodefile) => ({
            filename: 'gcodes/' + file.filename,
        }))
    )

    return gcodes
})

function calcContentTdWidth() {
    contentTdWidth.value = (filesGcodeCard.value?.$el.clientWidth ?? 0) - 48 - 48 - 32
}

function handleResize() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        nextTick(() => {
            calcContentTdWidth()
        })
    }, 200)
}

onMounted(() => {
    resizeObserver = new ResizeObserver(() => handleResize())
    if (filesGcodeCard.value?.$el) resizeObserver.observe(filesGcodeCard.value.$el)

    calcContentTdWidth()
})

onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<style scoped>
.filesGcodeCard {
    position: relative;
}
</style>
