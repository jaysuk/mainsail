<template>
    <div>
        <v-app-bar :height="topbarHeight" class="topbar pa-0">
            <v-app-bar-nav-icon tile @click.stop="naviDrawer = !naviDrawer" />
            <router-link to="/">
                <inline-svg v-if="sidebarLogo && isSvgLogo" :src="sidebarLogo" :class="logoClasses" />
                <img v-else-if="sidebarLogo" :src="sidebarLogo" :class="logoClasses" alt="Logo" />
                <mainsail-logo v-else :color="logoColor" :class="logoClasses" />
            </router-link>
            <v-toolbar-title class="text-no-wrap ml-0 pl-2 mr-2">{{ printerName }}</v-toolbar-title>
            <printer-selector v-if="countPrinters" />
            <v-spacer />
            <input ref="fileUploadAndStart" type="file" :accept="gcodeInputFileAccept.join(', ')" style="display: none" @change="uploadAndStart" />
            <v-btn
                v-if="showSaveConfigButton"
                tile
                :icon="smAndDown"
                :variant="mdAndUp ? 'text' : undefined"
                color="primary"
                class="button-min-width-auto px-3 d-none d-sm-flex save-config-button"
                :disabled="printerIsPrinting"
                :loading="loadings.includes('topbarSaveConfig')"
                @click="saveConfig">
                <v-icon class="d-md-none">{{ mdiContentSave }}</v-icon>
                <span class="d-none d-md-inline">{{ t('App.TopBar.SAVE_CONFIG') }}</span>
            </v-btn>
            <v-btn
                v-if="boolShowUploadAndPrint"
                tile
                :icon="smAndDown"
                :variant="mdAndUp ? 'text' : undefined"
                color="primary"
                class="button-min-width-auto px-3 d-none d-sm-flex upload-and-start-button"
                :loading="loadings.includes('btnUploadAndStart')"
                @click="btnUploadAndStart">
                <v-icon class="mr-md-2">{{ mdiFileUpload }}</v-icon>
                <span class="d-none d-md-inline">{{ t('App.TopBar.UploadPrint') }}</span>
            </v-btn>
            <v-btn
                v-if="klippyIsConnected"
                tile
                :icon="smAndDown"
                :variant="mdAndUp ? 'text' : undefined"
                color="error"
                class="button-min-width-auto px-3 emergency-button"
                :loading="loadings.includes('topbarEmergencyStop')"
                @click="btnEmergencyStop">
                <v-icon class="mr-md-2">{{ mdiAlertOctagonOutline }}</v-icon>
                <span class="d-none d-md-inline">{{ t('App.TopBar.EmergencyStop') }}</span>
            </v-btn>
            <the-notification-menu />
            <the-settings-menu />
            <the-top-corner-menu />
        </v-app-bar>
        <v-snackbar v-model="uploadSnackbar.status" :timeout="-1" location="bottom right">
            <strong>{{ t('App.TopBar.Uploading') }} {{ uploadSnackbar.filename }}</strong>
            <br />
            {{ Math.round(uploadSnackbar.percent) }} % @ {{ formatFilesize(Math.round(uploadSnackbar.speed)) }}/s
            <br />
            <v-progress-linear class="mt-2" :model-value="uploadSnackbar.percent" />
            <template #actions>
                <v-btn color="red" variant="text" style="min-width: auto" @click="cancelUpload">
                    <v-icon>{{ mdiClose }}</v-icon>
                </v-btn>
            </template>
        </v-snackbar>
        <emergency-stop-dialog v-model="showEmergencyStopDialog" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useToast } from 'vue-toast-notification'
import { validGcodeExtensions } from '@/store/variables'
import axios, { type AxiosProgressEvent, type CancelTokenSource } from 'axios'
import { formatFilesize } from '@/plugins/helpers'
import TheTopCornerMenu from '@/components/TheTopCornerMenu.vue'
import TheSettingsMenu from '@/components/TheSettingsMenu.vue'
import PrinterSelector from '@/components/ui/PrinterSelector.vue'
import MainsailLogo from '@/components/ui/MainsailLogo.vue'
import TheNotificationMenu from '@/components/notifications/TheNotificationMenu.vue'
import { topbarHeight } from '@/store/variables'
import { mdiAlertOctagonOutline, mdiContentSave, mdiFileUpload, mdiClose } from '@mdi/js'
import EmergencyStopDialog from '@/components/dialogs/EmergencyStopDialog.vue'
import InlineSvg from 'vue-inline-svg'
import { useBase } from '@/composables/useBase'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { useRootStore } from '@/store'
import { useGuiStore } from '@/store/gui'
import { usePrinterStore } from '@/store/printer'
import { useFarmStore } from '@/store/farm'
import { useServerStore } from '@/store/server'
import { useSocketStore } from '@/store/socket'
import { webSocketClient } from '@/plugins/webSocketClient'

interface UploadSnackbar {
    status: boolean
    filename: string
    percent: number
    speed: number
    total: number
    cancelTokenSource: CancelTokenSource | null
}

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const display = useDisplay()
const { isIOS, existGcodesRootDirectory, klippyIsConnected, klipperReadyForGui, printerIsPrinting, printer_state, apiUrl, loadings } = useBase()
const { sidebarLogo } = useMainsailTheme()
const rootStore = useRootStore()
const guiStore = useGuiStore()
const printerStore = usePrinterStore()
const farmStore = useFarmStore()
const serverStore = useServerStore()
const socketStore = useSocketStore()

const smAndDown = computed(() => display.smAndDown.value)
const mdAndUp = computed(() => display.mdAndUp.value)

const showEmergencyStopDialog = ref(false)

const uploadSnackbar = ref<UploadSnackbar>({
    status: false,
    filename: '',
    percent: 0,
    speed: 0,
    total: 0,
    cancelTokenSource: null,
})

const fileUploadAndStart = ref<HTMLInputElement | null>(null)

const gcodeInputFileAccept = computed(() => {
    if (isIOS.value) return []

    return validGcodeExtensions
})

const naviDrawer = computed({
    get: () => rootStore.naviDrawer,
    set: (newVal) => rootStore.setNaviDrawer(newVal),
})

const currentPage = computed(() => route.fullPath)

const saveConfigPending = computed(() => printerStore.configfile?.save_config_pending ?? false)

const hideSaveConfigForBedMash = computed(() => guiStore.uiSettings.hideSaveConfigForBedMash ?? false)

const showSaveConfigButton = computed(() => {
    if (!klipperReadyForGui.value) return false
    if (!hideSaveConfigForBedMash.value) return saveConfigPending.value

    let pendingKeys = Object.keys(printerStore.configfile?.save_config_pending_items ?? {})
    pendingKeys = pendingKeys.filter((key: string) => !key.startsWith('bed_mesh '))

    return pendingKeys.length > 0
})

const printerName = computed(() => {
    if (guiStore.general.printername.length) return guiStore.general.printername

    return printerStore.hostname
})

const countPrinters = computed(() => farmStore.countPrinters)

const boolHideUploadAndPrintButton = computed(() => guiStore.uiSettings.boolHideUploadAndPrintButton ?? false)

const isSvgLogo = computed(() => sidebarLogo.value.includes('.svg?timestamp=') || sidebarLogo.value.endsWith('.svg'))

const logoColor = computed(() => guiStore.uiSettings.logo)

const logoClasses = ['nav-logo', 'ml-2', 'mr-1', 'd-none', 'd-sm-flex']

const boolShowUploadAndPrint = computed(
    () => klippyIsConnected.value && existGcodesRootDirectory.value && ['standby', 'complete', 'cancelled'].includes(printer_state.value) && !boolHideUploadAndPrintButton.value
)

const defaultNavigationStateSetting = computed(() => guiStore.uiSettings.defaultNavigationStateSetting ?? 'alwaysOpen')

onMounted(() => {
    switch (defaultNavigationStateSetting.value) {
        case 'alwaysClosed':
            naviDrawer.value = false
            break

        case 'lastState':
            naviDrawer.value = (localStorage.getItem('naviDrawer') ?? 'true') === 'true'
            break

        default:
            naviDrawer.value = display.lgAndUp.value
    }
})

function btnEmergencyStop() {
    const confirmOnEmergencyStop = guiStore.uiSettings.confirmOnEmergencyStop
    if (confirmOnEmergencyStop) {
        showEmergencyStopDialog.value = true
        return
    }

    emergencyStop()
}

function emergencyStop() {
    showEmergencyStopDialog.value = false
    webSocketClient.emit('printer.emergency_stop', {}, { loading: 'topbarEmergencyStop' })
}

function saveConfig() {
    serverStore.addEvent({ message: 'SAVE_CONFIG', type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: 'SAVE_CONFIG' }, { loading: 'topbarSaveConfig' })
}

function btnUploadAndStart() {
    fileUploadAndStart.value?.click()
}

async function uploadAndStart() {
    if (!fileUploadAndStart.value?.files?.length) return

    socketStore.addLoading('btnUploadAndStart')
    const successFiles = []
    for (const file of fileUploadAndStart.value.files) {
        const result = await doUploadAndStart(file)
        successFiles.push(result)
    }

    socketStore.removeLoading('btnUploadAndStart')
    for (const file of successFiles) {
        const text = t('App.TopBar.UploadOfFileSuccessful', { file: file })
        useToast().success(text)
    }

    fileUploadAndStart.value.value = ''
    if (currentPage.value !== '/') await router.push('/')
}

function doUploadAndStart(file: File) {
    const formData = new FormData()
    const filename = file.name

    uploadSnackbar.value.filename = filename
    uploadSnackbar.value.status = true
    uploadSnackbar.value.percent = 0
    uploadSnackbar.value.speed = 0

    formData.append('file', file, filename)
    formData.append('print', 'true')

    return new Promise((resolve) => {
        uploadSnackbar.value.cancelTokenSource = axios.CancelToken.source()
        axios
            .post(apiUrl.value + '/server/files/upload', formData, {
                cancelToken: uploadSnackbar.value.cancelTokenSource.token,
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                    uploadSnackbar.value.percent = (progressEvent.progress ?? 0) * 100
                    uploadSnackbar.value.speed = progressEvent.rate ?? 0
                    uploadSnackbar.value.total = progressEvent.total ?? 0
                },
            })
            .then((result) => {
                uploadSnackbar.value.status = false
                resolve(result.data.result)
            })
            .catch(() => {
                uploadSnackbar.value.status = false
                socketStore.removeLoading('btnUploadAndStart')
                const text = t('App.TopBar.CannotUploadTheFile')
                useToast().error(text)
            })
    })
}

function cancelUpload(): void {
    uploadSnackbar.value.cancelTokenSource?.cancel()
    uploadSnackbar.value.status = false
}
</script>

<style scoped>
/*noinspection CssUnusedSymbol*/
:deep(.topbar .v-toolbar__content) {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
}

.button-min-width-auto {
    min-width: auto !important;
}
/*noinspection CssUnusedSymbol*/
.topbar .v-btn {
    height: 100% !important;
    max-height: none;
}
:deep(.topbar .nav-logo) {
    width: auto;
    height: 32px;
}
/*noinspection CssUnusedSymbol*/
.topbar .v-btn.v-btn--icon {
    /*noinspection CssUnresolvedCustomProperty*/
    width: var(--topbar-icon-btn-width) !important;
}
/*noinspection CssUnusedSymbol*/
@media (min-width: 768px) {
    header.topbar {
        z-index: 8 !important;
    }
}
</style>
