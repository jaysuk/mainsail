<template>
    <panel :icon="mdiAdjust" :title="title" card-class="spoolman-panel" :collapsible="true">
        <template #buttons>
            <spoolman-tools-dropdown v-if="toolsWithSpoolId.length > 0" :tools="toolsWithSpoolId" />
            <v-btn v-else icon="" variant="text" :title="changeSpoolTooltip" @click="showChangeSpoolDialog = true">
                <v-icon>{{ mdiSwapVertical }}</v-icon>
            </v-btn>
            <v-menu :close-on-content-click="false" location="bottom end">
                <template #activator="{ props: activatorProps }">
                    <v-btn icon="" variant="text" v-bind="activatorProps">
                        <v-icon>{{ mdiDotsVertical }}</v-icon>
                    </v-btn>
                </template>
                <v-list density="compact">
                    <v-list-item>
                        <v-btn size="small" class="w-100" @click="showEjectSpoolDialog = true">
                            <v-icon start>{{ mdiEject }}</v-icon>
                            {{ t('Panels.SpoolmanPanel.EjectSpool') }}
                        </v-btn>
                    </v-list-item>
                    <v-list-item v-if="spoolManagerUrl">
                        <v-btn size="small" class="w-100" @click="openSpoolManager">
                            <v-icon start>{{ mdiOpenInNew }}</v-icon>
                            {{ t('Panels.SpoolmanPanel.OpenSpoolManager') }}
                        </v-btn>
                    </v-list-item>
                </v-list>
            </v-menu>
        </template>
        <v-card-text v-if="active_spool === null">
            <v-row>
                <v-col class="text-center">
                    <p class="text-disabled">{{ t('Panels.SpoolmanPanel.NoActiveSpool') }}</p>
                    <v-btn size="small" color="primary" @click="showChangeSpoolDialog = true">
                        {{ t('Panels.SpoolmanPanel.SelectSpool') }}
                    </v-btn>
                </v-col>
            </v-row>
        </v-card-text>
        <spoolman-panel-active-spool v-else @change-spool="showChangeSpoolDialog = true" />
        <spoolman-change-spool-dialog v-model="showChangeSpoolDialog" />
        <confirmation-dialog
            v-model="showEjectSpoolDialog"
            :title="t('Panels.SpoolmanPanel.EjectSpool')"
            :text="t('Panels.SpoolmanPanel.EjectSpoolQuestion')"
            :action-button-text="t('Panels.SpoolmanPanel.EjectSpool')"
            action-button-color="primary"
            :icon="mdiEject"
            @action="ejectSpool" />
    </panel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiAdjust, mdiDotsVertical, mdiEject, mdiOpenInNew, mdiSwapVertical } from '@mdi/js'
import SpoolmanChangeSpoolDialog from '@/components/dialogs/SpoolmanChangeSpoolDialog.vue'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import SpoolmanPanelActiveSpool from '@/components/panels/Spoolman/SpoolmanPanelActiveSpool.vue'
import SpoolmanToolsDropdown from '@/components/panels/Spoolman/SpoolmanToolsDropdown.vue'
import { useBase } from '@/composables/useBase'
import { useServerSpoolmanStore } from '@/store/server/spoolman'
import { usePrinterStore } from '@/store/printer'

const { t } = useI18n()
const { spoolManagerUrl } = useBase()
const spoolmanStore = useServerSpoolmanStore()
const printerStore = usePrinterStore()

const showChangeSpoolDialog = ref(false)
const showEjectSpoolDialog = ref(false)

const health = computed(() => spoolmanStore.health ?? '')

const title = computed(() => {
    const headline = t('Panels.SpoolmanPanel.Headline')

    if (health.value === '' || health.value === 'healthy') return headline

    return `${headline} (${health.value})`
})

const active_spool = computed<ServerSpoolmanStateSpool | null>(() => spoolmanStore.active_spool ?? null)

const changeSpoolTooltip = computed<string>(() => {
    if (active_spool.value === null) return t('Panels.SpoolmanPanel.SelectSpool')

    return t('Panels.SpoolmanPanel.ChangeSpool')
})

const toolsWithSpoolId = computed(() =>
    Object.keys(printerStore)
        .filter((key) => /^gcode_macro T\d+$/i.test(key.toLowerCase()))
        .filter((keys) => {
            const object = (printerStore as unknown as Record<string, Record<string, unknown>>)[keys] ?? {}

            return Object.keys(object).some((key) => key.toLowerCase() === 'spool_id')
        })
)

function openSpoolManager() {
    window.open(spoolManagerUrl.value, '_blank')
}

function ejectSpool() {
    spoolmanStore.setActiveSpool(null)
}
</script>
