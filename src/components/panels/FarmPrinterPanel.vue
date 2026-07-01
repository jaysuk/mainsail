<template>
    <panel ref="panel" :icon="mdiPrinter3d" :title="printer_name" card-class="farmprinter-panel" :class="panelClass" :loading="printer.socket.isConnecting" :toolbar-color="isCurrentPrinter ? 'primary' : ''">
        <template #buttons>
            <v-menu v-if="showWebcamSwitch" title="Webcam">
                <template #activator="{ props: activatorProps }">
                    <v-btn variant="text" v-bind="activatorProps">
                        <v-icon size="small">{{ mdiWebcam }}</v-icon>
                        <v-icon size="small">{{ mdiMenuDown }}</v-icon>
                    </v-btn>
                </template>
                <v-list density="compact" class="py-0">
                    <v-list-item link @click="currentCamName = 'off'">
                        <template #prepend>
                            <v-icon size="small" class="mt-1 mr-2">{{ mdiWebcamOff }}</v-icon>
                        </template>
                        <v-list-item-title>{{ t('Panels.FarmPrinterPanel.WebcamOff') }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-for="webcam of printer_webcams" :key="webcam.name" link @click="currentCamName = webcam.name">
                        <template #prepend>
                            <v-icon size="small" class="mt-1 mr-2">{{ convertWebcamIcon(webcam.icon) }}</v-icon>
                        </template>
                        <v-list-item-title>{{ webcam.name }}</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>
        </template>
        <v-hover>
            <template #default="{ isHovering, props: hoverProps }">
                <div v-bind="hoverProps">
                    <v-img ref="imageDiv" :height="imageHeight" :src="printer_image" class="d-flex align-end">
                        <div v-if="printer.socket.isConnected && currentCamName !== 'off' && currentWebcam && 'service' in currentWebcam" class="webcamContainer">
                            <webcam-wrapper :webcam="currentWebcam" :printer-url="printerUrl" :show-fps="false" />
                        </div>
                        <v-card-title class="text-white py-2" style="background-color: rgba(0, 0, 0, 0.3); backdrop-filter: blur(3px)">
                            <v-row>
                                <v-col class="col-auto pr-0 d-flex align-center" style="width: 58px">
                                    <img v-if="printer_logo" :src="printer_logo" style="width: 100%" class="my-auto" alt="Logo" />
                                    <mainsail-logo v-else :color="printerLogoColor" style="width: 100%" class="my-auto" />
                                </v-col>
                                <v-col class="col" style="width: 100px">
                                    <h3 class="font-weight-regular">{{ printer_status }}</h3>
                                    <span v-if="printer_current_filename !== ''" class="subtitle-2 text-truncate px-0 text-disabled d-block">
                                        <v-icon size="small" class="mr-1">{{ mdiFileOutline }}</v-icon>
                                        {{ printer_current_filename }}
                                    </span>
                                </v-col>
                            </v-row>
                        </v-card-title>
                    </v-img>
                    <v-card-text v-if="printer_preview.length" class="px-0 py-2">
                        <v-container class="py-0">
                            <v-row>
                                <v-col v-for="object in printer_preview" :key="object.name" :class="object.name === 'ETA' ? 'col-auto' : 'col' + ' px-2'">
                                    <strong class="d-block text-center">{{ object.name }}</strong>
                                    <span class="d-block text-center">{{ object.value }}</span>
                                </v-col>
                            </v-row>
                        </v-container>
                    </v-card-text>
                    <v-fade-transition>
                        <v-overlay v-if="isHovering" contained :z-index="4" class="align-center justify-center">
                            <v-btn color="primary" @click="clickPrinter">
                                {{ printer.socket.isConnected ? t('Panels.FarmPrinterPanel.SwitchToPrinter') : t('Panels.FarmPrinterPanel.ReconnectToPrinter') }}
                            </v-btn>
                        </v-overlay>
                    </v-fade-transition>
                </div>
            </template>
        </v-hover>
    </panel>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FarmPrinterState } from '@/store/farm/printer/types'
import MainsailLogo from '@/components/ui/MainsailLogo.vue'
import Panel from '@/components/ui/Panel.vue'
import { mdiPrinter3d, mdiWebcam, mdiMenuDown, mdiWebcamOff, mdiFileOutline } from '@mdi/js'
import WebcamWrapper from '@/components/webcams/WebcamWrapper.vue'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { useWebcam } from '@/composables/useWebcam'
import { useFarmPrinterStore } from '@/store/farm/printer'
import { useRootStore } from '@/store/index'

const props = defineProps<{
    printer: FarmPrinterState
}>()

const { t } = useI18n()
const { sidebarBgImage } = useMainsailTheme()
const { convertWebcamIcon } = useWebcam()
const rootStore = useRootStore()

const farmPrinterStore = computed(() => useFarmPrinterStore(props.printer._namespace))

const imageHeight = ref(200)
let resizeObserver: ResizeObserver | null = null
let debounceTimer: ReturnType<typeof setTimeout> | undefined

const panel = ref<{ $el: HTMLElement } | null>(null)
const imageDiv = ref<{ $el: HTMLElement } | null>(null)

const printerUrl = computed(() => {
    const thisUrl = window.location.href.split('/')
    const protocol = thisUrl[0]

    let url = protocol + '//' + props.printer.socket.hostname
    if (80 !== props.printer.socket.webPort) url += ':' + props.printer.socket.webPort

    return url
})

const isCurrentPrinter = computed(() => farmPrinterStore.value.isCurrentPrinter)

const currentCamName = computed<string>({
    get: () => farmPrinterStore.value.getSetting('currentCamName', 'off'),
    set: (newVal) => farmPrinterStore.value.setSettings({ currentCamName: newVal }),
})

const printer_name = computed(() => farmPrinterStore.value.getPrinterName)

const printer_status = computed(() => farmPrinterStore.value.getStatus)

const printer_current_filename = computed(() => farmPrinterStore.value.getCurrentFilename)

const printer_webcams = computed<GuiWebcamStateWebcam[]>(() => farmPrinterStore.value.getPrinterWebcams)

const currentWebcam = computed<GuiWebcamStateWebcam | null>(() => {
    const currentCam = printer_webcams.value?.find((webcam: GuiWebcamStateWebcam) => webcam.name === currentCamName.value)
    if (currentCam) return currentCam

    return null
})

const printer_image = computed(() => {
    if (currentWebcam.value) return sidebarBgImage.value

    return farmPrinterStore.value.getImage ?? sidebarBgImage.value
})

const printer_logo = computed(() => farmPrinterStore.value.getLogo)

const printerLogoColor = computed(() => farmPrinterStore.value.getLogoColor)

const printer_preview = computed(() => farmPrinterStore.value.getPrinterPreview)

const showWebcamSwitch = computed(() => {
    if (printer_webcams.value.length == 0) return false

    return props.printer.socket.isConnected
})

const panelClass = computed<string[]>(() => {
    const output = []

    if (!props.printer.socket.isConnected && !props.printer.socket.isConnecting) output.push('disabledPrinter')

    return output
})

function clickPrinter() {
    if (props.printer.socket.isConnected) {
        rootStore.changePrinter({ printer: props.printer._namespace })
        return
    }

    farmPrinterStore.value.reconnect()
}

function calcImageHeight() {
    if (imageDiv.value?.$el?.clientWidth) {
        imageHeight.value = Math.round((imageDiv.value.$el.clientWidth / 3) * 2)
        return
    }

    imageHeight.value = 200
}

function handleResize() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        nextTick(() => {
            calcImageHeight()
        })
    }, 200)
}

onMounted(() => {
    calcImageHeight()

    resizeObserver = new ResizeObserver(() => handleResize())
    if (panel.value?.$el) resizeObserver.observe(panel.value.$el)
})

onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<style scoped>
.v-card.disabledPrinter {
    opacity: 0.6;
    filter: grayscale(70%);
}

.webcamContainer,
.webcamContainer .vue-load-image,
.webcamContainer > div,
.webcamContainer img {
    position: absolute !important;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

.webcamContainer img {
    height: 100%;
}

.webcamContainer .webcamFpsOutput {
    display: none;
}

.v-overlay {
    top: 48px;
}

:deep(.farmprinter-panel) {
    position: relative;
}
</style>
