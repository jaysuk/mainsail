<template>
    <v-dialog v-model="showDialog" :max-width="600" persistent @keydown.esc="closeDialog">
        <panel :title="t('History.JobDetails')" :icon="mdiUpdate" card-class="history-detail-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text class="pa-0">
                <OverlayScrollbarsComponent style="height: 350px" class="px-6" :options="{}">
                    <template v-for="(entry, index) in entries" :key="'history_detail_entry_' + index">
                        <v-divider v-if="index > 0" class="my-3" />
                        <v-row>
                            <v-col>{{ entry.name }}</v-col>
                            <v-col class="text-right">{{ entry.value }}</v-col>
                        </v-row>
                    </template>
                </OverlayScrollbarsComponent>
            </v-card-text>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import type { ServerHistoryStateJob } from '@/store/server/history/types'
import { mdiCloseThick, mdiUpdate } from '@mdi/js'
import { formatFilesize, formatPrintTime } from '@/plugins/helpers'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { useBase } from '@/composables/useBase'

const props = defineProps<{
    job: ServerHistoryStateJob
}>()

const showDialog = defineModel<boolean>({ required: true })

const { t, te } = useI18n()
const { formatDateTime } = useBase()

const entries = computed(() => {
    const entries: { name: string; value: string | null; exists: boolean | undefined }[] = [
        {
            name: t('History.Filename'),
            value: props.job.filename,
            exists: true,
        },
        {
            name: t('History.Filesize'),
            value: formatFilesize(props.job.metadata?.filesize ?? 0),
            exists: (props.job.metadata?.filesize ?? 0) > 0,
        },
        {
            name: t('History.LastModified'),
            value: formatDateTime((props.job.metadata?.modified ?? 0) * 1000),
            exists: (props.job.metadata?.modified ?? 0) > 0,
        },
        {
            name: t('History.Status'),
            value: te(`History.StatusValues.${props.job.status}`, 'en') ? t(`History.StatusValues.${props.job.status}`) : props.job.status,
            exists: true,
        },
        {
            name: t('History.StartTime'),
            value: formatDateTime(props.job.start_time * 1000),
            exists: true,
        },
        {
            name: t('History.EndTime'),
            value: formatDateTime(props.job.end_time * 1000),
            exists: props.job.end_time > 0,
        },
        {
            name: t('History.EstimatedTime'),
            value: formatPrintTime(props.job.metadata?.estimated_time ?? 0),
            exists: props.job.metadata && 'estimated_time' in props.job.metadata,
        },
        {
            name: t('History.PrintDuration'),
            value: formatPrintTime(props.job.print_duration ?? 0),
            exists: props.job.print_duration > 0,
        },
        {
            name: t('History.TotalDuration'),
            value: formatPrintTime(props.job.total_duration ?? 0),
            exists: props.job.total_duration > 0,
        },
        {
            name: t('History.EstimatedFilamentWeight'),
            value: `${Math.round((props.job.metadata?.filament_weight_total ?? 0) * 100) / 100} g`,
            exists: props.job.metadata && 'filament_weight_total' in props.job.metadata,
        },
        {
            name: t('History.EstimatedFilament'),
            value: `${Math.round(props.job.metadata?.filament_total ?? 0)} mm`,
            exists: props.job.metadata && 'filament_total' in props.job.metadata,
        },
        {
            name: t('History.FilamentUsed'),
            value: `${Math.round((props.job.metadata?.filament_used as number | undefined) ?? 0)} mm`,
            exists: props.job.metadata && 'filament_used' in props.job.metadata,
        },
        {
            name: t('History.FirstLayerExtTemp'),
            value: `${props.job.metadata?.first_layer_extr_temp ?? 0} °C`,
            exists: props.job.metadata && 'first_layer_extr_temp' in props.job.metadata,
        },
        {
            name: t('History.FirstLayerBedTemp'),
            value: `${props.job.metadata?.first_layer_bed_temp ?? 0} °C`,
            exists: props.job.metadata && 'first_layer_bed_temp' in props.job.metadata,
        },
        {
            name: t('History.FirstLayerHeight'),
            value: `${props.job.metadata?.first_layer_height ?? 0} mm`,
            exists: props.job.metadata && 'first_layer_height' in props.job.metadata,
        },
        {
            name: t('History.LayerHeight'),
            value: `${props.job.metadata?.layer_height ?? 0} mm`,
            exists: props.job.metadata && 'layer_height' in props.job.metadata,
        },
        {
            name: t('History.ObjectHeight'),
            value: `${props.job.metadata?.object_height ?? 0} mm`,
            exists: props.job.metadata && 'object_height' in props.job.metadata,
        },
        {
            name: t('History.Slicer'),
            value: props.job.metadata?.slicer ?? '--',
            exists: props.job.metadata && 'slicer' in props.job.metadata,
        },
        {
            name: t('History.SlicerVersion'),
            value: props.job.metadata?.slicer_version ?? '--',
            exists: props.job.metadata && 'slicer_version' in props.job.metadata,
        },
    ]

    if ('auxiliary_data' in props.job) {
        props.job.auxiliary_data?.forEach((data) => {
            let value = data.value.toString()
            if (!Array.isArray(data.value)) {
                value = `${Math.round((data.value as number) * 1000) / 1000} ${data.units}`
            }
            if (value === '') value = '--'

            entries.push({
                name: data.description,
                value,
                exists: true,
            })
        })
    }

    return entries.filter((entry) => entry.exists)
})

function closeDialog() {
    showDialog.value = false
}
</script>

<style scoped>
:deep(.os-content .row:first-child) {
    margin-top: 1em !important;
}

:deep(.os-content .row:last-child) {
    margin-bottom: 1em !important;
}
</style>
