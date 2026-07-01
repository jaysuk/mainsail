<template>
    <v-btn :disabled="printerIsPrintingOnly" density="compact" class="flex-grow-1 px-0" :style="buttonStyle" @click="changeTool">
        <span v-if="color != null" class="_extruderColorState mr-1" :style="dotStyle" />
        {{ name.toUpperCase() }}
    </v-btn>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from 'vuetify'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import { useBase } from '@/composables/useBase'
import { useControl } from '@/composables/useControl'
import { usePrinterStore } from '@/store/printer'
import { useServerSpoolmanStore } from '@/store/server/spoolman'
import { useGuiStore } from '@/store/gui'

const props = defineProps<{ name: string }>()

const { printerIsPrintingOnly } = useBase()
const { homedAxes, doSend } = useControl()
const printerStore = usePrinterStore()
const serverSpoolmanStore = useServerSpoolmanStore()
const guiStore = useGuiStore()
const vuetifyTheme = useTheme()

const macro = computed(() => {
    const objectName = Object.keys(printerStore).find((key) => key.toLowerCase() === `gcode_macro ${props.name?.toLowerCase()}`)
    if (!objectName) return undefined

    return printerStore[objectName] ?? {}
})

const active = computed(() => macro.value?.active ?? false)

const color = computed(() => {
    if (spool.value) {
        return spool.value.filament?.color_hex ?? '000000'
    }

    const color = macro.value?.color ?? macro.value?.colour ?? null
    if (color === '' || color === 'undefined') return null

    return color
})

const spoolId = computed(() => macro.value?.spool_id ?? null)

const spool = computed(() => {
    const spools = serverSpoolmanStore.spools ?? []

    return spools.find((spool: ServerSpoolmanStateSpool) => spool.id === spoolId.value) ?? null
})

const primaryColor = computed<string>(() => guiStore.uiSettings.primary)

const primaryTextColor = computed<string>(() => {
    const splits = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(primaryColor.value)
    if (splits) {
        const r = parseInt(splits[1], 16) * 0.2126
        const g = parseInt(splits[2], 16) * 0.7152
        const b = parseInt(splits[3], 16) * 0.0722
        const perceivedLightness = (r + g + b) / 255

        return perceivedLightness > 0.7 ? '#222' : '#fff'
    }

    return '#ffffff'
})

const warningColor = computed<string>(() => vuetifyTheme.current.value.colors?.warning?.toString() ?? '#ff8300')

const buttonStyle = computed(() => {
    let backgroundColor = ''
    if (active.value) {
        backgroundColor = homedAxes.value.includes('xyz') ? primaryColor.value : warningColor.value
    }

    const textColor = active.value ? primaryTextColor.value : ''

    return {
        color: textColor,
        'background-color': backgroundColor,
    }
})

const dotStyle = computed(() => ({
    'border-color': active.value ? primaryTextColor.value : '',
    'background-color': '#' + color.value,
}))

function changeTool() {
    doSend(props.name.toUpperCase())
}
</script>

<style lang="scss" scoped>
._extruderColorState {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    border: 1px solid lightgray;
}
</style>
