<template>
    <v-dialog :model-value="showDialog" width="400" persistent :fullscreen="isMobile">
        <panel :title="t('ManualProbe.Headline')" :icon="mdiArrowCollapseDown" card-class="manual_probe-dialog" :margin-bottom="false" style="overflow: hidden" :height="isMobile ? 0 : 548">
            <template #buttons>
                <v-btn icon="" variant="text" @click="sendAbort">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-container>
                <v-row>
                    <v-col class="d-flex align-center justify-center">
                        <span class="text-h5">{{ z_position_lower }}</span>
                        <v-icon class="mx-2">{{ mdiChevronTripleRight }}</v-icon>
                        <span class="text-h4">{{ z_position }}</span>
                        <v-icon class="mx-2">{{ mdiChevronTripleLeft }}</v-icon>
                        <span class="text-h5">{{ z_position_upper }}</span>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col class="text-left">
                        <v-btn class="" color="primary" @click="sendTestZ('--')">
                            <v-icon size="small">{{ mdiMinusThick }}</v-icon>
                            <v-icon size="small">{{ mdiMinusThick }}</v-icon>
                        </v-btn>
                    </v-col>
                    <v-col class="text-left">
                        <v-btn class="" color="primary" @click="sendTestZ('-')">
                            <v-icon size="small">{{ mdiMinusThick }}</v-icon>
                        </v-btn>
                    </v-col>
                    <v-col class="text-right">
                        <v-btn class="" color="primary" @click="sendTestZ('+')">
                            <v-icon size="small">{{ mdiPlusThick }}</v-icon>
                        </v-btn>
                    </v-col>
                    <v-col class="text-right">
                        <v-btn class="" color="primary" @click="sendTestZ('++')">
                            <v-icon size="small">{{ mdiPlusThick }}</v-icon>
                            <v-icon size="small">{{ mdiPlusThick }}</v-icon>
                        </v-btn>
                    </v-col>
                </v-row>
            </v-container>
            <sub-panel :title="t('ManualProbe.Advanced')" sub-panel-class="manual-probe-dialog-advanced" class="mb-n2">
                <v-container>
                    <v-item-group class="_btn-group">
                        <v-btn v-for="(offset, index) in offsetsZ" :key="`offsetsUp-${index}`" size="small" class="_btn-qs flex-grow-1 px-1" @click="sendTestZ(offset.toString())">
                            <v-icon v-if="index === 0" start size="small" class="mr-1 ml-n1">
                                {{ mdiArrowExpandUp }}
                            </v-icon>
                            <span>&plus;{{ offset }}</span>
                        </v-btn>
                    </v-item-group>
                    <v-item-group class="_btn-group mt-6 mt-sm-3">
                        <v-btn v-for="(offset, index) in offsetsZ" :key="`offsetsDown-${index}`" size="small" class="_btn-qs flex-grow-1 px-1" @click="sendTestZ((offset * -1).toString())">
                            <v-icon v-if="index === 0" start size="small" class="mr-1 ml-n1">
                                {{ mdiArrowCollapseDown }}
                            </v-icon>
                            <span>&minus;{{ offset }}</span>
                        </v-btn>
                    </v-item-group>
                </v-container>
            </sub-panel>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn variant="text" :loading="loadingAbort" @click="sendAbort">
                    {{ t('ManualProbe.Abort') }}
                </v-btn>
                <v-btn color="primary" variant="text" :loading="loadingAccept" @click="sendAccept">
                    {{ t('ManualProbe.Accept') }}
                </v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import SubPanel from '@/components/ui/SubPanel.vue'
import { mdiArrowCollapseDown, mdiArrowExpandUp, mdiPlusThick, mdiMinusThick, mdiChevronTripleLeft, mdiChevronTripleRight, mdiCloseThick } from '@mdi/js'
import { useBase } from '@/composables/useBase'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { isMobile, loadings } = useBase()
const printerStore = usePrinterStore()
const guiStore = useGuiStore()

const boolManualProbeDialog = computed(() => guiStore.uiSettings.boolManualProbeDialog ?? true)

const showDialog = computed(() => {
    if (!boolManualProbeDialog.value) return false

    return printerStore.manual_probe?.is_active ?? false
})

const offsetsZ = computed(() => {
    const offsets = [1, 0.1, 0.05, 0.01, 0.005]

    return offsets.sort()
})

const z_position = computed(() => (printerStore.manual_probe?.z_position ?? 0).toFixed(3))

const z_position_lower = computed(() => {
    const value = printerStore.manual_probe?.z_position_lower ?? null
    if (value === null) return '??????'

    return value.toFixed(3)
})

const z_position_upper = computed(() => {
    const value = printerStore.manual_probe?.z_position_upper ?? null
    if (value === null) return '??????'

    return value.toFixed(3)
})

const loadingAbort = computed(() => loadings.value.includes('manualProbeAbort'))

const loadingAccept = computed(() => loadings.value.includes('manualProbeAccept'))

function sendTestZ(offset: string) {
    const gcode = `TESTZ Z=${offset}`
    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode })
}

function sendAbort() {
    const gcode = `ABORT`
    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode }, { loading: 'manualProbeAbort' })
}

function sendAccept() {
    const gcode = `ACCEPT`
    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode }, { loading: 'manualProbeAccept' })
}
</script>

<style scoped>
.v-btn-toggle {
    width: 100%;
}

._btn-group {
    border-radius: 4px;
    display: inline-flex;
    flex-wrap: nowrap;
    max-width: 100%;
    min-width: 100%;
    width: 100%;

    .v-btn {
        border-radius: 0;
        border-color: rgba(255, 255, 255, 0.12) !important;
        border-style: solid;
        border-width: thin;
        box-shadow: none;
        height: 28px;
        opacity: 0.8;
        min-width: auto !important;
    }

    .v-btn:first-child {
        border-top-left-radius: inherit;
        border-bottom-left-radius: inherit;
    }

    .v-btn:last-child {
        border-top-right-radius: inherit;
        border-bottom-right-radius: inherit;
    }

    .v-btn:not(:first-child) {
        border-left-width: 0;
    }
}

._btn-qs {
    font-size: 0.8rem !important;
    font-weight: 400;
    max-height: 28px;
}
</style>
