<template>
    <v-row>
        <v-col class="py-1">
            <v-checkbox v-model="value" :label="label" hide-details class="mt-0" />
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { capitalize } from '@/plugins/helpers'
import { useGuiStore } from '@/store/gui'

const props = defineProps<{
    objectName: string
    serieName: string
}>()

const { t } = useI18n()
const guiStore = useGuiStore()

const value = computed<boolean>({
    get: () => guiStore.getDatasetValue({ name: props.objectName, type: props.serieName }) as boolean,
    set: (newVal: boolean) =>
        guiStore.setChartDatasetStatus({
            objectName: props.objectName,
            dataset: props.serieName,
            value: newVal,
        }),
})

const formatSerieName = computed(() => capitalize(props.serieName))

const label = computed(() =>
    t('Panels.TemperaturePanel.ShowNameInChart', {
        name: formatSerieName.value,
    })
)
</script>
