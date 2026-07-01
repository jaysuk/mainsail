<template>
    <panel v-if="socketIsConnected && klipperState !== 'disconnected'" :icon="mdiConsoleLine" :title="t('Panels.MiniconsolePanel.Headline')" :collapsible="true" card-class="miniconsole-panel" :hide-buttons-on-collapse="true">
        <template #buttons>
            <v-btn icon="" variant="text" @click="clearConsole">
                <v-icon size="small">{{ mdiTrashCan }}</v-icon>
            </v-btn>
            <command-help-modal :in-toolbar="true" @on-command="commandClick" />
            <v-menu :close-on-content-click="false" :title="t('Panels.MiniconsolePanel.SetupConsole')">
                <template #activator="{ props: activatorProps }">
                    <v-btn icon="" variant="text" v-bind="activatorProps">
                        <v-icon size="small">{{ mdiCog }}</v-icon>
                    </v-btn>
                </template>
                <v-list>
                    <v-list-item v-if="consoleDirection === 'shell'" class="minHeight36">
                        <v-checkbox v-model="autoscroll" class="mt-0" hide-details :label="t('Panels.MiniconsolePanel.Autoscroll')" />
                    </v-list-item>
                    <v-list-item class="minHeight36">
                        <v-checkbox v-model="hideWaitTemperatures" class="mt-0" hide-details :label="t('Panels.MiniconsolePanel.HideTemperatures')" />
                    </v-list-item>
                    <v-list-item v-if="moonrakerComponents.includes('timelapse')" class="minHeight36">
                        <v-checkbox v-model="hideTlCommands" class="mt-0" hide-details :label="t('Panels.MiniconsolePanel.HideTimelapse')" />
                    </v-list-item>
                    <v-list-item v-for="(filter, index) in customFilters" :key="index" class="minHeight36">
                        <v-checkbox v-model="filter.bool" class="mt-0" hide-details :label="filter.name" @update:model-value="toggleFilter(index, filter)" />
                    </v-list-item>
                    <v-list-item class="minHeight36">
                        <v-checkbox v-model="rawOutput" class="mt-0" hide-details :label="t('Panels.MiniconsolePanel.RawOutput')" />
                    </v-list-item>
                </v-list>
            </v-menu>
        </template>
        <div class="d-flex flex-column">
            <v-card-text :class="consoleDirection === 'table' ? 'order-1' : 'order-2'">
                <console-textarea ref="gcodeCommandField" />
            </v-card-text>
            <v-card-text :class="(consoleDirection === 'table' ? 'order-2' : 'order-1') + ' pa-0'">
                <v-row>
                    <v-col>
                        <OverlayScrollbarsComponent ref="miniConsoleScroll" :style="'height: ' + consoleHeight + 'px;'" :options="{}">
                            <console-table :events="events" :is-mini="true" @command-click="commandClick" />
                            <v-divider />
                        </OverlayScrollbarsComponent>
                    </v-col>
                </v-row>
            </v-card-text>
        </div>
    </panel>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import ConsoleTable from '@/components/console/ConsoleTable.vue'
import Panel from '@/components/ui/Panel.vue'
import { mdiCog, mdiConsoleLine, mdiTrashCan } from '@mdi/js'
import CommandHelpModal from '@/components/console/CommandHelpModal.vue'
import ConsoleTextarea from '@/components/inputs/ConsoleTextarea.vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-vue'
import { useBase } from '@/composables/useBase'
import { useConsole } from '@/composables/useConsole'
import { useGuiConsoleStore } from '@/store/gui/console'
import { useServerStore } from '@/store/server'

const { t } = useI18n()
const { socketIsConnected, klipperState, moonrakerComponents } = useBase()
const { consoleDirection, hideWaitTemperatures, hideTlCommands, customFilters, autoscroll, rawOutput, toggleFilter, clearConsole } = useConsole()
const guiConsoleStore = useGuiConsoleStore()
const serverStore = useServerStore()

const miniConsoleScroll = ref<OverlayScrollbarsComponentRef | null>(null)
const gcodeCommandField = ref<InstanceType<typeof ConsoleTextarea> | null>(null)

const consoleHeight = computed(() => guiConsoleStore.height ?? 300)

const events = computed(() => serverStore.getConsoleEvents(consoleDirection.value === 'table', 250))

function scrollTo(position: number) {
    if (!miniConsoleScroll.value) return

    const instance = miniConsoleScroll.value.osInstance()
    const viewport = instance?.elements().viewport
    if (!viewport) return

    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) * (position / 100)
}

function scrollToBottom() {
    nextTick(() => {
        scrollTo(100)
    })
}

function commandClick(msg: string): void {
    gcodeCommandField.value?.setGcode(msg)
}

watch(events, () => {
    if (consoleDirection.value === 'shell' && autoscroll.value) {
        setTimeout(() => {
            scrollToBottom()
        }, 50)
    }
})

watch(autoscroll, (newVal) => {
    if (newVal) scrollToBottom()
})

onMounted(() => {
    if (consoleDirection.value === 'shell') scrollToBottom()
})
</script>

<style scoped>
.consoleTable {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
}

html.theme--light .consoleTable {
    border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
