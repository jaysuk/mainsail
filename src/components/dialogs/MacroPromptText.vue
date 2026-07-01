<template>
    <v-row>
        <v-col>
            <p class="mb-0">{{ text }}</p>
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ServerStateEventPrompt } from '@/store/server/types'

const props = defineProps<{
    event: ServerStateEventPrompt
}>()

const text = computed(() => props.event.message)
</script>
