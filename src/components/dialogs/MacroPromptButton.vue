<template>
    <v-btn :color="color" class="ma-2" @click="sendCommand">{{ text }}</v-btn>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ServerStateEventPrompt } from '@/store/server/types'
import { useControl } from '@/composables/useControl'

const props = defineProps<{
    event: ServerStateEventPrompt
}>()

const { doSend } = useControl()

const splits = computed(() => props.event.message.split('|'))

const text = computed(() => splits.value[0])

const command = computed(() => splits.value[1] ?? text.value)

const color = computed(() => splits.value[2] ?? '')

function sendCommand() {
    doSend(command.value)
}
</script>
