<template>
    <div :class="'consoleTable ' + (isMini ? 'mini' : '')">
        <v-row v-if="events.length === 0" class="pa-0 ma-0">
            <v-col class="text-center py-3">{{ t('Console.Empty') }}</v-col>
        </v-row>
        <template v-else>
            <console-table-entry
                v-for="(event, index) of events"
                :key="index"
                class="consoleTableRow"
                :event="event"
                @command-click="commandClick" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ConsoleTableEntry from '@/components/console/ConsoleTableEntry.vue'
import type { ServerStateEvent } from '@/store/server/types'

const { t } = useI18n()

withDefaults(
    defineProps<{
        events: ServerStateEvent[]
        isMini?: boolean
    }>(),
    { isMini: false }
)

const emit = defineEmits<{ 'command-click': [msg: string] }>()

function commandClick(msg: string) {
    emit('command-click', msg)
}
</script>
