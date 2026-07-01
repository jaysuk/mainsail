<template>
    <responsive :breakpoints="{ small: (el) => el.width <= 350 }">
        <template #default="{ el }">
            <v-container>
                <v-row>
                    <v-col class="pa-0">
                        <v-list-subheader class="_subheadline">{{ subheadline }}</v-list-subheader>
                    </v-col>
                </v-row>
                <pressure-advance-settings :extruder="extruderStepper" :is-small="el.is.small" />
            </v-container>
        </template>
    </responsive>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Responsive from '@/components/ui/Responsive.vue'
import PressureAdvanceSettings from '@/components/panels/Extruder/PressureAdvanceSettings.vue'
import { capitalize } from '@/plugins/helpers'
import { usePrinterStore } from '@/store/printer'

const props = defineProps<{ extruderStepper: string }>()

const { t } = useI18n()
const printerStore = usePrinterStore()

const name = computed(() => props.extruderStepper.substring('extruder_stepper '.length))

const extruderStepperObject = computed(() => printerStore[props.extruderStepper] ?? undefined)

const motionQueue = computed(() => extruderStepperObject.value?.motion_queue ?? '')

const subheadline = computed(() => {
    if (motionQueue.value) {
        return `${capitalize(name.value)} (${t('Panels.ExtruderControlPanel.PressureAdvanceSettings.SyncedWithExtruder', { extruder: motionQueue.value })})`
    }

    return capitalize(name.value)
})
</script>

<style scoped>
._subheadline {
    height: auto;
}
</style>
