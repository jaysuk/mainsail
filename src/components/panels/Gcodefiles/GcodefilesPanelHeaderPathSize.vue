<template>
    <v-row>
        <v-col class="col-12 py-2 d-flex align-center">
            <span>
                <b class="mr-1">{{ t('Files.CurrentPath') }}:</b>
                <path-navigation :path="currentPath" :base-directory-label="'/gcodes'" :on-segment-click="clickPathNavGoToDirectory" />
            </span>
            <v-spacer />
            <v-tooltip v-if="disk_usage !== null" location="top">
                <template #activator="{ props: activatorProps }">
                    <span v-bind="activatorProps">
                        <b>{{ t('Files.FreeDisk') }}:</b>
                        {{ formatFilesize(disk_usage.free) }}
                    </span>
                </template>
                <span>
                    {{ t('Files.Used') }}: {{ formatFilesize(disk_usage.used) }}
                    <br />
                    {{ t('Files.Free') }}: {{ formatFilesize(disk_usage.free) }}
                    <br />
                    {{ t('Files.Total') }}: {{ formatFilesize(disk_usage.total) }}
                </span>
            </v-tooltip>
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatFilesize } from '@/plugins/helpers'
import { useGcodefiles } from '@/composables/useGcodefiles'
import { useFilesStore } from '@/store/files'

const { t } = useI18n()
const { currentPath } = useGcodefiles()
const filesStore = useFilesStore()

const directory = computed(() => filesStore.getDirectory('gcodes' + currentPath.value))

const disk_usage = computed(() => directory.value?.disk_usage ?? { used: 0, free: 0, total: 0 })

function clickPathNavGoToDirectory(segment: { location: string }) {
    currentPath.value = segment.location
}
</script>

<style scoped></style>
