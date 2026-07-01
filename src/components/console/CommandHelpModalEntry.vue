<template>
    <v-list-item class="px-0">
        <template #title>
            <span class="text-primary font-weight-bold cursor-pointer" @click="onCommand">{{ command }}</span>
        </template>
        <template v-if="description" #subtitle>
            <span class="text-wrap">{{ description }}</span>
        </template>
    </v-list-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePrinterStore } from '@/store/printer'

const props = defineProps<{ command: string }>()

const emit = defineEmits<{ 'click-on-command': [command: string] }>()

const printerStore = usePrinterStore()

const commands = computed<Record<string, { help?: string }>>(() => printerStore.gcode?.commands ?? {})
const commandObject = computed(() => commands.value[props.command] ?? {})
const description = computed<string | null>(() => commandObject.value.help ?? null)

function onCommand() {
    emit('click-on-command', props.command)
}
</script>
