<template>
    <div>
        <v-card-text>
            <h3 class="text-h5 mb-3">{{ title }}</h3>
            <settings-row :title="t('Settings.MiscellaneousTab.Name')">
                <v-text-field v-model="presetname" hide-details="auto" :rules="[rules.required, rules.presetUnique]" density="compact" variant="outlined" />
            </settings-row>
            <v-divider class="my-2" />
            <settings-row :title="t('Settings.MiscellaneousTab.Color')">
                <v-row>
                    <v-col class="text-center">
                        <color-picker :color="colorRGB" :options="colorPickerOptions" @update:color="onColorRGBChanged" />
                        <color-picker v-if="existWhite" :color="colorRGBW" :options="colorPickerWhiteOptions" class="mt-3" @update:color="onColorWhiteChanged" />
                    </v-col>
                    <v-col>
                        <v-row v-if="existRed">
                            <v-col>
                                <number-input
                                    :label="t('Panels.MiscellaneousPanel.Light.Red')"
                                    param="red"
                                    :target="redInt"
                                    :min="0"
                                    :max="255"
                                    :dec="1"
                                    :step="1"
                                    :output-error-msg="true"
                                    :has-spinner="true"
                                    @submit="onColorInput" />
                            </v-col>
                        </v-row>
                        <v-row v-if="existGreen">
                            <v-col>
                                <number-input
                                    :label="t('Panels.MiscellaneousPanel.Light.Green')"
                                    param="green"
                                    :target="greenInt"
                                    :min="0"
                                    :max="255"
                                    :dec="1"
                                    :step="1"
                                    :has-spinner="true"
                                    @submit="onColorInput" />
                            </v-col>
                        </v-row>
                        <v-row v-if="existBlue">
                            <v-col>
                                <number-input
                                    :label="t('Panels.MiscellaneousPanel.Light.Blue')"
                                    param="blue"
                                    :target="blueInt"
                                    :min="0"
                                    :max="255"
                                    :dec="1"
                                    :step="1"
                                    :has-spinner="true"
                                    @submit="onColorInput" />
                            </v-col>
                        </v-row>
                        <v-row v-if="existWhite">
                            <v-col>
                                <number-input
                                    :label="t('Panels.MiscellaneousPanel.Light.White')"
                                    param="white"
                                    :target="whiteInt"
                                    :min="0"
                                    :max="255"
                                    :dec="1"
                                    :step="1"
                                    :has-spinner="true"
                                    @submit="onColorInput" />
                            </v-col>
                        </v-row>
                    </v-col>
                </v-row>
            </settings-row>
        </v-card-text>
        <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="close">{{ t('Buttons.Cancel') }}</v-btn>
            <v-btn v-if="presetId !== null" variant="text" color="primary" @click="updatePreset">
                {{ t('Settings.Update') }}
            </v-btn>
            <v-btn v-else variant="text" color="primary" @click="storePreset">{{ t('Settings.Store') }}</v-btn>
        </v-card-actions>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import iro from '@jaames/iro'
import type { IroColor } from '@irojs/iro-core'
import type { ColorPickerProps } from '@jaames/iro/dist/ColorPicker.d'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import ColorPicker from '@/components/inputs/ColorPicker.vue'
import NumberInput from '@/components/inputs/NumberInput.vue'
import { caseInsensitiveSort } from '@/plugins/helpers'
import { usePrinterStore } from '@/store/printer'
import { useGuiMiscellaneousStore } from '@/store/gui/miscellaneous'
import type { GuiMiscellaneousStateEntryPreset } from '@/store/gui/miscellaneous/types'

interface ColorData {
    red: number | null
    green: number | null
    blue: number | null
    white: number | null
    [key: string]: number | null
}

const props = withDefaults(
    defineProps<{
        type?: string | null
        name?: string | null
        presetId?: string | null
    }>(),
    { type: null, name: null, presetId: null }
)

const emit = defineEmits<{
    close: []
}>()

const { t } = useI18n()
const printerStore = usePrinterStore()
const guiMiscellaneousStore = useGuiMiscellaneousStore()

const presetname = ref('')
const red = ref<number | null>(null)
const green = ref<number | null>(null)
const blue = ref<number | null>(null)
const white = ref<number | null>(null)

const rules = {
    required: (value: string) => value !== '' || 'required',
    presetUnique: (value: string) => !existsPresetName(value) || 'Name already exists',
    min: (value: number) => value >= 0 || 'Must be minimum 0',
    max: (value: number) => value <= 255 || 'Must be smaller then 256',
}

const title = computed(() => (props.presetId ? t('Settings.MiscellaneousTab.EditPreset') : t('Settings.MiscellaneousTab.CreatePreset')))

const settings = computed(() => {
    if (!props.type || !props.name) return null

    const key = `${props.type.toLowerCase()} ${props.name.toLowerCase()}`
    return printerStore.configfile?.settings?.[key] ?? {}
})

const colorOrder = computed(() => {
    if (props.type?.toLowerCase() === 'led') {
        let colorOrder = ''
        if (settings.value && 'red_pin' in settings.value) colorOrder += 'R'
        if (settings.value && 'green_pin' in settings.value) colorOrder += 'G'
        if (settings.value && 'blue_pin' in settings.value) colorOrder += 'B'
        if (settings.value && 'white_pin' in settings.value) colorOrder += 'W'

        return colorOrder
    }

    if (Array.isArray(settings.value?.color_order)) {
        return settings.value.color_order[0] ?? ''
    }

    return settings.value?.color_order ?? ''
})

const existRed = computed(() => colorOrder.value.includes('R'))
const existGreen = computed(() => colorOrder.value.includes('G'))
const existBlue = computed(() => colorOrder.value.includes('B'))
const existWhite = computed(() => colorOrder.value.includes('W'))

const redInt = computed(() => Math.round(red.value ?? 0))
const greenInt = computed(() => Math.round(green.value ?? 0))
const blueInt = computed(() => Math.round(blue.value ?? 0))
const whiteInt = computed(() => Math.round(white.value ?? 0))

const colorRGB = computed(() => `rgb(${redInt.value}, ${greenInt.value}, ${blueInt.value})`)

const colorRGBW = computed(() => {
    const whiteAlpha = whiteInt.value / 255

    return `rgba(255, 255, 255, ${whiteAlpha})`
})

const entry = computed(() => guiMiscellaneousStore.getEntry({ type: props.type ?? '', name: props.name ?? '' }))

const presets = computed(() => {
    const presets = entry.value?.presets ?? {}

    const output: GuiMiscellaneousStateEntryPreset[] = Object.keys(presets).map((key) => ({
        ...presets[key],
        id: key,
    }))

    return caseInsensitiveSort(output, 'name')
})

const preset = computed(() => {
    if (!props.presetId) return null

    return presets.value.find((preset) => preset.id === props.presetId) ?? null
})

const colorPickerOptions = computed<ColorPickerProps>(() => {
    const options: ColorPickerProps = {
        width: 200,
        margin: 15,
        layout: [],
    }
    const layout: ColorPickerProps['layout'] = []

    if (existRed.value && existGreen.value && existBlue.value) {
        options.layout = [
            { component: iro.ui.Wheel },
            { component: iro.ui.Slider, options: { sliderType: 'value' } },
        ]

        return options
    }

    if (existRed.value) {
        layout.push({ component: iro.ui.Slider, options: { sliderType: 'red' } })
    }

    if (existGreen.value) {
        layout.push({ component: iro.ui.Slider, options: { sliderType: 'green' } })
    }

    if (existBlue.value) {
        layout.push({ component: iro.ui.Slider, options: { sliderType: 'blue' } })
    }

    options.layout = layout
    return options
})

const colorPickerWhiteOptions = computed<ColorPickerProps>(() => ({
    width: 200,
    margin: 15,
    layout: [{ component: iro.ui.Slider, options: { sliderType: 'alpha' } }],
}))

let rgbDebounceTimer: ReturnType<typeof setTimeout> | undefined
function onColorRGBChanged(payload: IroColor) {
    if (rgbDebounceTimer) clearTimeout(rgbDebounceTimer)
    rgbDebounceTimer = setTimeout(() => {
        colorChanged({
            red: payload.red,
            green: payload.green,
            blue: payload.blue,
            white: white.value,
        })
    }, 250)
}

let whiteDebounceTimer: ReturnType<typeof setTimeout> | undefined
function onColorWhiteChanged(payload: IroColor) {
    if (whiteDebounceTimer) clearTimeout(whiteDebounceTimer)
    whiteDebounceTimer = setTimeout(() => {
        colorChanged({
            red: red.value,
            green: green.value,
            blue: blue.value,
            white: payload.alpha * 255,
        })
    }, 250)
}

function onColorInput(payload: { name: string; value: number }) {
    const color: ColorData = {
        red: red.value,
        green: green.value,
        blue: blue.value,
        white: white.value,
    }

    color[payload.name] = payload.value

    colorChanged(color)
}

function colorChanged(color: ColorData) {
    red.value = color.red
    green.value = color.green
    blue.value = color.blue
    white.value = color.white
}

watch(
    preset,
    () => {
        presetname.value = preset.value?.name ?? ''
        red.value = preset.value?.red ?? null
        green.value = preset.value?.green ?? null
        blue.value = preset.value?.blue ?? null
        white.value = preset.value?.white ?? null
    },
    { immediate: true }
)

function close() {
    emit('close')
}

function storePreset() {
    guiMiscellaneousStore.storePreset({
        type: props.type ?? '',
        name: props.name ?? '',
        preset: {
            name: presetname.value,
            red: red.value !== null ? parseInt(red.value.toString(), 10) : 0,
            green: green.value !== null ? parseInt(green.value.toString(), 10) : 0,
            blue: blue.value !== null ? parseInt(blue.value.toString(), 10) : 0,
            white: white.value !== null ? parseInt(white.value.toString(), 10) : 0,
        },
    })

    close()
}

function updatePreset() {
    guiMiscellaneousStore.updatePreset({
        type: props.type ?? '',
        name: props.name ?? '',
        presetId: props.presetId ?? '',
        preset: {
            name: presetname.value,
            red: red.value !== null ? parseInt(red.value.toString(), 10) : 0,
            green: green.value !== null ? parseInt(green.value.toString(), 10) : 0,
            blue: blue.value !== null ? parseInt(blue.value.toString(), 10) : 0,
            white: white.value !== null ? parseInt(white.value.toString(), 10) : 0,
        },
    })

    close()
}

function existsPresetName(name: string) {
    return presets.value.findIndex((preset) => preset.name === name && preset.id !== props.presetId) >= 0
}
</script>
