<template>
    <v-row class="my-0">
        <v-col class="py-2">
            <v-list-subheader class="_light-subheader">
                <v-icon v-if="groups.length === 0" size="small" start @click="toggle">
                    {{ isOn ? mdiLightbulbOnOutline : mdiLightbulbOutline }}
                </v-icon>
                <span>{{ outputName }}</span>
                <v-spacer />
                <miscellaneous-light-neopixel-state v-if="groups.length === 0" :type="type" :name="name" :index="1" @click-button="showDialog = true" />
                <miscellaneous-light-neopixel-dialog v-model="showDialog" :type="type" :name="name" @update-color="sendCommand" />
            </v-list-subheader>
            <miscellaneous-light-neopixel-group v-for="group in groups" :key="group.id" :type="type" :name="name" :group="group" />
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mdiLightbulbOutline, mdiLightbulbOnOutline } from '@mdi/js'
import { convertName } from '@/plugins/helpers'
import MiscellaneousLightNeopixelGroup from '@/components/panels/Miscellaneous/MiscellaneousLightNeopixelGroup.vue'
import MiscellaneousLightNeopixelState from '@/components/panels/Miscellaneous/MiscellaneousLightNeopixelState.vue'
import MiscellaneousLightNeopixelDialog from '@/components/dialogs/MiscellaneousLightNeopixelDialog.vue'
import { usePrinterStore } from '@/store/printer'
import { useGuiMiscellaneousStore } from '@/store/gui/miscellaneous'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const props = defineProps<{
    type: string
    name: string
}>()

const printerStore = usePrinterStore()
const guiMiscellaneousStore = useGuiMiscellaneousStore()

const showDialog = ref(false)

const outputName = computed(() => convertName(props.name))

const guiEntry = computed(() => guiMiscellaneousStore.getEntry({ type: props.type, name: props.name }) ?? null)

const groups = computed(() => {
    if (!guiEntry.value?.lightgroups) return []

    return Object.entries(guiEntry.value.lightgroups).map(([key, value]) => {
        return { ...value, id: key }
    })
})

const settings = computed(() => {
    const settings = printerStore.configfile.settings ?? {}

    const key = `${props.type.toLowerCase()} ${props.name.toLowerCase()}`
    return settings[key] ?? {}
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

const printerObject = computed(() => {
    const key = `${props.type} ${props.name}`

    return printerStore[key] ?? {}
})

const colorData = computed(() => printerObject.value.color_data ?? [])

const isOn = computed(() => {
    const data = colorData.value[0] ?? []

    const red = data[0] ?? 0
    const green = data[1] ?? 0
    const blue = data[2] ?? 0
    const white = data[3] ?? 0

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
    commandParts.push('TRANSMIT=1')

    const gcode = commandParts.join(' ')
    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode })
}
</script>

<style scoped>
._light-subheader {
    height: auto;
}
</style>
