<template>
    <v-dialog v-model="showDialog" width="400">
        <panel :title="t('Panels.AfcPanel.FilamentForLane', { name })" :icon="afcIconLogo" card-class="afc-unit-lane-filament-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text class="pb-0">
                <settings-row :title="t('Panels.AfcPanel.Material')" :sub-title="t('Panels.AfcPanel.MaterialSubtitle')">
                    <v-text-field v-model="material" placeholder="ABS" density="compact" variant="outlined" hide-details />
                </settings-row>
                <v-divider class="my-3" />
                <settings-row :title="t('Panels.AfcPanel.Weight')" :sub-title="t('Panels.AfcPanel.WeightSubtitle')">
                    <v-text-field v-model="weight" placeholder="1000" density="compact" variant="outlined" type="number" :min="0" :step="1" hide-details />
                </settings-row>
                <v-divider class="my-3" />
                <v-color-picker hide-mode-switch mode="hexa" :model-value="color" class="mx-auto" @update:model-value="setColor" />
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" color="disabled" @click="closeDialog">{{ t('Buttons.Cancel') }}</v-btn>
                <v-btn :disabled="disableSetBtn" color="primary" variant="text" @click="setSpool">
                    {{ t('Panels.AfcPanel.SetSpool') }}
                </v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiCloseThick } from '@mdi/js'
import { afcIconLogo } from '@/plugins/afcIcons'
import { useAfc } from '@/composables/useAfc'
import { useControl } from '@/composables/useControl'

const props = defineProps<{
    name: string
}>()

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()
const { getAfcLaneObject } = useAfc()
const { doSend } = useControl()

const color = ref('#000000')
const material = ref('')
const weight = ref(0)

const lane = computed(() => getAfcLaneObject(props.name) as Record<string, any>)

const currentColor = computed(() => lane.value.color || '#000000')

const currentMaterial = computed(() => lane.value.material ?? '')

const currentWeight = computed(() => Math.round(lane.value.weight ?? 0))

const disableSetBtn = computed(() => !material.value || !weight.value || !color.value)

let debounceTimer: ReturnType<typeof setTimeout> | undefined
function setColor(newColor: string | { hex: string } | Record<string, unknown> | null): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        let colorValue = newColor
        if (colorValue !== null && typeof colorValue === 'object' && 'hex' in colorValue) colorValue = colorValue.hex as string

        color.value = colorValue as string
    }, 500)
}

function closeDialog() {
    showDialog.value = false
}

function setSpool() {
    const gcode = []

    if (color.value !== currentColor.value) {
        const cleanedColor = color.value.replace('#', '')
        gcode.push(`SET_COLOR LANE=${props.name} COLOR=${cleanedColor}`)
    }
    if (material.value !== currentMaterial.value) {
        gcode.push(`SET_MATERIAL LANE=${props.name} MATERIAL=${material.value}`)
    }
    if (weight.value !== currentWeight.value) {
        gcode.push(`SET_WEIGHT LANE=${props.name} WEIGHT=${weight.value}`)
    }

    doSend(gcode.join('\n'))
    closeDialog()
}

watch(showDialog, (newValue) => {
    if (!newValue) return

    color.value = currentColor.value
    material.value = currentMaterial.value
    weight.value = currentWeight.value
})
</script>
