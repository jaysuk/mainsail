<template>
    <tr>
        <td class="icon">
            <v-icon :color="iconColor" :class="iconClass" tabindex="-1" @click="showEditDialog = true">
                {{ mdiFan }}
            </v-icon>
        </td>
        <td class="name">
            <span class="cursor-pointer" @click="showEditDialog = true">{{ formatName }}</span>
        </td>
        <td class="text-no-wrap text-center" colspan="3">
            <temperature-panel-list-item-nevermore-value :printer-object="printerObject" :object-name="objectName" :small="false" key-name="gas" />
            <temperature-panel-list-item-nevermore-value v-for="keyName in nevermoreValues" :key="keyName" :printer-object="printerObject" :object-name="objectName" :key-name="keyName" />
            <div v-if="rpm !== null">
                <small :class="rpmClass">{{ rpm }} RPM</small>
            </div>
        </td>
        <temperature-panel-list-item-edit v-model="showEditDialog" :object-name="objectName" :name="name" :format-name="formatName" additional-sensor-name="nevermore" :icon="mdiFan" :color="color" />
    </tr>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { convertName } from '@/plugins/helpers'
import { mdiFan } from '@mdi/js'
import { opacityHeaterActive, opacityHeaterInactive } from '@/store/variables'
import TemperaturePanelListItemNevermoreValue from '@/components/panels/Temperature/TemperaturePanelListItemNevermoreValue.vue'
import TemperaturePanelListItemEdit from '@/components/panels/Temperature/TemperaturePanelListItemEdit.vue'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'

const props = defineProps<{
    objectName: string
    isResponsiveMobile: boolean
}>()

const printerStore = usePrinterStore()
const guiStore = useGuiStore()

const showEditDialog = ref(false)
const nevermoreValues = ['temperature', 'pressure', 'humidity']

const printerObject = computed(() => printerStore[props.objectName] ?? {})

const name = computed(() => {
    const splits = props.objectName.split(' ')
    return splits.length === 1 ? splits[0] : splits[1]
})

const formatName = computed(() => convertName(name.value))

const color = computed(() => (guiStore.view?.tempchart?.datasetSettings?.[props.objectName]?.color as string | undefined) ?? '#ffffff')

const state = computed<number | null>(() => printerObject.value.speed ?? null)

const iconColor = computed(() => {
    // set icon color to active, if no target exists (temperature_sensors) or a heater is active
    if (state.value === null || state.value > 0) return `${color.value}${opacityHeaterActive}`

    return `${color.value}${opacityHeaterInactive}`
})

const iconClass = computed(() => {
    const classes = ['_no-focus-style', 'cursor-pointer']

    // add icon animation, when it is a fan and state > 0
    const disableFanAnimation = guiStore.uiSettings.disableFanAnimation ?? false

    if (!disableFanAnimation && (state.value ?? 0) > 0) classes.push('icon-rotate')

    return classes
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
</script>

<style scoped>
:deep(.v-icon._no-focus-style:focus::after) {
    opacity: 0 !important;
}

:deep(.cursor-pointer) {
    cursor: pointer;
}
</style>
