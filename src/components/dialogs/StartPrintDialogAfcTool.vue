<template>
    <v-row :class="{ 'bt-1': borderTop }" class="px-6">
        <v-col class="d-flex align-center shrink pr-0">
            <v-tooltip v-if="warnings.length" location="top">
                <template #activator="{ props: activatorProps }">
                    <v-icon color="warning" v-bind="activatorProps">{{ mdiAlert }}</v-icon>
                </template>
                <span>{{ warnings.join('\n') }}</span>
            </v-tooltip>
            <v-icon v-else color="success">{{ mdiCheckCircle }}</v-icon>
        </v-col>
        <v-col class="d-flex align-center">
            <span class="mr-3 text-subtitle-1 font-weight-bold">{{ toolName }}</span>
            <gcodefiles-panel-table-row-file-metadata-filaments-badge :filament="fileFilament" />
        </v-col>
        <v-col class="d-flex align-center pr-0">
            <span class="mr-3 text-subtitle-1 font-weight-bold text-uppercase">{{ laneName }}</span>
            <gcodefiles-panel-table-row-file-metadata-filaments-badge :filament="laneFilament" />
            <v-menu location="bottom end">
                <template #activator="{ props: activatorProps }">
                    <v-btn v-bind="activatorProps" icon="" variant="text" class="pr-0">
                        <v-icon>{{ mdiChevronDown }}</v-icon>
                    </v-btn>
                </template>
                <v-list>
                    <v-list-item v-for="lane in afcLanes" :key="lane" :disabled="lane === laneName" @click="changeToolMapping(lane)">
                        <span class="mr-3 text-subtitle-1 font-weight-bold text-uppercase">{{ lane }}</span>
                        <gcodefiles-panel-table-row-file-metadata-filaments-badge :filament="getAfcLaneFilament(lane)" />
                    </v-list-item>
                </v-list>
            </v-menu>
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FileStateGcodefile } from '@/store/files/types'
import { mdiAlert, mdiCheckCircle, mdiChevronDown } from '@mdi/js'
import { convertStringToArray, filamentWeightFormat } from '@/plugins/helpers'
import GcodefilesPanelTableRowFileMetadataFilamentsBadge from '@/components/panels/Gcodefiles/GcodefilesPanelTableRowFileMetadataFilamentsBadge.vue'
import { useAfc } from '@/composables/useAfc'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const props = withDefaults(
    defineProps<{
        file: FileStateGcodefile
        toolIndex: number
        borderTop?: boolean
    }>(),
    {
        borderTop: false,
    }
)

const { t } = useI18n()
const { afc, afcLanes, getAfcLaneObject, getAfcLaneFilament } = useAfc()

const toolName = computed(() => `T${props.toolIndex}`)

const fileFilament = computed(() => {
    const fileColors = props.file.filament_colors ?? []
    const fileNames = convertStringToArray(props.file.filament_name ?? '')
    const fileTypes = convertStringToArray(props.file.filament_type ?? '')
    const fileWeights = props.file.filament_weights ?? []

    return {
        color: fileColors[props.toolIndex] ?? '#000000',
        name: fileNames[props.toolIndex] ?? '--',
        type: fileTypes[props.toolIndex] ?? '--',
        weight: fileWeights[props.toolIndex],
    }
})

const laneName = computed(() => {
    const lanes = (afc.value?.lanes as string[]) ?? []

    return lanes.find((lane: string) => {
        const laneObject = getAfcLaneObject(lane) as { map?: string }
        const mappedTool = laneObject?.map?.toLowerCase()

        return mappedTool === toolName.value.toLowerCase()
    })
})

const laneFilament = computed(() => getAfcLaneFilament(laneName.value ?? ''))

const isFilamentTypeValid = computed(() => fileFilament.value?.type?.toLowerCase() === laneFilament.value?.type?.toLowerCase())

const isFilamentWeightValid = computed(() => fileFilament.value.weight < laneFilament.value.weight)

const warnings = computed(() => {
    const warnings: string[] = []

    if (!isFilamentTypeValid.value) {
        warnings.push(
            t('Dialogs.StartPrint.Afc.FilamentTypeMismatch', {
                file: fileFilament.value?.type ?? '--',
                lane: laneFilament.value?.type ?? '--',
            })
        )
    }

    if (!isFilamentWeightValid.value) {
        warnings.push(
            t('Dialogs.StartPrint.Afc.FilamentWeightNotEnough', {
                lane: laneName.value ?? '--',
                required: filamentWeightFormat(fileFilament.value?.weight ?? 0),
                available: filamentWeightFormat(laneFilament.value?.weight ?? 0),
            })
        )
    }

    return warnings
})

function changeToolMapping(lane: string) {
    const gcode = `SET_MAP LANE=${lane} MAP=${toolName.value}`

    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode })
}
</script>
