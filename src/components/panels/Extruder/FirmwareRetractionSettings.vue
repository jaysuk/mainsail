<template>
    <div v-if="existsFirmwareRetraction">
        <v-container>
            <responsive
                :breakpoints="{
                    small: (el) => el.width <= 350,
                }">
                <template #default="{ el }">
                    <v-row>
                        <v-col :class="{ 'col-12': el.is.small }">
                            <number-input
                                :label="t('Panels.ExtruderControlPanel.FirmwareRetractionSettings.RetractLength')"
                                param="RETRACT_LENGTH"
                                :target="retractLength"
                                :default-value="defaultRetractLength"
                                :output-error-msg="true"
                                :has-spinner="true"
                                :spinner-factor="10"
                                :step="0.01"
                                :min="0"
                                :max="null"
                                :dec="2"
                                unit="mm"
                                @submit="sendCmd" />
                        </v-col>
                        <v-col :class="{ 'col-12': el.is.small }">
                            <number-input
                                :label="t('Panels.ExtruderControlPanel.FirmwareRetractionSettings.RetractSpeed')"
                                param="RETRACT_SPEED"
                                :target="retractSpeed"
                                :default-value="defaultRetractSpeed"
                                :output-error-msg="true"
                                :has-spinner="true"
                                :spinner-factor="5"
                                :step="1"
                                :min="1"
                                :max="null"
                                :dec="0"
                                unit="mm/s"
                                @submit="sendCmd" />
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col :class="{ 'col-12': el.is.small }">
                            <number-input
                                :label="t('Panels.ExtruderControlPanel.FirmwareRetractionSettings.UnretractExtraLength')"
                                param="UNRETRACT_EXTRA_LENGTH"
                                :target="unretractExtraLength"
                                :default-value="defaultUnretractExtraLength"
                                :output-error-msg="true"
                                :has-spinner="true"
                                :spinner-factor="10"
                                :step="0.01"
                                :min="0"
                                :max="null"
                                :dec="2"
                                unit="mm"
                                @submit="sendCmd" />
                        </v-col>
                        <v-col :class="{ 'col-12': el.is.small }">
                            <number-input
                                :label="t('Panels.ExtruderControlPanel.FirmwareRetractionSettings.UnretractSpeed')"
                                param="UNRETRACT_SPEED"
                                :target="unretractSpeed"
                                :default-value="defaultUnretractSpeed"
                                :output-error-msg="true"
                                :has-spinner="true"
                                :spinner-factor="5"
                                :step="1"
                                :min="1"
                                :max="null"
                                :dec="0"
                                unit="mm/s"
                                @submit="sendCmd" />
                        </v-col>
                    </v-row>
                </template>
            </responsive>
        </v-container>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import NumberInput from '@/components/inputs/NumberInput.vue'
import Responsive from '@/components/ui/Responsive.vue'
import { useControl } from '@/composables/useControl'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { existsFirmwareRetraction } = useControl()
const printerStore = usePrinterStore()

const retractLength = computed<number>(() => Math.floor((printerStore.firmware_retraction?.retract_length ?? 0) * 100) / 100)

const retractSpeed = computed<number>(() => Math.trunc(printerStore.firmware_retraction?.retract_speed ?? 20))

const unretractExtraLength = computed<number>(() => Math.floor((printerStore.firmware_retraction?.unretract_extra_length ?? 0) * 100) / 100)

const unretractSpeed = computed<number>(() => Math.trunc(printerStore.firmware_retraction?.unretract_speed ?? 10))

const defaultRetractLength = computed<number>(() => Math.floor((printerStore.configfile?.settings?.firmware_retraction?.retract_length ?? 0) * 100) / 100)

const defaultRetractSpeed = computed<number>(() => Math.trunc(printerStore.configfile?.settings?.firmware_retraction?.retract_speed ?? 20))

const defaultUnretractExtraLength = computed<number>(() => Math.floor((printerStore.configfile?.settings?.firmware_retraction?.unretract_extra_length ?? 0) * 100) / 100)

const defaultUnretractSpeed = computed<number>(() => Math.trunc(printerStore.configfile?.settings?.firmware_retraction?.unretract_speed ?? 0))

// debounce replaces the removed vue-debounce-decorator @Debounce(500)
let debounceTimer: ReturnType<typeof setTimeout> | undefined
function sendCmd(params: { name: string; value: number }): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        const gcode = `SET_RETRACTION ${params.name}=${params.value}`

        useServerStore().addEvent({ message: gcode, type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: gcode })
    }, 500)
}

onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
})
</script>
