<template>
    <v-container v-if="showCoordinates || showPosition" :class="containerClass">
        <responsive
            :breakpoints="{
                xsmall: (el) => el.width <= 320,
                small: (el) => el.width > 320 && el.width <= 460,
                medium: (el) => el.width > 460 && el.width <= 560,
                large: (el) => el.width > 560,
            }">
            <template #default="{ el }">
                <v-row v-if="showPosition" class="flex-nowrap pb-1">
                    <v-col
                        :class="{
                            'col-5': el.is.small,
                            'col-4': el.is.xsmall || el.is.medium,
                            'col-3': el.is.large,
                        }"
                        class="v-subheader text-medium-emphasis mr-2">
                        <v-icon size="small" class="mr-1">{{ mdiCrosshairsGps }}</v-icon>
                        <span v-if="!el.is.xsmall" class="text-no-wrap"> {{ t('Panels.ToolheadControlPanel.Position') }}:&nbsp; </span>
                        <span class="text-no-wrap">{{ displayPositionAbsolute }}</span>
                    </v-col>
                    <v-col v-if="currentProfileName" class="v-subheader text-medium-emphasis pl-2 justify-end text-no-wrap text-truncate">
                        <v-icon size="small" class="mr-1">{{ mdiGrid }}</v-icon>
                        <span class="text-no-wrap text-truncate">{{ currentProfileName }}</span>
                    </v-col>
                </v-row>
                <v-row v-if="showCoordinates" dense>
                    <v-col :class="el.is.xsmall ? 'col-12' : 'col-4'">
                        <move-to-input v-model="input.x.pos" :label="livePositions.x" :suffix="'X'" :step="0.01" :current-pos="gcodePositions.x" :readonly="['printing'].includes(printer_state)" :disabled="!xAxisHomed" @submit="sendCmd" />
                    </v-col>
                    <v-col :class="el.is.xsmall ? 'col-12' : 'col-4'">
                        <move-to-input v-model="input.y.pos" :label="livePositions.y" :suffix="'Y'" :step="0.01" :current-pos="gcodePositions.y" :readonly="['printing'].includes(printer_state)" :disabled="!yAxisHomed" @submit="sendCmd" />
                    </v-col>
                    <v-col :class="el.is.xsmall ? 'col-12' : 'col-4'">
                        <move-to-input v-model="input.z.pos" :label="livePositions.z" :suffix="'Z'" :step="0.001" :current-pos="gcodePositions.z" :readonly="['printing'].includes(printer_state)" :disabled="!zAxisHomed" @submit="sendCmd" />
                    </v-col>
                </v-row>
            </template>
        </responsive>
    </v-container>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MoveToInput from '@/components/inputs/MoveToInput.vue'
import Responsive from '@/components/ui/Responsive.vue'
import { mdiCrosshairsGps, mdiGrid } from '@mdi/js'
import { useBase } from '@/composables/useBase'
import { useControl } from '@/composables/useControl'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

interface MoveToAxisInput {
    pos: string
    valid: boolean
}

const { t } = useI18n()
const { printer_state } = useBase()
const { xAxisHomed, yAxisHomed, zAxisHomed, existsClientLinearMoveMacro, feedrateXY, feedrateZ } = useControl()
const printerStore = usePrinterStore()
const guiStore = useGuiStore()

const input = reactive<{ x: MoveToAxisInput; y: MoveToAxisInput; z: MoveToAxisInput }>({
    x: { pos: '', valid: true },
    y: { pos: '', valid: true },
    z: { pos: '', valid: true },
})

/**
 * Axes positions and positioning mode (G90 / G91)
 */
const positionAbsolute = computed(() => printerStore.gcode_move?.absolute_coordinates ?? true)

const displayPositionAbsolute = computed(() => (positionAbsolute.value ? t('Panels.ToolheadControlPanel.Absolute') : t('Panels.ToolheadControlPanel.Relative')))

const livePositions = computed(() => {
    const pos = printerStore.motion_report?.live_position ?? [0, 0, 0]
    return {
        x: pos[0]?.toFixed(2) ?? '--',
        y: pos[1]?.toFixed(2) ?? '--',
        z: pos[2]?.toFixed(3) ?? '--',
    }
})

const gcodePositions = computed(() => {
    const pos = printerStore.gcode_move?.gcode_position ?? [0, 0, 0]
    return {
        x: pos[0]?.toFixed(2) ?? '--',
        y: pos[1]?.toFixed(2) ?? '--',
        z: pos[2]?.toFixed(3) ?? '--',
    }
})

/**
 * Get currently loaded bed mesh profile name
 */
const bed_mesh = computed(() => printerStore.bed_mesh ?? null)

const currentProfileName = computed(() => bed_mesh.value?.profile_name ?? '')

const showPosition = computed(() => guiStore.view.toolhead.showPosition ?? true)
const showCoordinates = computed(() => guiStore.view.toolhead.showCoordinates ?? true)
const showControl = computed(() => guiStore.view.toolhead.showControl ?? true)

const containerClass = computed(() => (showControl.value ? 'pb-0' : ''))

function sendCmd(): void {
    const gcode: string[] = []
    if (!existsClientLinearMoveMacro.value) {
        gcode.push('SAVE_GCODE_STATE NAME=_ui_movement')
        gcode.push('G90')
    }

    if (input.z.pos !== gcodePositions.value.z) {
        if (existsClientLinearMoveMacro.value) gcode.push(`_CLIENT_LINEAR_MOVE Z=${input.z.pos} F=${feedrateZ.value * 60} ABSOLUTE=1`)
        else gcode.push(`G1 Z${input.z.pos} F${feedrateZ.value * 60}`)
    }

    if (input.x.pos !== gcodePositions.value.x || input.y.pos !== gcodePositions.value.y) {
        let xPos = ''
        let yPos = ''

        if (existsClientLinearMoveMacro.value) {
            if (input.x.pos !== gcodePositions.value.x) xPos = ` X=${input.x.pos}`
            if (input.y.pos !== gcodePositions.value.y) yPos = ` Y=${input.y.pos}`

            gcode.push(`_CLIENT_LINEAR_MOVE${xPos}${yPos} F=${feedrateXY.value * 60} ABSOLUTE=1`)
        } else {
            if (input.x.pos !== gcodePositions.value.x) xPos = ` X${input.x.pos}`
            if (input.y.pos !== gcodePositions.value.y) yPos = ` Y${input.y.pos}`

            gcode.push(`G1${xPos}${yPos} F${feedrateXY.value * 60}`)
        }
    }

    if (!existsClientLinearMoveMacro.value) {
        gcode.push('RESTORE_GCODE_STATE NAME=_ui_movement')
    }

    const gcodeStr = gcode.join('\n')

    if (input.x.valid && input.y.valid && input.z.valid) {
        useServerStore().addEvent({ message: gcodeStr, type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: gcodeStr })
    }
}

watch(
    () => gcodePositions.value.x,
    (newVal) => {
        input.x.pos = newVal
    },
    { immediate: true }
)

watch(
    () => gcodePositions.value.y,
    (newVal) => {
        input.y.pos = newVal
    },
    { immediate: true }
)

watch(
    () => gcodePositions.value.z,
    (newVal) => {
        input.z.pos = newVal
    },
    { immediate: true }
)
</script>
