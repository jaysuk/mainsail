<template>
    <div>
        <v-dialog v-model="showDialogPass" width="400" persistent :fullscreen="isMobile">
            <panel :title="t('Panels.StatusPanel.PauseAtLayer.PauseAtLayer')" :icon="mdiLayersPlus" card-class="pause-at-layer-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon="" variant="text" @click="hideDialog">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-row v-if="type === 'atLayer' && macroSettingsPauseAtLayerEnable">
                        <v-col>
                            <v-alert variant="text" type="warning" border="start">
                                {{
                                    t('Panels.StatusPanel.PauseAtLayer.DescriptionPauseAtLayerActive', {
                                        layer: macroSettingsPauseAtLayerLayer,
                                        call: macroSettingsPauseAtLayerCall,
                                    })
                                }}
                            </v-alert>
                        </v-col>
                    </v-row>
                    <v-row v-if="type === 'nextLayer' && macroSettingsPauseNextLayerEnable">
                        <v-col>
                            <v-alert variant="text" type="warning" border="start">
                                {{
                                    t('Panels.StatusPanel.PauseAtLayer.DescriptionPauseNextLayerActive', {
                                        call: macroSettingsPauseAtLayerCall,
                                    })
                                }}
                            </v-alert>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col>
                            <v-select v-model="type" :items="itemsFiltered" item-title="text" item-value="value" :label="t('Panels.StatusPanel.PauseAtLayer.Type')" variant="outlined" hide-details />
                        </v-col>
                        <v-col v-if="type === 'atLayer'">
                            <v-text-field v-model="layer" :label="t('Panels.StatusPanel.PauseAtLayer.Layer')" variant="outlined" hide-details />
                        </v-col>
                    </v-row>
                    <v-row class="mt-0">
                        <v-col>
                            <v-select v-model="call" :items="itemsCall" item-title="text" item-value="value" :label="t('Panels.StatusPanel.PauseAtLayer.Call')" variant="outlined" hide-details />
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="hideDialog">{{ t('Panels.StatusPanel.PauseAtLayer.Abort') }}</v-btn>
                    <v-btn color="primary" variant="text" @click="sendCommand">
                        {{ t('Panels.StatusPanel.PauseAtLayer.Accept') }}
                    </v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick, mdiLayersPlus } from '@mdi/js'
import type { PrinterStateMacro } from '@/store/printer/types'
import { useBase } from '@/composables/useBase'
import { useControl } from '@/composables/useControl'
import { usePrinterStore } from '@/store/printer'

const props = defineProps<{
    showDialog: boolean
}>()

const emit = defineEmits<{
    'update:showDialog': [value: boolean]
}>()

const { t } = useI18n()
const { isMobile } = useBase()
const { doSend } = useControl()
const printerStore = usePrinterStore()

const type = ref<'nextLayer' | 'atLayer'>('atLayer')
const layer = ref(0)
const call = ref<'PAUSE' | 'M600'>('PAUSE')

const showDialogPass = computed<boolean>({
    get: () => props.showDialog,
    set: (newVal) => emit('update:showDialog', newVal),
})

function hideDialog() {
    emit('update:showDialog', false)
}

const macros = computed<PrinterStateMacro[]>(() => printerStore.getMacros ?? [])

const existsSetPauseAtLayer = computed(() => macros.value.findIndex((macro: PrinterStateMacro) => macro.name === 'SET_PAUSE_AT_LAYER') !== -1)

const existsSetPauseNextLayer = computed(() => macros.value.findIndex((macro: PrinterStateMacro) => macro.name === 'SET_PAUSE_NEXT_LAYER') !== -1)

const items = computed(() => [
    {
        text: t('Panels.StatusPanel.PauseAtLayer.AtLayer'),
        value: 'atLayer',
        status: existsSetPauseAtLayer.value,
    },
    {
        text: t('Panels.StatusPanel.PauseAtLayer.NextLayer'),
        value: 'nextLayer',
        status: existsSetPauseNextLayer.value,
    },
])

const itemsFiltered = computed(() => items.value.filter((entry) => entry.status))

const itemsCall = computed(() => [
    {
        text: 'PAUSE',
        value: 'PAUSE',
    },
    {
        text: 'M600',
        value: 'M600',
    },
])

const current_layer = computed(() => printerStore.print_stats?.info?.current_layer ?? 0)

const macroSetPrintStatsInfo = computed(() => printerStore['gcode_macro SET_PRINT_STATS_INFO'] ?? {})

const macroSettingsPauseAtLayer = computed(() => macroSetPrintStatsInfo.value.pause_at_layer ?? {})

const macroSettingsPauseAtLayerEnable = computed(() => macroSettingsPauseAtLayer.value.enable ?? false)

const macroSettingsPauseAtLayerCall = computed(() => macroSettingsPauseAtLayer.value.call ?? 'PAUSE')

const macroSettingsPauseAtLayerLayer = computed(() => macroSettingsPauseAtLayer.value.layer ?? 0)

const macroSettingsPauseNextLayer = computed(() => macroSetPrintStatsInfo.value.pause_next_layer ?? {})

const macroSettingsPauseNextLayerEnable = computed(() => macroSettingsPauseNextLayer.value.enable ?? false)

const macroSettingsPauseNextLayerCall = computed(() => macroSettingsPauseNextLayer.value.call ?? 'PAUSE')

function sendCommand() {
    if (type.value === 'atLayer') {
        doSend(`SET_PAUSE_AT_LAYER ENABLE=1 LAYER=${layer.value} MACRO=${call.value}`)
        hideDialog()
        return
    }

    doSend(`SET_PAUSE_NEXT_LAYER ENABLE=1 MACRO=${call.value}`)
    hideDialog()
}

watch(
    () => props.showDialog,
    (newVal) => {
        if (newVal) {
            layer.value = current_layer.value + 1
            type.value = 'atLayer'

            if (!existsSetPauseAtLayer.value) type.value = 'nextLayer'
        }
    }
)

watch(type, (newVal) => {
    if (newVal === 'atLayer') {
        call.value = macroSettingsPauseAtLayerCall.value
    } else if (newVal === 'nextLayer') {
        call.value = macroSettingsPauseNextLayerCall.value
    }
})
</script>
