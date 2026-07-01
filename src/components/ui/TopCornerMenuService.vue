<template>
    <v-list-item class="minHeight30 pr-2">
        <v-list-item-title>
            <v-tooltip location="left">
                <template #activator="{ props: activatorProps }">
                    <span v-bind="activatorProps">{{ name }}</span>
                </template>
                <span>{{ state }} ({{ subState }})</span>
            </v-tooltip>
        </v-list-item-title>
        <v-list-item-action class="my-0 d-flex flex-row" style="min-width: auto">
            <v-btn v-if="state === 'inactive'" icon size="small" @click="clickStart">
                <v-icon size="small">{{ mdiPlay }}</v-icon>
            </v-btn>
            <v-btn v-else icon size="small" @click="clickRestart">
                <v-icon size="small">{{ mdiRestart }}</v-icon>
            </v-btn>
            <v-btn icon size="small" :disabled="disableStopButton" :style="styleStopButton" @click="clickStop">
                <v-icon size="small">{{ mdiStop }}</v-icon>
            </v-btn>
        </v-list-item-action>
        <confirmation-dialog
            v-model="showRestartDialog"
            :title="dialogRestartTitle"
            :text="dialogRestartDescription"
            :action-button-text="t('App.TopCornerMenu.Restart')"
            @action="serviceRestart" />
        <confirmation-dialog
            v-model="showStopDialog"
            :title="dialogStopTitle"
            :text="dialogStopDescription"
            :action-button-text="t('App.TopCornerMenu.Stop')"
            @action="serviceStop" />
    </v-list-item>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiPlay, mdiRestart, mdiStop } from '@mdi/js'
import { capitalize } from '@/plugins/helpers'
import { useServerStore } from '@/store/server'
import { useBase } from '@/composables/useBase'
import { useServices } from '@/composables/useServices'
import { webSocketClient } from '@/plugins/webSocketClient'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'

const props = defineProps<{ service: string }>()
const emit = defineEmits<{ 'close-menu': [] }>()

const { t } = useI18n()
const serverStore = useServerStore()
const { printerIsPrinting } = useBase()
const { hideOtherInstances, klipperInstance, moonrakerInstance } = useServices()

const showRestartDialog = ref(false)
const showStopDialog = ref(false)

const name = computed(() => {
    if (hideOtherInstances.value && props.service === klipperInstance.value) return 'Klipper'
    if (hideOtherInstances.value && props.service === moonrakerInstance.value) return 'Moonraker'

    return capitalize(props.service)
})

const service_states = computed(() => serverStore.system_info?.service_state ?? {})

const state = computed(() => (props.service in service_states.value ? service_states.value[props.service].active_state : null))
const subState = computed(() => (props.service in service_states.value ? service_states.value[props.service].sub_state : null))

const dialogRestartTitle = computed(() =>
    props.service === klipperInstance.value
        ? t('App.TopCornerMenu.ConfirmationDialog.Title.KlipperRestart')
        : t('App.TopCornerMenu.ConfirmationDialog.Title.ServiceRestart')
)

const dialogStopTitle = computed(() => t('App.TopCornerMenu.ConfirmationDialog.Title.ServiceStop'))

const dialogRestartDescription = computed(() =>
    props.service === klipperInstance.value
        ? t('App.TopCornerMenu.ConfirmationDialog.Description.KlipperRestart')
        : t('App.TopCornerMenu.ConfirmationDialog.Description.ServiceRestart')
)

const dialogStopDescription = computed(() =>
    props.service === klipperInstance.value
        ? t('App.TopCornerMenu.ConfirmationDialog.Description.KlipperStop')
        : t('App.TopCornerMenu.ConfirmationDialog.Description.ServiceStop')
)

const disableStopButton = computed(() => state.value === 'inactive' || props.service === moonrakerInstance.value)
const styleStopButton = computed(() => (props.service === moonrakerInstance.value ? 'visibility: hidden;' : ''))

function closeMenu() {
    emit('close-menu')
}

function clickStart() {
    webSocketClient.emit('machine.services.start', { service: props.service })
    closeMenu()
}

function clickRestart() {
    if (printerIsPrinting.value) {
        showRestartDialog.value = true
        return
    }

    serviceRestart()
}

function clickStop() {
    if (printerIsPrinting.value) {
        showStopDialog.value = true
        return
    }

    serviceStop()
}

function serviceRestart() {
    webSocketClient.emit('machine.services.restart', { service: props.service })
    closeMenu()
}

function serviceStop() {
    webSocketClient.emit('machine.services.stop', { service: props.service })
    closeMenu()
}
</script>
