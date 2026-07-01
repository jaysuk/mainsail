<template>
    <div>
        <div ref="picker"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import iro from '@jaames/iro'
import type { IroColor } from '@irojs/iro-core'
import type { ColorPickerProps, IroColorPicker as IroCP } from '@jaames/iro/dist/ColorPicker.d'

const props = withDefaults(
    defineProps<{
        color?: IroColor | string
        options?: ColorPickerProps
    }>(),
    {
        color: '#ffffff',
        options: () => ({}) as ColorPickerProps,
    }
)

const emit = defineEmits<{ change: [IroColor]; 'update:color': [IroColor] }>()

const picker = ref<HTMLElement | null>(null)
let colorPicker: IroCP | null = null

const internalOptions = computed<ColorPickerProps>(() => ({
    ...props.options,
    color: props.color,
    borderWidth: 2,
    sliderSize: 16,
}))

function emitColorChange(color: IroColor) {
    emit('change', color)
    emit('update:color', color)
}

function onColorChange(color: IroColor) {
    emitColorChange(color)
}

watch(
    () => props.color,
    (value) => {
        const rgbString = typeof value === 'string' ? value : value.rgbString
        if (colorPicker && colorPicker.color.rgbString !== rgbString) {
            colorPicker.color.rgbString = rgbString
        }
    },
    { deep: true }
)

onMounted(() => {
    if (!picker.value) return
    colorPicker = iro.ColorPicker(picker.value, internalOptions.value)
    colorPicker.on('color:change', onColorChange)
})

onBeforeUnmount(() => {
    colorPicker?.off('color:change', onColorChange)
})
</script>

<style scoped></style>
