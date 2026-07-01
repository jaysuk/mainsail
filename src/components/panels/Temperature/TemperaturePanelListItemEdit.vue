<template>
    <v-dialog v-model="showDialog" persistent :width="400">
        <panel :title="formatName" :icon="icon" card-class="temperature-edit-heater-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon tile @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text class="pt-6">
                <temperature-panel-list-item-edit-chart-serie v-for="dataset in chartSeries" :key="dataset" :object-name="objectName" :serie-name="dataset" />
                <temperature-panel-list-item-edit-additional-sensor v-for="additionalSensor in additionalValues" :key="additionalSensor" :object-name="objectName" :additional-sensor="additionalSensor" />
                <v-row>
                    <v-col class="col-12 text-center pb-0">
                        <v-color-picker hide-mode-switch mode="hexa" :model-value="color" class="mx-auto" @update:model-value="setChartColor" />
                    </v-col>
                </v-row>
            </v-card-text>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { mdiCloseThick } from '@mdi/js'
import Panel from '@/components/ui/Panel.vue'
import TemperaturePanelListItemEditChartSerie from '@/components/panels/Temperature/TemperaturePanelListItemEditChartSerie.vue'
import TemperaturePanelListItemEditAdditionalSensor from '@/components/panels/Temperature/TemperaturePanelListItemEditAdditionalSensor.vue'
import { useGuiStore } from '@/store/gui'
import { usePrinterStore } from '@/store/printer'
import { usePrinterTempHistoryStore } from '@/store/printer/tempHistory'

const props = defineProps<{
    objectName: string
    name: string
    additionalSensorName: string | null
    formatName: string
    icon: string
    color: string
}>()

const showDialog = defineModel<boolean>({ required: true })

const guiStore = useGuiStore()
const printerStore = usePrinterStore()
const printerTempHistoryStore = usePrinterTempHistoryStore()

const chartSeries = computed(() => printerTempHistoryStore.getSerieNames(props.objectName) ?? [])

const printerObjectAdditionalSensor = computed(() => {
    if (props.additionalSensorName === null || !(props.additionalSensorName in printerStore)) return {}

    return printerStore[props.additionalSensorName]
})

const additionalValues = computed(() => {
    if (props.objectName === 'z_thermal_adjust') return ['current_z_adjust']
    if (props.objectName.startsWith('nevermore')) return ['temperature', 'pressure', 'humidity', 'rpm']

    return Object.keys(printerObjectAdditionalSensor.value).filter((key) => key !== 'temperature')
})

// debounce replaces the removed vue-debounce-decorator @Debounce(500)
let debounceTimer: ReturnType<typeof setTimeout> | undefined
function setChartColor(value: string | { hex: string } | Record<string, unknown> | null): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        let colorValue = value
        if (colorValue !== null && typeof colorValue === 'object' && 'hex' in colorValue) colorValue = colorValue.hex as string

        guiStore.setChartColor({
            objectName: props.objectName,
            value: colorValue as string,
        })

        printerTempHistoryStore.setColor({ name: props.objectName, value: colorValue as string })
    }, 500)
}

function closeDialog() {
    showDialog.value = false
}

onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
})
</script>
