<template>
    <responsive
        :breakpoints="{
            small: (el) => el.width <= 350,
            medium: (el) => el.width > 350 && el.width <= 500,
        }">
        <template #default="{ el }">
            <v-container>
                <v-row>
                    <v-col v-if="extruders.length > 1" :class="{ 'col-12': el.is.small || el.is.medium, 'col-4': !el.is.small && !el.is.medium }">
                        <div class="d-flex align-center">
                            <v-btn v-if="selectedExtruder !== activeExtruder" icon variant="plain" @click="resetToActiveExtruder">
                                <v-icon>{{ mdiRestart }}</v-icon>
                            </v-btn>
                            <v-select v-model="selectedExtruder" :label="t('Panels.ExtruderControlPanel.PressureAdvanceSettings.Extruder')" :items="extruders" hide-details variant="outlined" density="compact" />
                        </div>
                    </v-col>
                    <v-col :class="{ 'col-12': el.is.small || el.is.medium, 'col-8': extruders.length > 1 && !el.is.small && !el.is.medium }">
                        <pressure-advance-settings :extruder="selectedExtruder" :is-small="el.is.small" />
                    </v-col>
                </v-row>
            </v-container>
        </template>
    </responsive>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Responsive from '@/components/ui/Responsive.vue'
import PressureAdvanceSettings from '@/components/panels/Extruder/PressureAdvanceSettings.vue'
import { mdiRestart } from '@mdi/js'
import { usePrinterStore } from '@/store/printer'

const { t } = useI18n()
const printerStore = usePrinterStore()

const selectedExtruder = ref('')

const extruders = computed(() =>
    Object.keys(printerStore)
        .filter((e) => e.startsWith('extruder') && !e.startsWith('extruder_stepper'))
        .sort((a, b) => a.localeCompare(b))
)

const activeExtruder = computed(() => printerStore.toolhead?.extruder ?? 'extruder')

function resetToActiveExtruder(): void {
    selectedExtruder.value = printerStore.toolhead?.extruder
}

watch(
    activeExtruder,
    (newVal) => {
        selectedExtruder.value = newVal
    },
    { immediate: true }
)
</script>
