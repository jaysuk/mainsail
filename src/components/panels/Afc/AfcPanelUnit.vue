<template>
    <div>
        <v-row>
            <v-col class="pb-0 d-flex flex-row justify-space-between align-center">
                <h3 class="text-h6">
                    <v-icon v-if="modulIcon" start>{{ modulIcon }}</v-icon>
                    {{ unitNameOutput }}
                </h3>
                <v-spacer />
                <afc-panel-unit-hub v-for="hub in hubs" :key="hub" :name="hub" />
            </v-col>
        </v-row>
        <v-row>
            <v-col class="d-flex flex-row flex-wrap afc-unit-container">
                <afc-panel-unit-lane v-for="lane in lanes" :key="lane" :name="lane" />
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { afcIconBoxTurtle, afcIconHtlf, afcIconNightOwl, afcIconQuattroBox } from '@/plugins/afcIcons'
import { convertName } from '@/plugins/helpers'
import AfcPanelUnitHub from '@/components/panels/Afc/AfcPanelUnitHub.vue'
import AfcPanelUnitLane from '@/components/panels/Afc/AfcPanelUnitLane.vue'
import { useAfc } from '@/composables/useAfc'
import { usePrinterStore } from '@/store/printer'

const props = defineProps<{
    name: string
}>()

const { afcShowUnitIcons } = useAfc()
const printerStore = usePrinterStore()

const unitName = computed(() => props.name.substring(props.name.indexOf(' ') + 1))

const unitNameOutput = computed(() => convertName(unitName.value))

const unit = computed(() => {
    const printer = printerStore as unknown as Record<string, any>
    const moduleName = props.name.substring(0, props.name.indexOf(' ')).replaceAll('_', '')
    const unitObjectName = `AFC_${moduleName} ${unitName.value}`.toLowerCase()
    const objectName = Object.keys(printer).find((key) => key.toLowerCase() === unitObjectName) ?? ''

    return printer[objectName] ?? {}
})

const hubs = computed<string[]>(() => unit.value.hubs ?? [])

const lanes = computed<string[]>(() => unit.value.lanes ?? [])

const type = computed(() => {
    const moduleName = props.name.substring(0, props.name.indexOf(' ')).replaceAll('_', '')

    return moduleName.toLowerCase()
})

const modulIcon = computed(() => {
    if (!afcShowUnitIcons.value) return null

    switch (type.value) {
        case 'boxturtle':
            return afcIconBoxTurtle
        case 'htlf':
            return afcIconHtlf
        case 'nightowl':
            return afcIconNightOwl
        case 'quattrobox':
            return afcIconQuattroBox
        default:
            return null
    }
})
</script>

<style scoped>
.afc-unit-container {
    gap: 16px;
}
</style>
