<template>
    <slot v-if="state === 'error'" name="error" />
    <slot v-else-if="state === 'loaded'" name="image" />
    <slot v-else name="preloader" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ src: string }>()

const state = ref<'loading' | 'loaded' | 'error'>('loading')

function load(src: string) {
    state.value = 'loading'

    const probe = new Image()
    probe.onload = () => {
        state.value = 'loaded'
    }
    probe.onerror = () => {
        state.value = 'error'
    }
    probe.src = src
}

watch(() => props.src, load, { immediate: true })
</script>
