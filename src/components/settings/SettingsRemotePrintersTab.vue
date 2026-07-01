<template>
    <div>
        <v-card v-if="!form.bool" flat>
            <v-card-text>
                <h3 class="text-h5 mb-3">{{ t('Settings.RemotePrintersTab.RemotePrinters') }}</h3>
                <v-alert v-if="!canAddPrinters" :icon="mdiAlertOutline" type="warning" variant="text">
                    {{ t('Settings.RemotePrintersTab.UseConfigJson') }}
                </v-alert>
                <div v-for="(printer, index) in printers" :key="printer.id ?? index">
                    <v-divider v-if="index" class="my-2" />
                    <settings-row :title="formatPrinterName(printer)" :loading="printer.socket?.isConnecting" :icon="printer.socket?.isConnected ? mdiCheckboxMarkedCircle : mdiCancel">
                        <v-btn size="small" variant="outlined" :disabled="!canAddPrinters" @click="editPrinter(printer)">
                            <v-icon start size="small">{{ mdiPencil }}</v-icon>
                            {{ t('Settings.Edit') }}
                        </v-btn>
                        <v-btn size="small" variant="outlined" class="ml-3 minwidth-0 px-2" color="error" :disabled="!canAddPrinters" @click="delPrinter(printer.id ?? '')">
                            <v-icon size="small">{{ mdiDelete }}</v-icon>
                        </v-btn>
                    </settings-row>
                </div>
            </v-card-text>
            <v-card-actions class="d-flex justify-end">
                <v-btn variant="text" color="primary" :disabled="!canAddPrinters" @click="createPrinter">
                    {{ t('Settings.RemotePrintersTab.AddPrinter') }}
                </v-btn>
            </v-card-actions>
        </v-card>
        <v-card v-else flat>
            <v-card-title>
                {{ form.id !== null ? t('Settings.RemotePrintersTab.EditPrinter') : t('Settings.RemotePrintersTab.AddPrinter') }}
            </v-card-title>
            <v-card-text>
                <settings-row :title="t('Settings.RemotePrintersTab.Hostname')">
                    <v-text-field
                        v-model="form.hostname"
                        :rules="[
                            (v: string) => !!v || 'Hostname is required',
                            (v: string) => !v.startsWith('http:') || 'invalid hostname/IP',
                            (v: string) => !v.startsWith('https:') || 'invalid hostname/IP',
                        ]"
                        hide-details="auto"
                        required
                        density="compact"
                        variant="outlined" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.RemotePrintersTab.Port')">
                    <v-text-field v-model="form.port" :rules="[(v: number) => !!v || 'Port is required']" hide-details="auto" required density="compact" variant="outlined" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.RemotePrintersTab.Path')">
                    <v-text-field v-model="form.path" :rules="[(v: string) => !v || v.startsWith('/') || 'Path must start with /']" variant="outlined" hide-details="auto" density="compact" />
                </settings-row>
                <template v-if="instancesDB !== 'moonraker'">
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.RemotePrintersTab.Name')" :sub-title="t('Settings.RemotePrintersTab.NameDescription')">
                        <v-text-field v-model="form.name" variant="outlined" hide-details="auto" density="compact" />
                    </settings-row>
                </template>
            </v-card-text>
            <v-card-actions class="d-flex justify-end">
                <v-btn variant="text" @click="form.bool = false">{{ t('Buttons.Cancel') }}</v-btn>
                <v-btn v-if="form.id === null" variant="text" color="primary" @click="storePrinter">
                    {{ t('Settings.RemotePrintersTab.AddPrinter') }}
                </v-btn>
                <v-btn v-else variant="text" color="primary" @click="updatePrinter">
                    {{ t('Settings.RemotePrintersTab.UpdatePrinter') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import type { GuiRemoteprintersStatePrinter } from '@/store/gui/remoteprinters/types'
import { mdiCancel, mdiCheckboxMarkedCircle, mdiDelete, mdiPencil, mdiAlertOutline } from '@mdi/js'
import { useGuiRemoteprintersStore } from '@/store/gui/remoteprinters'
import { useRootStore } from '@/store'

interface PrinterForm {
    bool: boolean
    hostname: string
    name: string
    port: number
    path: string | null
    id: string | null
    namespace: string | null
}

const { t } = useI18n()
const guiRemoteprintersStore = useGuiRemoteprintersStore()
const rootStore = useRootStore()

const form = ref<PrinterForm>({
    bool: false,
    hostname: '',
    port: 7125,
    path: '/',
    name: '',
    id: null,
    namespace: null,
})

const printers = computed(() => guiRemoteprintersStore.getRemoteprinters() ?? [])

const canAddPrinters = computed(() => rootStore.instancesDB !== 'json')

const instancesDB = computed(() => rootStore.instancesDB)

function formatPrinterName(printer: GuiRemoteprintersStatePrinter) {
    return printer.hostname + (printer.port !== 80 ? ':' + printer.port : '') + (printer.path ?? '')
}

function createPrinter() {
    form.value.hostname = ''
    form.value.port = 7125
    form.value.path = '/'
    form.value.name = ''
    form.value.id = null
    form.value.namespace = null
    form.value.bool = true
}

function storePrinter() {
    const printer = {
        hostname: form.value.hostname,
        port: form.value.port,
        name: form.value.name,
        path: form.value.path,
    }

    guiRemoteprintersStore.store({ values: printer })

    form.value.hostname = ''
    form.value.port = 7125
    form.value.name = ''
    form.value.id = null
    form.value.bool = false
}

function editPrinter(printer: GuiRemoteprintersStatePrinter) {
    form.value.id = printer.id ?? null
    form.value.hostname = printer.hostname
    form.value.port = printer.port
    form.value.path = printer.path ?? '/'
    form.value.name = printer.name ?? ''
    form.value.bool = true
}

function updatePrinter() {
    const values = {
        hostname: form.value.hostname,
        port: form.value.port,
        name: form.value.name,
        path: form.value.path,
    }

    guiRemoteprintersStore.update({ id: form.value.id ?? '', values })

    form.value.id = null
    form.value.hostname = ''
    form.value.port = 7125
    form.value.path = '/'
    form.value.name = ''
    form.value.bool = false
}

function delPrinter(id: string) {
    guiRemoteprintersStore.delete(id, rootStore.instancesDB)
}
</script>
