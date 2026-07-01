<template>
    <v-dialog v-model="showDialog" width="800" persistent :fullscreen="isMobile">
        <panel :title="setActiveSpool ? t('Panels.SpoolmanPanel.ChangeSpool') : t('Panels.SpoolmanPanel.SelectSpool')" :icon="mdiAdjust" card-class="spoolman-change-spool-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="close">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-title>
                <v-text-field v-model="search" :append-inner-icon="mdiMagnify" :label="t('Panels.SpoolmanPanel.Search')" variant="outlined" density="compact" hide-details style="max-width: 300px" />
                <v-spacer />
                <v-btn v-if="afcLane" :title="t('Panels.SpoolmanPanel.EjectSpool')" class="px-2 minwidth-0 ml-3" :loading="loadings.includes('ejectSpool')" @click="ejectSpool">
                    <v-icon>{{ mdiEject }}</v-icon>
                </v-btn>
                <v-btn :title="t('Panels.SpoolmanPanel.Refresh')" class="px-2 minwidth-0 ml-3" :loading="loadings.includes('refreshSpools')" @click="refreshSpools">
                    <v-icon>{{ mdiRefresh }}</v-icon>
                </v-btn>
                <v-btn v-if="spoolManagerUrl" :title="t('Panels.SpoolmanPanel.OpenSpoolManager')" class="px-2 minwidth-0 ml-3" @click="openSpoolManager">
                    <v-icon>{{ mdiDatabase }}</v-icon>
                </v-btn>
            </v-card-title>
            <v-card-text class="px-0 pb-0">
                <v-data-table :headers="headers" :items="spools" item-value="id" :search="search" :sort-by="[{ key: 'last_used', order: 'desc' }]" :custom-filter="customFilter">
                    <template #no-data>
                        <div class="text-center">{{ search ? t('Panels.SpoolmanPanel.NoResults') : t('Panels.SpoolmanPanel.NoSpools') }}</div>
                    </template>

                    <template #item="{ item }">
                        <SpoolmanChangeSpoolDialogRow :key="item.id" :spool="item" :max_id_digits="max_spool_id_digits" @set-spool="setSpool" />
                    </template>
                </v-data-table>
            </v-card-text>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick, mdiAdjust, mdiDatabase, mdiMagnify, mdiRefresh, mdiEject } from '@mdi/js'
import type { InternalItem } from 'vuetify'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import SpoolmanChangeSpoolDialogRow from '@/components/dialogs/SpoolmanChangeSpoolDialogRow.vue'
import { useBase } from '@/composables/useBase'
import { useServerSpoolmanStore } from '@/store/server/spoolman'
import { usePrinterStore } from '@/store/printer'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useServerStore } from '@/store/server'

const props = withDefaults(
    defineProps<{
        tool?: string | null
        afcLane?: string | null
        setActiveSpool?: boolean
    }>(),
    {
        tool: null,
        afcLane: null,
        setActiveSpool: true,
    }
)

const showDialog = defineModel<boolean>({ required: true })

const emit = defineEmits<{
    'select-spool': [spool: ServerSpoolmanStateSpool]
}>()

const { t } = useI18n()
const { isMobile, loadings, spoolManagerUrl } = useBase()
const spoolmanStore = useServerSpoolmanStore()
const printerStore = usePrinterStore()

const search = ref('')

const spools = computed<ServerSpoolmanStateSpool[]>(() => spoolmanStore.spools ?? [])

const max_spool_id_digits = computed<number>(() => {
    const max_id = spoolmanStore.spools.reduce((x: number, s: ServerSpoolmanStateSpool) => Math.max(x, s.id), 0)

    return max_id.toString().length
})

const headers = computed(() => [
    {
        title: ' ',
        align: 'start' as const,
        sortable: false,
    },
    {
        title: t('Panels.SpoolmanPanel.Filament'),
        align: 'start' as const,
        key: 'filament.name',
        sortable: false,
    },
    {
        title: t('Panels.SpoolmanPanel.Material'),
        align: 'center' as const,
        key: 'filament.material',
    },
    {
        title: t('Panels.SpoolmanPanel.LastUsed'),
        align: 'end' as const,
        key: 'last_used',
    },
    {
        title: t('Panels.SpoolmanPanel.Weight'),
        align: 'end' as const,
        key: 'remaining_weight',
    },
])

const existsSaveVariables = computed(() => {
    const settings = printerStore.configfile?.settings ?? {}

    return 'save_variables' in settings
})

function openSpoolManager() {
    window.open(spoolManagerUrl.value, '_blank')
}

function refresh() {
    spoolmanStore.refreshSpools()
}

function close() {
    showDialog.value = false
}

function refreshSpools() {
    spoolmanStore.refreshSpools()
}

function customFilter(_value: string, search: string, item?: InternalItem<ServerSpoolmanStateSpool>): boolean {
    const spool = item!.raw
    if (search.trim().startsWith('web+spoolman:s-')) {
        const spoolId = parseInt(search.split('-')[1] ?? '-1')
        return spool.id === spoolId
    }

    const querySplits = search.toLowerCase().split(' ')
    const searchArray = [spool.id.toString(), spool.comment, spool.filament.name, spool.filament.vendor?.name, spool.filament.material, spool.location]

    for (const query of querySplits) {
        const result = searchArray.some((q) => q?.toLowerCase().includes(query))

        if (!result) return false
    }

    return true
}

function sendGcode(gcode: string) {
    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode })
}

function setMacroVariable(spool: ServerSpoolmanStateSpool) {
    // Set spool_id for tool
    sendGcode(`SET_GCODE_VARIABLE MACRO=${props.tool} VARIABLE=spool_id VALUE=${spool.id}`)

    // Close dialog if save_variables is not enabled
    if (!existsSaveVariables.value) {
        close()
        return
    }

    // Set spool_id to save_variable
    sendGcode(`SAVE_VARIABLE VARIABLE=${props.tool?.toLowerCase()}__spool_id VALUE=${spool.id}`)
}

function setSpool(spool: ServerSpoolmanStateSpool) {
    // If dialog is used for selection only, bypass setting of active spool and propogate event
    if (!props.setActiveSpool) {
        emit('select-spool', spool)
        close()
        return
    }

    // if afcLane is set, execute SET_SPOOL_ID and close, because it's not an active printing spool change
    if (props.afcLane) {
        sendGcode(`SET_SPOOL_ID LANE=${props.afcLane} SPOOL_ID=${spool.id}`)
        close()
        return
    }

    // if tool is set
    // -> execute setMacroVariable
    // -> write to lane database
    // and close, because it's not an active printing spool change
    if (props.tool) {
        // more infos can be found in the orcaslicer repo:
        // https://github.com/OrcaSlicer/OrcaSlicer/blob/e700113b39f39b837175c680929538aa9655a9f9/src/slic3r/Utils/MoonrakerPrinterAgent.cpp#L727
        webSocketClient.emit('server.database.post_item', {
            namespace: 'lane_data',
            key: props.tool,
            value: {
                // must be a string for orcaslicer and this will be the filament slot number
                lane: props.tool.substring(1),
                color: spool.filament.color_hex,
                material: spool.filament.material,
                bed_temp: spool.filament.settings_bed_temp,
                nozzle_temp: spool.filament.settings_extruder_temp,
            },
        })

        setMacroVariable(spool)
        close()
        return
    }

    spoolmanStore.setActiveSpool(spool.id)

    close()
}

function ejectSpool() {
    sendGcode(`SET_SPOOL_ID LANE=${props.afcLane} SPOOL_ID=`)
    close()
}

watch(showDialog, (newVal) => {
    if (!newVal) return

    refresh()
    search.value = ''
})
</script>
