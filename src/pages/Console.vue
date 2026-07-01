<template>
    <div class="d-flex flex-column">
        <v-row :class="consoleDirection === 'table' ? 'order-0' : 'order-1 mt-3'">
            <v-col>
                <console-textarea ref="gcodeCommandField" />
            </v-col>

            <v-col class="col-auto d-flex align-center">
                <v-btn class="mr-3 px-2 minwidth-0" color="lightgray" @click="clearConsole">
                    <v-icon>{{ mdiTrashCan }}</v-icon>
                </v-btn>
                <command-help-modal @on-command="commandClick($event)" />
                <v-menu location="bottom end" :close-on-content-click="false" :title="t('Console.SetupConsole')">
                    <template #activator="{ props: activatorProps }">
                        <v-btn class="ml-3 px-2 minwidth-0" color="lightgray" v-bind="activatorProps">
                            <v-icon>{{ mdiCog }}</v-icon>
                        </v-btn>
                    </template>
                    <v-list>
                        <v-list-item v-if="consoleDirection === 'shell'" class="minHeight36">
                            <v-checkbox v-model="autoscroll" class="mt-0" hide-details :label="t('Panels.MiniconsolePanel.Autoscroll')" />
                        </v-list-item>
                        <v-list-item class="minHeight36">
                            <v-checkbox v-model="hideWaitTemperatures" class="mt-0" hide-details :label="t('Console.HideTemperatures')" />
                        </v-list-item>
                        <v-list-item v-if="moonrakerComponents.includes('timelapse')" class="minHeight36">
                            <v-checkbox v-model="hideTlCommands" class="mt-0" hide-details :label="t('Console.HideTimelapse')" />
                        </v-list-item>
                        <v-list-item v-for="(filter, index) in customFilters" :key="index" class="minHeight36">
                            <v-checkbox v-model="filter.bool" class="mt-0" hide-details :label="filter.name" @update:model-value="toggleFilter(index, filter)" />
                        </v-list-item>
                        <v-list-item class="minHeight36">
                            <v-checkbox v-model="rawOutput" class="mt-0" hide-details :label="t('Panels.MiniconsolePanel.RawOutput')" />
                        </v-list-item>
                    </v-list>
                </v-menu>
            </v-col>
        </v-row>
        <v-row :class="consoleDirection === 'table' ? 'order-1' : 'order-0 mt-0'">
            <v-col :class="consoleDirection === 'table' ? 'col' : 'col pt-0'">
                <v-card>
                    <v-card-text class="pa-0">
                        <OverlayScrollbarsComponent ref="consoleScroll" class="consoleScrollContainer d-flex flex-column">
                            <console-table ref="console" :is-mini="false" :events="events" @command-click="commandClick" />
                        </OverlayScrollbarsComponent>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ConsoleTable from '@/components/console/ConsoleTable.vue'
import CommandHelpModal from '@/components/console/CommandHelpModal.vue'
import { mdiCog, mdiTrashCan } from '@mdi/js'
import ConsoleTextarea from '@/components/inputs/ConsoleTextarea.vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-vue'
import { useConsole } from '@/composables/useConsole'
import { useBase } from '@/composables/useBase'
import { useServerStore } from '@/store/server'

const { t } = useI18n()
const { consoleDirection, hideWaitTemperatures, hideTlCommands, customFilters, autoscroll, rawOutput, toggleFilter, clearConsole } = useConsole()
const { moonrakerComponents } = useBase()
const serverStore = useServerStore()

const consoleScroll = ref<OverlayScrollbarsComponentRef | null>(null)
const gcodeCommandField = ref<InstanceType<typeof ConsoleTextarea> | null>(null)

const events = computed(() => serverStore.getConsoleEvents(consoleDirection.value === 'table'))

function scrollToBottom() {
    nextTick(() => {
        if (!consoleScroll.value) return

        const overlayscroll = consoleScroll.value.osInstance()
        const viewport = overlayscroll?.elements().viewport
        if (!viewport) return

        viewport.scrollTop = viewport.scrollHeight
    })
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

function commandClick(msg: string): void {
    gcodeCommandField.value?.setGcode(msg)
}

onMounted(() => {
    if (consoleDirection.value === 'shell') scrollToBottom()
})
</script>

<style scoped>
.consoleScrollContainer {
    min-height: 200px;
    height: calc(var(--app-height) - 180px);
}

.gcode-command-field {
    font-family: 'Roboto Mono', monospace;
}
</style>
