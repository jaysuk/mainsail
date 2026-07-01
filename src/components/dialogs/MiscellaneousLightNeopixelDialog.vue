<template>
    <v-dialog v-model="showDialog" width="400">
        <panel :title="outputName" :icon="mdiLightbulbOutline" card-class="miscellaneous-light-neopixel-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="closePrompt">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>
                <template v-if="presets.length">
                    <v-row>
                        <v-col class="light-presets-container d-flex flex-wrap flex-row justify-center">
                            <miscellaneous-light-neopixel-dialog-preset v-for="preset in presets" :key="preset.id" :preset="preset" @update-color="updateColor" />
                        </v-col>
                    </v-row>
                    <v-divider class="my-3" />
                </template>
                <v-row>
                    <v-col class="text-center">
                        <color-picker :color="colorRGB" :options="colorPickerOptions" @update:color="onColorRGBChanged" />
                        <color-picker v-if="colorOrder.includes('W')" :color="colorRGBW" :options="colorPickerWhiteOptions" class="mt-3" @update:color="onColorWhiteChanged" />
                    </v-col>
                    <v-col>
                        <v-row v-if="colorOrder.includes('R')">
                            <v-col>
                                <number-input
                                    :label="t('Panels.MiscellaneousPanel.Light.Red')"
                                    param="red"
                                    :target="targetRed"
                                    :default-value="defaultRed"
                                    :min="0"
                                    :max="255"
                                    :dec="1"
                                    :step="1"
                                    :output-error-msg="true"
                                    :has-spinner="true"
                                    @submit="onColorInput" />
                            </v-col>
                        </v-row>
                        <v-row v-if="colorOrder.includes('G')">
                            <v-col>
                                <number-input :label="t('Panels.MiscellaneousPanel.Light.Green')" param="green" :target="targetGreen" :default-value="defaultGreen" :min="0" :max="255" :dec="1" :step="1" :has-spinner="true" @submit="onColorInput" />
                            </v-col>
                        </v-row>
                        <v-row v-if="colorOrder.includes('B')">
                            <v-col>
                                <number-input :label="t('Panels.MiscellaneousPanel.Light.Blue')" param="blue" :target="targetBlue" :default-value="defaultBlue" :min="0" :max="255" :dec="1" :step="1" :has-spinner="true" @submit="onColorInput" />
                            </v-col>
                        </v-row>
                        <v-row v-if="colorOrder.includes('W')">
                            <v-col>
                                <number-input :label="t('Panels.MiscellaneousPanel.Light.White')" param="white" :target="targetWhite" :default-value="defaultWhite" :min="0" :max="255" :dec="1" :step="1" :has-spinner="true" @submit="onColorInput" />
                            </v-col>
                        </v-row>
                    </v-col>
                </v-row>
            </v-card-text>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiCloseThick, mdiLightbulbOutline } from '@mdi/js'
import Panel from '@/components/ui/Panel.vue'
import { caseInsensitiveSort, convertName } from '@/plugins/helpers'
import type { ColorPickerProps } from '@jaames/iro/dist/ColorPicker.d'
import iro from '@jaames/iro'
import type { IroColor } from '@irojs/iro-core'
import type { GuiMiscellaneousStateEntry } from '@/store/gui/miscellaneous/types'
import MiscellaneousLightNeopixelDialogPreset from '@/components/dialogs/MiscellaneousLightNeopixelDialogPreset.vue'
import ColorPicker from '@/components/inputs/ColorPicker.vue'
import { usePrinterStore } from '@/store/printer'
import { useGuiMiscellaneousStore } from '@/store/gui/miscellaneous'

interface ColorData {
    red: number
    green: number
    blue: number
    white: number

    [key: string]: number
}

const props = withDefaults(
    defineProps<{
        type: string
        name: string
        group?: GuiMiscellaneousStateEntry
        index?: number
    }>(),
    {
        index: 1,
    }
)

const showDialog = defineModel<boolean>({ required: true })

const emit = defineEmits<{
    'update-color': [red: number, green: number, blue: number, white: number]
}>()

const { t } = useI18n()
const printerStore = usePrinterStore()
const guiMiscellaneousStore = useGuiMiscellaneousStore()

const outputName = computed(() => convertName(props.name))

const settings = computed(() => {
    const settings = printerStore.configfile.settings ?? {}

    const key = `${props.type.toLowerCase()} ${props.name.toLowerCase()}`
    return settings[key] ?? {}
})

const guiEntry = computed(() => {
    const entries = (guiMiscellaneousStore.entries ?? {}) as Record<string, GuiMiscellaneousStateEntry>

    const result = Object.entries(entries).find(([, value]) => {
        return value.type === props.type && value.name === props.name
    })

    return result ? result[1] : null
})

const presets = computed(() => {
    if (!guiEntry.value?.presets) return []

    const presets = Object.entries(guiEntry.value.presets).map(([key, value]) => {
        return { ...value, id: key }
    })

    return caseInsensitiveSort(presets, 'name')
})

const colorOrder = computed(() => {
    if (props.type !== 'led') {
        const colorOrder = settings.value.color_order ?? []

        return colorOrder[0] ?? ''
    }

    const pins = ['red_pin', 'green_pin', 'blue_pin', 'white_pin']
    let colorOrder = ''
    pins.forEach((pin) => {
        if (pin in settings.value) colorOrder += pin.substring(0, 1).toUpperCase()
    })

    return colorOrder
})

const defaultRed = computed(() => Math.round((settings.value.initial_red ?? 0) * 255))

const defaultGreen = computed(() => Math.round((settings.value.initial_green ?? 0) * 255))

const defaultBlue = computed(() => Math.round((settings.value.initial_blue ?? 0) * 255))

const defaultWhite = computed(() => Math.round((settings.value.initial_white ?? 0) * 255))

const printerObject = computed(() => {
    const printer = printerStore as unknown as Record<string, any>

    return printer[`${props.type} ${props.name}`] ?? {}
})

const colorData = computed(() => printerObject.value.color_data ?? [])

const current = computed(() => {
    const data = colorData.value[props.index - 1] ?? []

    return {
        red: data[0] ?? null,
        green: data[1] ?? null,
        blue: data[2] ?? null,
        white: data[3] ?? null,
    }
})

const targetRed = computed(() => Math.round((current.value.red ?? 0) * 255))

const targetGreen = computed(() => Math.round((current.value.green ?? 0) * 255))

const targetBlue = computed(() => Math.round((current.value.blue ?? 0) * 255))

const targetWhite = computed(() => Math.round((current.value.white ?? 0) * 255))

const colorPickerOptions = computed(() => {
    const options: ColorPickerProps = {
        width: 200,
        margin: 15,
        layout: [],
    }
    const layout: ColorPickerProps['layout'] = []

    const existRed = colorOrder.value.includes('R')
    const existGreen = colorOrder.value.includes('G')
    const existBlue = colorOrder.value.includes('B')

    if (existRed && existGreen && existBlue) {
        options.layout = [
            {
                component: iro.ui.Wheel,
            },
            {
                component: iro.ui.Slider,
                options: {
                    sliderType: 'value',
                },
            },
        ]

        return options
    }

    if (existRed) {
        layout.push({
            component: iro.ui.Slider,
            options: {
                sliderType: 'red',
            },
        })
    }

    if (existGreen) {
        layout.push({
            component: iro.ui.Slider,
            options: {
                sliderType: 'green',
            },
        })
    }

    if (existBlue) {
        layout.push({
            component: iro.ui.Slider,
            options: {
                sliderType: 'blue',
            },
        })
    }

    options.layout = layout
    return options
})

const colorPickerWhiteOptions = computed<ColorPickerProps>(() => ({
    width: 200,
    margin: 15,
    layout: [
        {
            component: iro.ui.Slider,
            options: {
                sliderType: 'alpha',
            },
        },
    ],
}))

const colorRGB = computed(() => {
    const red = Math.round((current.value.red ?? 0) * 255)
    const green = Math.round((current.value.green ?? 0) * 255)
    const blue = Math.round((current.value.blue ?? 0) * 255)

    return `rgb(${red}, ${green}, ${blue})`
})

const colorRGBW = computed(() => `rgba(255, 255, 255, ${current.value.white ?? 0})`)

function updateColor(colorData: ColorData) {
    const red = Math.round((colorData.red / 255) * 100) / 100
    const green = Math.round((colorData.green / 255) * 100) / 100
    const blue = Math.round((colorData.blue / 255) * 100) / 100
    const white = Math.round((colorData.white / 255) * 100) / 100

    emit('update-color', red, green, blue, white)
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined
function onColorRGBChanged(value: IroColor) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        if (value.red === targetRed.value && value.green === targetGreen.value && value.blue === targetBlue.value) return

        const color: ColorData = {
            red: value.red,
            green: value.green,
            blue: value.blue,
            white: targetWhite.value,
        }

        updateColor(color)
    }, 500)
}

function onColorWhiteChanged(value: IroColor) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        if (value.alpha === targetWhite.value) return

        const color: ColorData = {
            red: targetRed.value,
            green: targetGreen.value,
            blue: targetBlue.value,
            white: Math.round(value.alpha * 255),
        }

        updateColor(color)
    }, 500)
}

function onColorInput(payload: { name: string; value: number }) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        const color: ColorData = {
            red: targetRed.value,
            green: targetGreen.value,
            blue: targetBlue.value,
            white: targetWhite.value,
        }

        // stop when the value is the same as the current value
        if (!(payload.name in color) || color[payload.name] === payload.value) return

        color[payload.name] = payload.value
        updateColor(color)
    }, 500)
}

function closePrompt() {
    showDialog.value = false
}
</script>

<style scoped>
.light-presets-container {
    gap: 6px;
}

.light-presets-container :deep(> div) {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    cursor: pointer;
}
</style>
