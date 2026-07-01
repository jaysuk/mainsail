<template>
    <v-card flat>
        <v-form v-model="valid" @submit.prevent="savePreset">
            <v-card-title>{{ title }}</v-card-title>
            <v-card-text>
                <v-row v-if="boolInvalidMin" class="mt-3">
                    <v-col class="py-0">
                        <v-alert density="compact" variant="text" type="error">{{ t('Settings.PresetsTab.PresetInfo') }}</v-alert>
                    </v-col>
                </v-row>
                <settings-row :title="t('Settings.PresetsTab.Name')">
                    <v-text-field
                        v-model="preset.name"
                        :placeholder="t('Settings.PresetsTab.PresetNamePlaceholder')"
                        hide-details="auto"
                        :rules="[rules.required, rules.unique]"
                        density="compact"
                        variant="outlined" />
                </settings-row>
                <div v-for="(value, key) of preset.values" :key="key">
                    <v-divider class="my-2" />
                    <settings-row :title="converNameObject(key)">
                        <v-checkbox v-model="value.bool" hide-details class="shrink mt-0" />
                        <v-text-field
                            v-model="value.value"
                            hide-details="auto"
                            :rules="[rules.invalid]"
                            type="number"
                            suffix="°C"
                            density="compact"
                            variant="outlined"
                            hide-spin-buttons
                            @focus="($event.target as HTMLInputElement)?.select()" />
                    </settings-row>
                </div>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.PresetsTab.CustomGCode')">
                    <v-textarea v-model="preset.gcode" variant="outlined" hide-details />
                </settings-row>
            </v-card-text>
            <v-card-actions class="d-flex justify-end">
                <v-btn variant="text" @click="closeForm">
                    {{ t('Buttons.Cancel') }}
                </v-btn>
                <v-btn color="primary" variant="text" type="submit" :disabled="!valid">
                    {{ storeButtonText }}
                </v-btn>
            </v-card-actions>
        </v-form>
    </v-card>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import type { GuiPresetsStatePreset } from '@/store/gui/presets/types'
import { convertName } from '@/plugins/helpers'
import { usePrinterStore } from '@/store/printer'
import { useGuiPresetsStore } from '@/store/gui/presets'

const props = defineProps<{
    preset: GuiPresetsStatePreset
}>()

const emit = defineEmits<{
    close: []
}>()

const { t } = useI18n()
const printerStore = usePrinterStore()
const guiPresetsStore = useGuiPresetsStore()

const valid = ref(false)
const boolInvalidMin = ref(false)

const rules = {
    required: (value: string) => value !== '' || t('Settings.PresetsTab.ErrorNameRequired'),
    unique: (value: string) => !existsPresetName(value) || t('Settings.PresetsTab.ErrorNameNotUnique'),
    invalid: (value: string) => parseFloat(value) >= 0 || t('Settings.PresetsTab.ErrorInvalidValue'),
}

const title = computed(() => (props.preset.id === null ? t('Settings.PresetsTab.CreateHeadline') : t('Settings.PresetsTab.EditHeadline')))

const storeButtonText = computed(() => (props.preset.id === null ? t('Settings.PresetsTab.StoreButton') : t('Settings.PresetsTab.UpdateButton')))

const presets = computed(() => guiPresetsStore.getPresets ?? [])

const available_heaters = computed(() => [...(printerStore.heaters?.available_heaters ?? [])].sort())

const available_temperature_fans = computed(() =>
    [...(printerStore.heaters?.available_sensors ?? [])].filter((name: string) => name.startsWith('temperature_fan ')).sort()
)

onMounted(() => {
    const presetValues = Object.keys(props.preset.values)

    // add missing heaters to preset
    available_heaters.value
        .filter((name: string) => !presetValues.includes(name))
        .forEach((name: string) => {
            props.preset.values[name] = {
                bool: false,
                type: 'heater',
                value: 0,
            }
        })

    // add missing temperature_fans to preset
    available_temperature_fans.value
        .filter((name: string) => !presetValues.includes(name))
        .forEach((name: string) => {
            props.preset.values[name] = {
                bool: false,
                type: 'temperature_fan',
                value: 0,
            }
        })

    // remove unused values from preset
    presetValues
        .filter((name: string) => !available_heaters.value.includes(name) && !available_temperature_fans.value.includes(name))
        .forEach((name) => {
            delete props.preset.values[name]
        })
})

function existsPresetName(name: string) {
    return presets.value.findIndex((preset: GuiPresetsStatePreset) => preset.name === name && preset.id !== props.preset.id) !== -1
}

function converNameObject(name: string) {
    return convertName(name.replace('temperature_fan ', ''))
}

function closeForm() {
    emit('close')
}

function savePreset() {
    let setValues = 0
    for (const key of Object.keys(props.preset.values)) {
        if (props.preset.values[key].bool) setValues++
    }
    if (props.preset.gcode.length) setValues++

    // stop here, when no values are set
    if (setValues === 0) {
        boolInvalidMin.value = true
        return
    }

    // create new preset, if id === null
    if (props.preset.id === null) {
        guiPresetsStore.store({ values: props.preset })
        closeForm()
        return
    }

    // update existing preset
    guiPresetsStore.update({ id: props.preset.id ?? '', values: props.preset })
    closeForm()
}
</script>
