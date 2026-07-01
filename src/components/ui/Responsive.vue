<template>
    <div ref="rootEl">
        <div v-if="!noHide && !init" style="visibility: hidden">
            <slot :el="el"></slot>
        </div>

        <slot :el="el"></slot>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useResponsive } from '@/composables/useResponsive'

const props = withDefaults(
    defineProps<{
        noHide?: boolean
        breakpoints?: Record<string, (el: DOMRect) => boolean>
    }>(),
    { noHide: false }
)

const rootEl = ref<HTMLElement | null>(null)
const { el } = useResponsive(rootEl, props.breakpoints)

const init = ref(false)

onMounted(() => {
    init.value = true
})
</script>
