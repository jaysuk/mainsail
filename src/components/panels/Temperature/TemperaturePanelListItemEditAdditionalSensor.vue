<template>
    <v-row>
        <v-col class="col-12 py-1">
            <v-checkbox v-model="value" :label="label" hide-details class="mt-0" />
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGuiStore } from '@/store/gui'

const props = defineProps<{
    objectName: string
    additionalSensor: string
}>()

const { t } = useI18n()
const guiStore = useGuiStore()

const value = computed<boolean>({
    get: () =>
        guiStore.getDatasetAdditionalSensorValue({
            name: props.objectName,
            sensor: props.additionalSensor,
        }),
    set: (newVal) =>
        guiStore.setDatasetAdditionalSensorStatus({
            objectName: props.objectName,
            dataset: props.additionalSensor,
            value: newVal,
        }),
})

const label = computed(() =>
    t('Panels.TemperaturePanel.ShowNameInList', {
        name: props.additionalSensor,
    })
)
</script>
