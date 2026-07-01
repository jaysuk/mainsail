<template>
    <div v-if="isVisible">
        <v-tooltip location="top" :disabled="disableTooltip">
            <template #activator="{ props: activatorProps }">
                <span :style="cssStyle" v-bind="activatorProps">{{ formatValue }}</span>
            </template>
            <span>
                {{ t('Panels.TemperaturePanel.Max') }}: {{ formatValue_max }}
                <br />
                {{ t('Panels.TemperaturePanel.Min') }}: {{ formatValue_min }}
            </span>
        </v-tooltip>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGuiStore } from '@/store/gui'

const props = withDefaults(
    defineProps<{
        printerObject: { [key: string]: number }
        objectName: string
        keyName: string
        small?: boolean
    }>(),
    { small: true }
)

const { t } = useI18n()
const guiStore = useGuiStore()

const cssStyle = computed(() => {
    const style = { cursor: 'default', fontSize: '1em' }
    if (props.small) style.fontSize = '0.8em'

    return style
})

const value = computed(() => {
    const value = props.printerObject[props.keyName] ?? null
    if (isNaN(value)) return null

    return value
})

const intake_value = computed<number | null>(() => {
    const name = `intake_${props.keyName}`

    return props.printerObject[name] ?? null
})

const intake_value_min = computed<number | null>(() => {
    const name = `intake_${props.keyName}_min`

    return props.printerObject[name] ?? null
})

const intake_value_max = computed<number | null>(() => {
    const name = `intake_${props.keyName}_max`

    return props.printerObject[name] ?? null
})

const exhaust_value = computed<number | null>(() => {
    const name = `exhaust_${props.keyName}`

    return props.printerObject[name] ?? null
})

const exhaust_value_min = computed<number | null>(() => {
    const name = `exhaust_${props.keyName}_min`

    return props.printerObject[name] ?? null
})

const exhaust_value_max = computed<number | null>(() => {
    const name = `exhaust_${props.keyName}_max`

    return props.printerObject[name] ?? null
})

const unit = computed<string | null>(() => {
    switch (props.keyName) {
        case 'temperature':
            return '°C'
        case 'pressure':
            return 'hPa'
        case 'humidity':
            return '%'
    }

    return null
})

const digits = computed(() => (['gas', 'pressure'].includes(props.keyName) ? 0 : 1))

function getFormatedValue(intake: number | null, exhaust: number | null): string {
    let intake_value_ = intake?.toFixed(digits.value)
    let exhaust_value_ = exhaust?.toFixed(digits.value)
    if (intake_value.value === null) intake_value_ = '--'
    if (exhaust_value.value === null) exhaust_value_ = '--'

    // return only the value, if unit is null
    if (unit.value === null) return `${intake_value_} > ${exhaust_value_}`

    return `${intake_value_} ${unit.value} > ${exhaust_value_} ${unit.value}`
}

const formatValue = computed(() => getFormatedValue(intake_value.value, exhaust_value.value))

const formatValue_min = computed(() => getFormatedValue(intake_value_min.value, exhaust_value_min.value))

const formatValue_max = computed(() => getFormatedValue(intake_value_max.value, exhaust_value_max.value))

const disableTooltip = computed(() => intake_value_min.value === null || exhaust_value_min.value === null || intake_value_max.value === null || exhaust_value_max.value === null)

const guiSetting = computed(() =>
    guiStore.getDatasetAdditionalSensorValue({
        name: props.objectName,
        sensor: props.keyName,
    })
)

const isVisible = computed(() => {
    if (intake_value.value === null && exhaust_value.value === null) return false

    return guiSetting.value
})
</script>
