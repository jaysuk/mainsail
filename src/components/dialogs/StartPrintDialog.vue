<template>
    <v-dialog v-model="showDialog" :max-width="400" content-class="overflow-x-hidden" @click:outside="closeDialog" @keydown.esc="closeDialog">
        <v-card>
            <start-print-dialog-thumbnail :file="file" :current-path="currentPath" />
            <v-card-title class="text-h5">{{ t('Dialogs.StartPrint.Headline') }}</v-card-title>
            <v-card-text class="pb-0">
                <p class="body-2">
                    {{ question }}
                </p>
            </v-card-text>
            <start-print-dialog-afc v-if="afcExists" :file="file" />
            <start-print-dialog-mmu v-else-if="existsMmu" :file="file" />
            <start-print-dialog-spoolman v-else-if="existsSpoolman" :file="file" />
            <start-print-dialog-timelapse v-if="existsTimelapse" />
            <v-divider v-if="showDivider" class="my-0" />
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="closeDialog">{{ t('Buttons.Cancel') }}</v-btn>
                <v-btn color="primary" variant="text" :disabled="printerIsPrinting || !klipperReadyForGui" @click="startPrint(file.filename)">
                    {{ t('Dialogs.StartPrint.Print') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FileStateGcodefile } from '@/store/files/types'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import StartPrintDialogThumbnail from '@/components/dialogs/StartPrintDialogThumbnail.vue'
import StartPrintDialogAfc from '@/components/dialogs/StartPrintDialogAfc.vue'
import StartPrintDialogMmu from '@/components/dialogs/StartPrintDialogMmu.vue'
import StartPrintDialogSpoolman from '@/components/dialogs/StartPrintDialogSpoolman.vue'
import StartPrintDialogTimelapse from '@/components/dialogs/StartPrintDialogTimelapse.vue'
import { useBase } from '@/composables/useBase'
import { useAfc } from '@/composables/useAfc'
import { usePrinterStore } from '@/store/printer'
import { useServerSpoolmanStore } from '@/store/server/spoolman'
import { useFilesStore } from '@/store/files'
import { webSocketClient } from '@/plugins/webSocketClient'

const props = withDefaults(
    defineProps<{
        currentPath?: string
        file: FileStateGcodefile
    }>(),
    {
        currentPath: '',
    }
)

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()
const { printerIsPrinting, klipperReadyForGui, moonrakerComponents } = useBase()
const { afcExists } = useAfc()
const printerStore = usePrinterStore()
const spoolmanStore = useServerSpoolmanStore()

const existsMmu = computed(() => printerStore.mmu?.enabled && printerStore.mmu?.gate !== -2)

const existsSpoolman = computed(() => moonrakerComponents.value.includes('spoolman'))

const existsTimelapse = computed(() => moonrakerComponents.value.includes('timelapse'))

const showDivider = computed(() => afcExists.value || existsSpoolman.value || existsTimelapse.value)

const active_spool = computed<ServerSpoolmanStateSpool | null>(() => spoolmanStore.active_spool ?? null)

const question = computed(() => {
    if (active_spool.value) return t('Dialogs.StartPrint.DoYouWantToStartFilenameFilament', { filename: props.file?.filename ?? 'unknown' })

    return t('Dialogs.StartPrint.DoYouWantToStartFilename', { filename: props.file?.filename ?? 'unknown' })
})

function closeDialog() {
    showDialog.value = false
}

function startPrint(filename = '') {
    filename = (props.currentPath + '/' + filename).substring(1)
    closeDialog()
    webSocketClient.emit('printer.print.start', { filename: filename }, { action: 'switchToDashboard' })
}

watch(showDialog, (newVal) => {
    if (!newVal || !props.file || props.file.metadataPulled || props.file.metadataRequested) return

    const fullPath = ['gcodes']
    if (props.currentPath) fullPath.push(props.currentPath.replace(/^\/+/, ''))
    fullPath.push(props.file.filename)
    useFilesStore().requestMetadata([{ filename: fullPath.join('/') }])
})
</script>
