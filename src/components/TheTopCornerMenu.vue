<template>
    <div>
        <v-menu v-model="showMenu" location="bottom start" :close-on-content-click="false">
            <template #activator="{ props: activatorProps }">
                <v-btn icon tile v-bind="activatorProps">
                    <v-icon>{{ mdiPowerStandby }}</v-icon>
                </v-btn>
            </template>
            <v-list density="compact">
                <template v-if="klipperState !== 'disconnected'">
                    <v-list-subheader style="height: auto">
                        {{ t('App.TopCornerMenu.KlipperControl') }}
                    </v-list-subheader>
                    <v-list-item class="minHeight30 pr-2" link @click="checkDialog(klipperRestart, 'klipper', 'restart')">
                        <v-list-item-title>{{ t('App.TopCornerMenu.KlipperRestart') }}</v-list-item-title>
                        <template #append>
                            <v-icon class="mr-2" size="small">{{ mdiRestart }}</v-icon>
                        </template>
                    </v-list-item>
                    <v-list-item class="minHeight30 pr-2" link @click="checkDialog(klipperFirmwareRestart, 'klipper', 'firmwareRestart')">
                        <v-list-item-title>{{ t('App.TopCornerMenu.KlipperFirmwareRestart') }}</v-list-item-title>
                        <template #append>
                            <v-icon class="mr-2" size="small">{{ mdiRestart }}</v-icon>
                        </template>
                    </v-list-item>
                </template>
                <template v-if="services.length">
                    <v-divider v-if="klipperState !== 'disconnected'" class="mt-0" />
                    <v-list-subheader class="pt-2" style="height: auto">
                        {{ t('App.TopCornerMenu.ServiceControl') }}
                    </v-list-subheader>
                    <top-corner-menu-service v-for="service in services" :key="service" :service="service" @close-menu="showMenu = false" />
                </template>
                <template v-if="powerDevices.length">
                    <v-divider class="mt-0" />
                    <v-list-subheader class="pt-2" style="height: auto">
                        {{ t('App.TopCornerMenu.PowerDevices') }}
                    </v-list-subheader>
                    <v-list-item
                        v-for="(device, index) in powerDevices"
                        :key="index"
                        class="minHeight30 pr-2"
                        :disabled="device.status === 'error' || (device.locked_while_printing && ['printing', 'paused'].includes(printer_state))"
                        @click="changeSwitch(device, device.status)">
                        <v-list-item-title>{{ device.device }}</v-list-item-title>
                        <template #append>
                            <v-icon class="mr-2" :color="device.status === 'on' ? '' : 'grey-darken-2'">
                                {{ device.status === 'on' ? mdiToggleSwitch : mdiToggleSwitchOff }}
                            </v-icon>
                        </template>
                    </v-list-item>
                </template>
                <v-divider class="mt-0" />
                <v-list-subheader class="pt-2" style="height: auto">{{ t('App.TopCornerMenu.HostControl') }}</v-list-subheader>
                <v-list-item class="minHeight30 pr-2" link @click="checkDialog(hostReboot, 'host', 'reboot')">
                    <v-list-item-title>{{ t('App.TopCornerMenu.Reboot') }}</v-list-item-title>
                    <template #append>
                        <v-icon class="mr-2" size="small">{{ mdiPower }}</v-icon>
                    </template>
                </v-list-item>
                <v-list-item class="minHeight30 pr-2" link @click="checkDialog(hostShutdown, 'host', 'shutdown')">
                    <v-list-item-title>{{ t('App.TopCornerMenu.Shutdown') }}</v-list-item-title>
                    <template #append>
                        <v-icon class="mr-2" size="small">{{ mdiPower }}</v-icon>
                    </template>
                </v-list-item>
            </v-list>
        </v-menu>
        <confirmation-dialog v-model="dialogPowerDeviceChange.show" :title="powerDeviceDialogTitle" :text="t('PowerDeviceChangeDialog.AreYouSure')" :action-button-text="t('Buttons.Yes')" :cancel-button-text="t('Buttons.No')" @action="powerDeviceToggle" />
        <confirmation-dialog v-model="dialogConfirmation.show" :title="dialogConfirmation.title" :text="dialogConfirmation.description" :action-button-text="dialogConfirmation.actionButtonText" @action="executeDialog" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ServerPowerStateDevice } from '@/store/server/power/types'
import { mdiPowerStandby, mdiRestart, mdiPower, mdiToggleSwitch, mdiToggleSwitchOff } from '@mdi/js'
import TopCornerMenuService from '@/components/ui/TopCornerMenuService.vue'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import { useServices } from '@/composables/useServices'
import { useBase } from '@/composables/useBase'
import { useServerStore } from '@/store/server'
import { useServerPowerStore } from '@/store/server/power'
import { useGuiStore } from '@/store/gui'
import { webSocketClient } from '@/plugins/webSocketClient'

interface DialogPowerDeviceChange {
    show: boolean
    device: string
    value: string
}

interface DialogConfirmation {
    show: boolean
    serviceName: string | null
    executableFunction: ((serviceName: string) => void) | null
    title: string
    description: string
    actionButtonText: string
}

const { t } = useI18n()
const { hideOtherInstances, klipperInstance, moonrakerInstance } = useServices()
const { klipperState, printer_state, printerIsPrinting } = useBase()
const serverStore = useServerStore()
const powerStore = useServerPowerStore()
const guiStore = useGuiStore()

const showMenu = ref(false)
const dialogPowerDeviceChange = ref<DialogPowerDeviceChange>({
    show: false,
    device: '',
    value: '',
})

const dialogConfirmation = ref<DialogConfirmation>({
    show: false,
    serviceName: null,
    executableFunction: null,
    title: '',
    description: '',
    actionButtonText: '',
})

const services = computed(() => {
    let services = serverStore.system_info?.available_services?.filter((name: string) => name !== 'klipper_mcu') ?? []

    if (hideOtherInstances.value && klipperInstance.value !== '') {
        services = services.filter((name: string) => (!name.toLowerCase().startsWith('klipper-') && name.toLowerCase() !== 'klipper') || name === klipperInstance.value)
    }

    if (hideOtherInstances.value && moonrakerInstance.value !== '') {
        services = services.filter((name: string) => (!name.toLowerCase().startsWith('moonraker-') && name.toLowerCase() !== 'moonraker') || name === moonrakerInstance.value)
    }

    return services.sort()
})

const powerDevices = computed(() => {
    const devices = powerStore.getDevices ?? []

    return devices.filter((device: ServerPowerStateDevice) => !device.device.startsWith('_'))
})

const powerDeviceDialogTitle = computed(() =>
    dialogPowerDeviceChange.value.value === 'off'
        ? t('PowerDeviceChangeDialog.TurnDeviceOn', { device: dialogPowerDeviceChange.value.device })
        : t('PowerDeviceChangeDialog.TurnDeviceOff', { device: dialogPowerDeviceChange.value.device })
)

function checkDialog(executableFunction: (serviceName: string) => void, serviceName: string, action: string) {
    if (!printerIsPrinting.value) {
        executableFunction(serviceName)
        return
    }

    dialogConfirmation.value.executableFunction = executableFunction
    dialogConfirmation.value.serviceName = serviceName

    const actionUppercase = action.trim().charAt(0).toUpperCase() + action.trim().slice(1)
    let titleKey = 'App.TopCornerMenu.ConfirmationDialog.Title.Service' + actionUppercase
    let descriptionKey = 'App.TopCornerMenu.ConfirmationDialog.Description.Service' + actionUppercase
    let buttonKey = 'App.TopCornerMenu.' + actionUppercase

    if (serviceName === 'klipper' && ['stop', 'restart', 'firmwareRestart'].includes(action)) {
        titleKey = 'App.TopCornerMenu.ConfirmationDialog.Title.' + (action !== 'stop' ? 'Klipper' : 'Service') + actionUppercase
        descriptionKey = 'App.TopCornerMenu.ConfirmationDialog.Description.Klipper' + actionUppercase

        if (action === 'firmwareRestart') buttonKey = 'App.TopCornerMenu.KlipperFirmwareRestart'
    } else if (serviceName === 'host') {
        titleKey = 'App.TopCornerMenu.ConfirmationDialog.Title.Host' + actionUppercase
        descriptionKey = 'App.TopCornerMenu.ConfirmationDialog.Description.Host' + actionUppercase
    }

    dialogConfirmation.value.title = t(titleKey)
    dialogConfirmation.value.description = t(descriptionKey)
    dialogConfirmation.value.actionButtonText = t(buttonKey)
    dialogConfirmation.value.show = true
}

function executeDialog() {
    dialogConfirmation.value.executableFunction?.(dialogConfirmation.value.serviceName ?? '')
}

function klipperRestart() {
    showMenu.value = false
    serverStore.addEvent({ message: 'RESTART', type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: 'RESTART' })
}

function klipperFirmwareRestart() {
    showMenu.value = false
    serverStore.addEvent({ message: 'FIRMWARE_RESTART', type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: 'FIRMWARE_RESTART' })
}

function changeSwitch(device: ServerPowerStateDevice, value: string) {
    dialogPowerDeviceChange.value.device = device.device
    dialogPowerDeviceChange.value.value = value

    const confirmOnPowerDeviceChange = guiStore.uiSettings.confirmOnPowerDeviceChange
    if (confirmOnPowerDeviceChange) {
        dialogPowerDeviceChange.value.show = true
    } else {
        powerDeviceToggle()
    }
}

function powerDeviceToggle() {
    const rpc = dialogPowerDeviceChange.value.value === 'off' ? 'machine.device_power.on' : 'machine.device_power.off'
    webSocketClient.emit(rpc, { [dialogPowerDeviceChange.value.device]: null }, { action: 'server/power/responseToggle' })
}

function hostReboot() {
    showMenu.value = false
    webSocketClient.emit('machine.reboot', {})
}

function hostShutdown() {
    showMenu.value = false
    webSocketClient.emit('machine.shutdown', {})
}
</script>
