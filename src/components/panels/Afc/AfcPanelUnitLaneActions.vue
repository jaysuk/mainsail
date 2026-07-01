<template>
    <v-row>
        <v-col class="px-6 pt-3 pb-6 d-flex flex-row justify-space-between">
            <v-item-group class="_btn-group d-flex flex-nowrap w-100 py-0">
                <v-tooltip v-if="toolLoaded" location="top">
                    <template #activator="{ props: activatorProps }">
                        <v-btn :disabled="printerIsPrintingOnly" density="compact" class="flex-grow-1 px-0 first-btn" v-bind="activatorProps" @click="unloadLane">
                            <v-icon size="small">{{ mdiArrowUpBold }}</v-icon>
                        </v-btn>
                    </template>
                    <span>{{ t('Panels.AfcPanel.UnloadLane') }}</span>
                </v-tooltip>
                <v-tooltip v-else location="top">
                    <template #activator="{ props: activatorProps }">
                        <v-btn :disabled="printerIsPrintingOnly" density="compact" class="flex-grow-1 px-0 first-btn" v-bind="activatorProps" @click="loadLane">
                            <v-icon size="small">{{ mdiArrowDownBold }}</v-icon>
                        </v-btn>
                    </template>
                    <span>{{ t('Panels.AfcPanel.LoadLane') }}</span>
                </v-tooltip>
                <v-tooltip location="top">
                    <template #activator="{ props: activatorProps }">
                        <v-btn :disabled="toolLoaded || (!laneRunout && toolLoaded)" density="compact" class="flex-grow-1 px-0 last-btn" v-bind="activatorProps" @click="ejectLane">
                            <v-icon size="small">{{ mdiEject }}</v-icon>
                        </v-btn>
                    </template>
                    <span>{{ t('Panels.AfcPanel.EjectFilament') }}</span>
                </v-tooltip>
            </v-item-group>
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiArrowDownBold, mdiArrowUpBold, mdiEject } from '@mdi/js'
import { useBase } from '@/composables/useBase'
import { useAfc } from '@/composables/useAfc'
import { useControl } from '@/composables/useControl'

const props = defineProps<{
    name: string
}>()

const { t } = useI18n()
const { printerIsPrintingOnly } = useBase()
const { afcCurrentLane, getAfcLaneObject } = useAfc()
const { doSend } = useControl()

const lane = computed(() => getAfcLaneObject(props.name) as Record<string, any>)

const laneActive = computed(() => {
    const activeLaneName = (afcCurrentLane.value as { name?: string })?.name ?? ''

    return props.name === activeLaneName
})

const laneRunout = computed(() => laneActive.value && !lane.value.prep)

const toolLoaded = computed(() => lane.value.tool_loaded ?? false)

function loadLane() {
    doSend(`CHANGE_TOOL LANE=${props.name}`)
}

function unloadLane() {
    doSend(`TOOL_UNLOAD LANE=${props.name}`)
}

function ejectLane() {
    doSend(`LANE_UNLOAD LANE=${props.name}`)
}
</script>

<style scoped>
._btn-group {
    border-radius: 4px;

    .v-btn {
        border-radius: 0;
        border-color: rgba(255, 255, 255, 0.12);
        border-style: solid;
        border-width: thin;
        box-shadow: none;
        height: 28px;
        opacity: 0.8;
        min-width: auto !important;
    }

    .v-btn.first-btn {
        border-top-left-radius: inherit;
        border-bottom-left-radius: inherit;
    }

    .v-btn.last-btn {
        border-top-right-radius: inherit;
        border-bottom-right-radius: inherit;
    }

    .v-btn:not(.first-btn) {
        border-left-width: 0;
    }
}

html.theme--light ._btn-group .v-btn {
    border-color: rgba(0, 0, 0, 0.12);
}
</style>
