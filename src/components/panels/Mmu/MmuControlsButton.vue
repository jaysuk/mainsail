<template>
    <v-tooltip location="top" :disabled="!showTooltip">
        <template #activator="{ props: activatorProps }">
            <v-btn ref="button" block :size="size" color="secondary" :disabled="disabled" :loading="btnLoading" v-bind="activatorProps" @click="sendCommand">
                <v-icon :start="!showTooltip">{{ icon }}</v-icon>
                <template v-if="!showTooltip">{{ text }}</template>
            </v-btn>
        </template>
        <span>{{ text }}</span>
    </v-tooltip>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useBase } from '@/composables/useBase'
import { useMmu } from '@/composables/useMmu'
import { useGuiStore } from '@/store/gui'

const props = withDefaults(
    defineProps<{
        disabled: boolean
        icon: string
        text: string
        command: string
        size?: 'small' | 'large'
    }>(),
    {
        size: 'small',
    }
)

const { loadings } = useBase()
const { doSend } = useMmu()
const guiStore = useGuiStore()

const showTooltip = ref(false)
const button = ref<{ $el: HTMLElement } | null>(null)

const largeFilamentStatus = computed<boolean>(() => guiStore.view.mmu.largeFilamentStatus ?? false)

const btnLoading = computed(() => loadings.value.includes(props.command.toLowerCase()))

function calcBtnSize() {
    const width = button.value?.$el.clientWidth ?? undefined

    if (width === undefined || width > 130) {
        showTooltip.value = false
        return
    }

    showTooltip.value = true
}

function sendCommand() {
    doSend(props.command, props.command.toLowerCase())
}

onMounted(() => {
    calcBtnSize()
    window.addEventListener('resize', calcBtnSize)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', calcBtnSize)
})

watch(largeFilamentStatus, () => {
    calcBtnSize()
})
</script>
