<template>
    <div v-if="isVisible">
        <small>{{ formatValue }}</small>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGuiStore } from '@/store/gui'

const props = defineProps<{
    printerObject: { [key: string]: number }
    objectName: string
    sensorType: string
    keyName: string
}>()

const guiStore = useGuiStore()

const value = computed(() => {
    const value = props.printerObject[props.keyName] ?? null
    if (isNaN(value)) return null

    return value
})

const formatValue = computed(() => {
    const output = []
    let value_ = value.value?.toFixed(1)
    if (value.value === null) value_ = '--'

    // get unit
    let unitPrefix: string | null = null
    let unitSuffix: string | null = null

    if (props.keyName === 'gas') {
        switch (props.sensorType) {
            case 'sgp40':
                unitPrefix = 'VOC'
                break

            case 'bme680':
                unitPrefix = 'IAQ'
                break
        }
    }

    switch (props.keyName) {
        case 'pressure':
            unitSuffix = 'hPa'
            break
        case 'humidity':
            unitSuffix = '%'
            break
        case 'current_z_adjust':
            unitSuffix = 'mm'
            break
    }

    // format value for current_z_adjust
    if (props.keyName === 'current_z_adjust' && value.value) {
        value_ = value.value.toFixed(3)

        // convert z_adjust value if it is smaller than 0.1 to μm
        if (Math.abs(value.value) < 0.1) {
            value_ = Math.round(value.value * 1000).toString()
            unitSuffix = 'μm'
        }
    }
    if (props.keyName.startsWith('gas') || props.keyName === 'voc') value_ = value.value?.toFixed(0)

    if (unitPrefix) output.push(`${unitPrefix}:`)
    output.push(value_)
    if (unitSuffix) output.push(unitSuffix)

    return output.join(' ')
})

const guiSetting = computed(() =>
    guiStore.getDatasetAdditionalSensorValue({
        name: props.objectName,
        sensor: props.keyName,
    })
)

const isVisible = computed(() => {
    if (value.value === null) return false

    return guiSetting.value
})
</script>
