<template>
    <panel v-if="showPanel" :title="t('Machine.SystemPanel.SystemLoad')" :icon="mdiMemory" card-class="machine-systemload-panel" :collapsible="true">
        <template #buttons>
            <v-btn variant="text" tile class="d-none d-md-flex" @click="dialogDevices = true">
                <v-icon size="small" class="mr-1">{{ mdiUsb }}</v-icon>
                {{ t('Editor.DeviceDialog') }}
            </v-btn>
        </template>
        <v-card-text class="px-0 py-2">
            <div v-for="(mcu, index) of mcus" :key="mcu.name">
                <v-divider v-if="index" class="my-2" />
                <system-panel-mcu :mcu="mcu" />
            </div>
            <div v-if="hostStats">
                <v-divider v-if="mcus.length" class="my-2" />
                <system-panel-host />
            </div>
        </v-card-text>
        <devices-dialog v-model="dialogDevices" />
    </panel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { caseInsensitiveSort } from '@/plugins/helpers'
import { mdiMemory, mdiUsb } from '@mdi/js'
import SystemPanelHost from '@/components/panels/Machine/SystemPanelHost.vue'
import SystemPanelMcu from '@/components/panels/Machine/SystemPanelMcu.vue'
import DevicesDialog from '@/components/dialogs/DevicesDialog.vue'
import { useBase } from '@/composables/useBase'
import { usePrinterStore } from '@/store/printer'
import type { PrinterStateMcu } from '@/store/printer/types'
import { useServerStore } from '@/store/server'

const { t } = useI18n()
const { klipperReadyForGui } = useBase()
const printerStore = usePrinterStore()
const serverStore = useServerStore()

const dialogDevices = ref(false)

const mcus = computed<PrinterStateMcu[]>(() => {
    if (!klipperReadyForGui.value) return []

    const mcuList = printerStore.getMcus ?? []

    return caseInsensitiveSort(mcuList, 'name')
})

const hostStats = computed(() => serverStore.getHostStats ?? null)

const showPanel = computed(() => mcus.value.length > 0 || hostStats.value)
</script>

<style scoped>
.cursor--pointer {
    cursor: pointer;
}
</style>
