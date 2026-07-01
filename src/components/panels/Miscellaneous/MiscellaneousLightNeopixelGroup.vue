<template>
    <v-list-subheader class="_light-subheader">
        <v-icon size="small" start @click="toggle">
            {{ isOn ? mdiLightbulbOnOutline : mdiLightbulbOutline }}
        </v-icon>
        <span>{{ group.name }}</span>
        <v-spacer />
        <miscellaneous-light-neopixel-state :type="type" :name="name" :index="group.start" @click-button="showDialog = true" />
        <miscellaneous-light-neopixel-dialog v-model="showDialog" :type="type" :name="name" :index="group.start" @update-color="sendCommand" />
    </v-list-subheader>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mdiLightbulbOutline, mdiLightbulbOnOutline } from '@mdi/js'
import type { GuiMiscellaneousStateEntryLightgroup } from '@/store/gui/miscellaneous/types'
import MiscellaneousLightNeopixelState from '@/components/panels/Miscellaneous/MiscellaneousLightNeopixelState.vue'
import MiscellaneousLightNeopixelDialog from '@/components/dialogs/MiscellaneousLightNeopixelDialog.vue'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const props = defineProps<{
    type: string
    name: string
    group: GuiMiscellaneousStateEntryLightgroup & { id?: string }
}>()

const printerStore = usePrinterStore()

const showDialog = ref(false)

const settings = computed(() => {
    const settings = printerStore.configfile.settings ?? {}

    const key = `${props.type.toLowerCase()} ${props.name.toLowerCase()}`
    return settings[key] ?? {}
})

const colorOrder = computed(() => {
    const colorOrder = settings.value.color_order ?? []

    return colorOrder[props.group.start - 1] ?? colorOrder[0] ?? ''
})

const printerObject = computed(() => {
    const key = `${props.type} ${props.name}`

    return printerStore[key] ?? {}
})

const colorData = computed(() => {
    const colorData = printerObject.value.color_data ?? []

    return colorData[props.group.start - 1] ?? []
})

const isOn = computed(() => {
    const red = colorData.value[0] ?? 0
    const green = colorData.value[1] ?? 0
    const blue = colorData.value[2] ?? 0
    const white = colorData.value[3] ?? 0

    const sum = red + green + blue + white

    return sum > 0
})

function toggle() {
    if (isOn.value) {
        sendCommand(0, 0, 0, 0)
        return
    }

    // only turn on white LEDs if its exists
    if (colorOrder.value.includes('W')) {
        sendCommand(0, 0, 0, 1)
        return
    }

    sendCommand(1, 1, 1, 1)
}

function sendCommand(red: number, green: number, blue: number, white: number) {
    const commandParts = []
    commandParts.push('SET_LED')
    commandParts.push(`LED="${props.name}"`)

    if (colorOrder.value.includes('R')) commandParts.push(`RED=${red}`)
    if (colorOrder.value.includes('G')) commandParts.push(`GREEN=${green}`)
    if (colorOrder.value.includes('B')) commandParts.push(`BLUE=${blue}`)
    if (colorOrder.value.includes('W')) commandParts.push(`WHITE=${white}`)

    commandParts.push('SYNC=0')

    const lines = []
    const command = commandParts.join(' ')
    for (let i = props.group.start; i <= props.group.end; i++) {
        lines.push(`${command} INDEX=${i}`)
    }

    lines[lines.length - 1] += ' TRANSMIT=1'

    const gcode = lines.join('\n')
    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode })
}
</script>

<style scoped>
._light-subheader {
    height: auto;
}
</style>
