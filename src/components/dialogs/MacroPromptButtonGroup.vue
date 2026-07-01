<template>
    <v-row>
        <v-col class="text-center py-0">
            <macro-prompt-button v-for="(button, index) in children" :key="'prompt_' + groupIndex + '_' + index" :event="button" />
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import MacroPromptButton from '@/components/dialogs/MacroPromptButton.vue'
import type { ServerStateEventPrompt } from '@/store/server/types'

defineProps<{
    children: ServerStateEventPrompt[]
    groupIndex: number
}>()
</script>
