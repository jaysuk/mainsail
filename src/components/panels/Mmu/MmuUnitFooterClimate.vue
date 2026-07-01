<template>
    <v-tooltip :disabled="!showPerGateReport" location="top" open-delay="500">
        <template #activator="{ props: activatorProps }">
            <div class="d-flex" v-bind="activatorProps">
                <span v-if="unitClimateHumidity" class="d-inline-flex align-center mr-1">
                    <v-icon v-if="showClimateIcons" size="18" class="text-blue ml-n1">{{ mdiWater }}</v-icon>
                    {{ unitClimateHumidity }}
                </span>
                <span v-if="unitClimateTemp" class="d-inline-flex align-center mr-2">
                    <v-icon v-if="showClimateIcons" size="18" class="text-deep-orange">{{ mdiThermometer }}</v-icon>
                    {{ unitClimateTemp }}
                </span>
                <span v-if="unitHeaterIcon" class="d-inline-flex align-center ml-auto">
                    <v-icon size="22" class="text-red">{{ unitHeaterIcon }}</v-icon>
                    {{ unitHeaterTemp }}
                </span>
            </div>
        </template>
        <div>
            <div v-for="row in perGateReport" :key="row.gate">{{ t('Panels.MmuPanel.Gate') }} {{ row.gate }}: {{ row.parts.join(', ') }}</div>
        </div>
    </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MmuEnvironmentSensor, MmuFilamentHeater, MmuMachineUnit } from '@/composables/useMmu'
import { useMmu } from '@/composables/useMmu'
import { mdiWater, mdiThermometer, mdiHeatingCoil, mdiRotateOrbit } from '@mdi/js'
import { additionalSensors } from '@/store/variables'
import { usePrinterStore } from '@/store/printer'

// A filament heater and an environment sensor share the same numeric metrics we read for display.
type MmuClimateMetric = Partial<MmuFilamentHeater & MmuEnvironmentSensor>

interface MmuGateReportRow {
    gate: number
    parts: string[]
}

const props = defineProps<{
    mmuMachineUnit: MmuMachineUnit | undefined
}>()

const { t } = useI18n()
const { mmu, mmuGate } = useMmu()
const printerStore = usePrinterStore()

const numGates = computed(() => props.mmuMachineUnit?.num_gates ?? 0)

const firstGateNumber = computed(() => props.mmuMachineUnit?.first_gate ?? 0)

const showClimateIcons = computed<boolean>(() => numGates.value > 2)

function stripQuotes(v?: string) {
    return v?.replace(/^"(.*)"$/, '$1')
}

function environmentSensorObj(fullname: string | undefined): MmuEnvironmentSensor | undefined {
    if (!fullname) return undefined

    const settings = printerStore.configfile?.settings ?? {}
    const sensorSettings = settings[fullname.toLowerCase()] ?? {}
    const sensorType = (sensorSettings.sensor_type ?? '').toLowerCase()

    if (!additionalSensors.includes(sensorType)) {
        return printerStore[fullname] ?? undefined
    }

    const parts = fullname.split(' ')
    if (parts.length !== 2) return undefined
    const name = parts[1]
    const sensorObjectName = `${sensorType} ${name}`

    let printerObj = printerStore[sensorObjectName] ?? undefined
    if (!printerObj && sensorType.startsWith('aht')) {
        const fallbackObjectName = `aht10 ${name}`
        printerObj = printerStore[fallbackObjectName] ?? undefined
    }

    return printerObj
}

function heaterObj(name: string | undefined): MmuFilamentHeater | undefined {
    if (!name) return undefined
    return printerStore[name] as MmuFilamentHeater | undefined
}

function formatMetric(obj: MmuClimateMetric | undefined, key: 'humidity' | 'temperature' | 'target', suffix: string): string | undefined {
    const value = obj?.[key]
    return typeof value === 'number' ? `${value.toFixed(0)}${suffix}` : undefined
}

function resolvePerGateName(perGate: string[] | undefined, single: string | undefined) {
    if (!perGate) return stripQuotes(single)

    const start = firstGateNumber.value
    const end = start + numGates.value
    if (mmuGate.value < start || mmuGate.value >= end) return undefined
    return stripQuotes(perGate[mmuGate.value - start])
}

const unitHeaterObj = computed<MmuFilamentHeater | undefined>(() => {
    const name = resolvePerGateName(props.mmuMachineUnit?.filament_heaters, props.mmuMachineUnit?.filament_heater)
    return heaterObj(name)
})

const unitClimateSensorObj = computed<MmuEnvironmentSensor | undefined>(() => {
    const fullname = resolvePerGateName(props.mmuMachineUnit?.environment_sensors, props.mmuMachineUnit?.environment_sensor)

    return environmentSensorObj(fullname)
})

const hasPerGateClimateSensors = computed(() => !!props.mmuMachineUnit?.environment_sensors)

const hasPerGateHeaters = computed(() => !!props.mmuMachineUnit?.filament_heaters)

const dryingState = computed(() => mmu.value?.drying_state ?? [])

const unitDryingCycle = computed<boolean>(() => {
    const start = firstGateNumber.value
    const end = firstGateNumber.value + numGates.value

    return dryingState.value.slice(start, end).some((state) => state === 'active' || state === 'queued')
})

const showPerGateReport = computed<boolean>(() => hasPerGateHeaters.value || hasPerGateClimateSensors.value)

function heaterPartText(heaterObj: MmuFilamentHeater, state: string | undefined): string {
    const target = formatMetric(heaterObj, 'target', '°C') ?? '--'
    switch (state) {
        case 'active':
            return `${t('Panels.MmuPanel.Drying')}: ${target}`
        case 'queued':
            return t('Panels.MmuPanel.DryingQueued')
        case 'complete':
            return t('Panels.MmuPanel.DryingComplete')
        case 'cancelled':
            return t('Panels.MmuPanel.DryingCancelled')
        default:
            return `${t('Panels.MmuPanel.Heater')}: ${target}`
    }
}

const perGateReport = computed<MmuGateReportRow[]>(() => {
    if (!showPerGateReport.value) return []

    const sensors = props.mmuMachineUnit?.environment_sensors
    const heaters = props.mmuMachineUnit?.filament_heaters
    const isDrying = unitDryingCycle.value

    const rows: MmuGateReportRow[] = []
    for (let i = 0; i < numGates.value; i++) {
        const gate = firstGateNumber.value + i
        const parts: string[] = []

        const sensorObj = environmentSensorObj(stripQuotes(sensors?.[i]))
        if (sensorObj) {
            const h = formatMetric(sensorObj, 'humidity', '%')
            const temp = formatMetric(sensorObj, 'temperature', '°C')
            if (h || temp) parts.push([h, temp].filter(Boolean).join('/'))
        }

        const heaterObject = heaterObj(stripQuotes(heaters?.[i]))
        if (heaterObject) {
            parts.push(heaterPartText(heaterObject, isDrying ? dryingState.value?.[gate] : undefined))
        }

        rows.push({ gate, parts })
    }

    return rows
})

const unitHeaterIcon = computed(() => {
    if (unitDryingCycle.value) return mdiRotateOrbit

    if (hasPerGateHeaters.value) {
        const heaters = props.mmuMachineUnit?.filament_heaters
        for (let i = 0; i < numGates.value; i++) {
            const target = heaterObj(stripQuotes(heaters?.[i]))?.target
            if (typeof target === 'number' && target > 0) return mdiHeatingCoil
        }
    } else if (unitHeaterTemp.value) return mdiHeatingCoil

    return undefined
})

const unitClimateHumidity = computed(() => {
    if (hasPerGateClimateSensors.value && !unitClimateSensorObj.value) return '...'
    if (!unitClimateSensorObj.value) return undefined

    return formatMetric(unitClimateSensorObj.value, 'humidity', '%')
})

const unitClimateTemp = computed(() => {
    if (hasPerGateClimateSensors.value && !unitClimateSensorObj.value) return '...'
    if (!unitClimateSensorObj.value) return undefined
    const value = formatMetric(unitClimateSensorObj.value, 'temperature', '°C')

    return value ? (hasPerGateClimateSensors.value ? `${value} ...` : value) : undefined
})

const unitHeaterTemp = computed(() => {
    if (!unitHeaterObj.value && mmuGate.value >= 0) return undefined
    if (!unitHeaterObj.value && hasPerGateHeaters.value) return '...'
    const raw = unitHeaterObj.value?.target
    if (typeof raw !== 'number' || raw <= 0) return undefined
    const value = formatMetric(unitHeaterObj.value, 'target', '°C')
    return value ? (hasPerGateHeaters.value ? `${value} ...` : value) : undefined
})
</script>
