<template>
    <tr v-longpress:600="openContextMenu" @contextmenu.prevent="openContextMenu($event)">
        <td class="icon">
            <v-icon :color="iconColor" :class="iconClass" tabindex="-1" @click="openEditDialog">
                {{ icon }}
            </v-icon>
        </td>
        <td class="name">
            <span class="cursor-pointer" @click="openEditDialog">{{ formatName }}</span>
        </td>
        <td v-if="!isResponsiveMobile" class="state">
            <v-tooltip v-if="state !== null" location="top">
                <template #activator="{ props: activatorProps }">
                    <div v-bind="activatorProps">{{ formatState }}</div>
                </template>
                <span>{{ t('Panels.TemperaturePanel.Avg') }}: {{ avgState }} %</span>
            </v-tooltip>
        </td>
        <td class="current">
            <v-tooltip location="top" :disabled="!(measured_min_temp !== null || measured_max_temp !== null)">
                <template #activator="{ props: activatorProps }">
                    <span style="cursor: default" v-bind="activatorProps">
                        {{ formatTemperature }}
                    </span>
                </template>
                <span>
                    {{ t('Panels.TemperaturePanel.Max') }}: {{ measured_max_temp }}°C
                    <br />
                    {{ t('Panels.TemperaturePanel.Min') }}: {{ measured_min_temp }}°C
                </span>
            </v-tooltip>
            <div v-if="rpm !== null">
                <small :class="rpmClass">{{ rpm }} RPM</small>
            </div>
            <temperature-panel-list-item-additional-sensor v-if="additionalSensorName" :object-name="objectName" :additional-object-name="additionalSensorName" />
        </td>
        <td class="target">
            <temperature-input v-if="command !== null" :name="name" :target="target" :presets="presets" :min_temp="min_temp" :max_temp="max_temp" :command="command" :input-digits="inputDigits" :attribute-name="commandAttributeName" />
        </td>
        <temperature-panel-list-item-edit v-model="showEditDialog" :object-name="objectName" :name="name" :format-name="formatName" :additional-sensor-name="additionalSensorName" :icon="icon" :color="color" />
        <v-menu v-model="showContextMenu" :target="[contextMenuX, contextMenuY]">
            <v-list>
                <v-list-item v-if="isHeater" :disabled="!isHeaterActive" @click="turnOffHeater">
                    <v-icon start>{{ mdiSnowflake }}</v-icon>
                    {{ t('Panels.TemperaturePanel.TurnHeaterOff') }}
                </v-list-item>
                <v-list-item @click="openEditDialog">
                    <v-icon start>{{ mdiCog }}</v-icon>
                    {{ t('Panels.TemperaturePanel.Settings') }}
                </v-list-item>
            </v-list>
        </v-menu>
    </tr>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LongpressEvent } from '@/directives/longpress'
import { convertName } from '@/plugins/helpers'
import { mdiCog, mdiFan, mdiFire, mdiMemory, mdiPrinter3dNozzle, mdiPrinter3dNozzleAlert, mdiRadiator, mdiRadiatorDisabled, mdiSnowflake, mdiThermometer } from '@mdi/js'
import { additionalSensors, opacityHeaterActive, opacityHeaterInactive } from '@/store/variables'
import { CLOSE_CONTEXT_MENU, on, off, emit } from '@/plugins/mainsail'
import TemperaturePanelListItemAdditionalSensor from '@/components/panels/Temperature/TemperaturePanelListItemAdditionalSensor.vue'
import TemperaturePanelListItemEdit from '@/components/panels/Temperature/TemperaturePanelListItemEdit.vue'
import TemperatureInput from '@/components/inputs/TemperatureInput.vue'
import { useGuiStore } from '@/store/gui'
import { useGuiPresetsStore } from '@/store/gui/presets'
import { usePrinterStore } from '@/store/printer'
import { usePrinterTempHistoryStore } from '@/store/printer/tempHistory'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const props = withDefaults(
    defineProps<{
        objectName: string
        isResponsiveMobile: boolean
        inputDigits?: number
    }>(),
    { inputDigits: 3 }
)

const { t } = useI18n()
const guiStore = useGuiStore()
const guiPresetsStore = useGuiPresetsStore()
const printerStore = usePrinterStore()
const printerTempHistoryStore = usePrinterTempHistoryStore()

const showEditDialog = ref(false)
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

const printerObject = computed(() => {
    if (!(props.objectName in printerStore)) return {}

    return printerStore[props.objectName]
})

const printerObjectSettings = computed(() => {
    // convert objectName to lowercase, because klipper only user lowercase in configfile.settings
    const lowerCaseObjectName = props.objectName.toLowerCase()

    if (!(lowerCaseObjectName in (printerStore.configfile?.settings ?? {}))) return {}

    return printerStore.configfile?.settings[lowerCaseObjectName]
})

const name = computed(() => {
    const splits = props.objectName.split(' ')
    if (splits.length === 1) return props.objectName

    return splits[1]
})

const formatName = computed(() => convertName(name.value))

const isFan = computed(() => props.objectName.startsWith('temperature_fan'))

const temperature = computed<number | null>(() => printerObject.value?.temperature ?? null)

const target = computed(() => printerObject.value?.target ?? null)

const icon = computed(() => {
    // handle extruder icons
    if (props.objectName.startsWith('extruder')) {
        if (printerObject.value.can_extrude ?? false) return mdiPrinter3dNozzle

        return mdiPrinter3dNozzleAlert
    }

    // show heater_bed icon
    if (props.objectName === 'heater_bed') {
        if ((temperature.value !== null && temperature.value > 50) || (target.value && temperature.value && temperature.value > target.value - 5)) return mdiRadiator

        return mdiRadiatorDisabled
    }

    // show heater_generic icon
    if (props.objectName.startsWith('heater_generic')) return mdiFire

    // show heater_generic icon
    if (props.objectName.startsWith('tmc')) return mdiMemory

    // show fan icon, if it is a fan
    if (isFan.value) return mdiFan

    return mdiThermometer
})

const color = computed(() => printerTempHistoryStore.getDatasetColor(props.objectName) ?? '#FFFFFF')

const iconColor = computed(() => {
    // set icon color to active, if no target exists (temperature_sensors) or a heater is active
    if (target.value === null || target.value > 0) return `${color.value}${opacityHeaterActive}`

    return `${color.value}${opacityHeaterInactive}`
})

const state = computed<number | null>(() => printerObject.value.power ?? printerObject.value.speed ?? null)

const iconClass = computed(() => {
    const classes = ['_no-focus-style', 'cursor-pointer']

    // add icon animation, when it is a fan and state > 0
    if (isFan.value) {
        const disableFanAnimation = guiStore.uiSettings.disableFanAnimation ?? false

        if (!disableFanAnimation && (state.value ?? 0) > 0) classes.push('icon-rotate')
    }

    return classes
})

const formatState = computed(() => {
    if (state.value === null) return null
    if (target.value === 0 && state.value === 0) return 'off'

    return `${Math.round(state.value * 100)} %`
})

const avgPower = computed(() => printerTempHistoryStore.getAvgPower(name.value) ?? 0)

const avgSpeed = computed(() => printerTempHistoryStore.getAvgSpeed(name.value) ?? 0)

const avgState = computed(() => {
    if ('power' in printerObject.value) return Math.round(avgPower.value)
    if ('speed' in printerObject.value) return Math.round(avgSpeed.value)

    return null
})

const formatTemperature = computed(() => `${temperature.value?.toFixed(1) ?? '--'}°C`)

const min_temp = computed(() => parseInt(printerObjectSettings.value.min_temp ?? 0))

const max_temp = computed(() => parseInt(printerObjectSettings.value.max_temp ?? 0))

const measured_min_temp = computed(() => printerObject.value?.measured_min_temp?.toFixed(1) ?? null)

const measured_max_temp = computed(() => printerObject.value?.measured_max_temp?.toFixed(1) ?? null)

const additionalSensorName = computed(() => {
    if (props.objectName === 'z_thermal_adjust') return 'z_thermal_adjust'

    const additionalSensorName = additionalSensors.find((sensorName) => {
        const objectName = `${sensorName} ${name.value}`

        if (objectName in printerStore) return true
    })

    if (!additionalSensorName) return null

    return `${additionalSensorName} ${name.value}`
})

const rpm = computed(() => {
    const rpm = printerObject.value.rpm ?? null

    // return null when rpm doesn't exist
    if (rpm === null) return null

    return parseInt(printerObject.value.rpm)
})

const rpmClass = computed(() => {
    if (rpm.value === 0 && (printerObject.value.speed ?? 0) > 0) return 'text-red'

    return ''
})

const presets = computed(() => guiPresetsStore.getPresetsFromHeater({ name: props.objectName }) ?? [])

const command = computed(() => {
    if (props.objectName.startsWith('temperature_fan')) return 'SET_TEMPERATURE_FAN_TARGET'
    if (props.objectName.startsWith('extruder') || props.objectName.startsWith('heater_')) return 'SET_HEATER_TEMPERATURE'

    return null
})

const commandAttributeName = computed(() => {
    if (command.value === 'SET_HEATER_TEMPERATURE') return 'HEATER'
    if (command.value === 'SET_TEMPERATURE_FAN_TARGET') return 'TEMPERATURE_FAN'

    return ''
})

const availableHeaters = computed(() => printerStore.heaters?.available_heaters ?? [])

const isHeater = computed(() => availableHeaters.value.includes(props.objectName))

const isHeaterActive = computed(() => target.value > 0)

function openContextMenu(event: MouseEvent | LongpressEvent) {
    emit(CLOSE_CONTEXT_MENU)

    showContextMenu.value = true
    contextMenuX.value = event?.clientX || event?.pageX || window.screenX / 2
    contextMenuY.value = event?.clientY || event?.pageY || window.screenY / 2
}

function closeContextMenu() {
    showContextMenu.value = false
}

function openEditDialog() {
    closeContextMenu()
    showEditDialog.value = true
}

function turnOffHeater() {
    const gcode = `SET_HEATER_TEMPERATURE HEATER=${name.value} TARGET=0`
    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode })
}

onMounted(() => {
    on(CLOSE_CONTEXT_MENU, closeContextMenu)
})

onBeforeUnmount(() => {
    off(CLOSE_CONTEXT_MENU, closeContextMenu)
})
</script>

<style scoped>
:deep(.v-icon._no-focus-style:focus::after) {
    opacity: 0 !important;
}

:deep(.cursor-pointer) {
    cursor: pointer;
}
</style>
