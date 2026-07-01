<template>
    <panel :title="t('Machine.EndstopPanel.Endstops')" :icon="mdiArrowExpandVertical" card-class="machine-endstop-panel" :collapsible="true">
        <v-card-text class="pb-0 pt-6">
            <EndstopPanelItem v-for="item in items" :key="item.name" :item="item" />
            <v-row v-if="items.length === 0">
                <v-col class="pt-0">
                    <p class="mb-0">{{ t('Machine.EndstopPanel.EndstopInfo') }}</p>
                </v-col>
            </v-row>
        </v-card-text>
        <v-card-actions class="pt-3">
            <v-spacer />
            <v-btn icon :loading="loadings.includes('queryEndstops')" @click="syncEndstops">
                <v-icon>{{ mdiSync }}</v-icon>
            </v-btn>
        </v-card-actions>
    </panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import EndstopPanelItem from '@/components/panels/Machine/EndstopPanelItem.vue'
import { mdiArrowExpandVertical, mdiSync } from '@mdi/js'
import type { EndstopItem } from '@/store/printer/types'
import { useBase } from '@/composables/useBase'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { loadings } = useBase()
const printerStore = usePrinterStore()

const items = computed<EndstopItem[]>(() => {
    let output: EndstopItem[] = []

    const endstops = printerStore.endstops ?? {}
    Object.keys(endstops).forEach((key) => {
        output.push({ type: 'endstop', name: key, value: endstops[key] })
    })

    // dont show probe values if there are no endstop values
    if (output.length === 0) return []

    output = output.sort((a, b) => a.name.localeCompare(b.name))

    if ('probe' in printerStore && 'last_query' in printerStore.probe) {
        const value = printerStore.probe.last_query ? 'TRIGGERED' : 'open'

        output.push({
            type: 'probe',
            name: printerStore.probe.name ?? 'probe',
            value,
        })
    }

    return output
})

const existsQueryProbe = computed(() => {
    const commands = printerStore.gcode?.commands ?? null
    if (commands) {
        return 'QUERY_PROBE' in commands
    }

    // fallback for older Klipper versions
    return 'probe' in printerStore
})

function syncEndstops() {
    webSocketClient.emit('printer.query_endstops.status', {}, { action: 'printer/getEndstopStatus', loading: 'queryEndstops' })

    if (existsQueryProbe.value) {
        useServerStore().addEvent({ message: 'QUERY_PROBE', type: 'command' })
        webSocketClient.emit('printer.gcode.script', { script: 'QUERY_PROBE' })
    }
}
</script>
