<template>
    <v-list-item>
        <v-btn size="small" class="w-100" :disabled="isDisabled" :loading="isLoading" @click="runMenuItem">
            <v-icon start>{{ item.icon }}</v-icon>
            {{ item.label }}
        </v-btn>
    </v-list-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MmuUnitGateContextMenuItem } from '@/composables/useMmu'
import { useMmu } from '@/composables/useMmu'
import { useBase } from '@/composables/useBase'

const props = defineProps<{
    item: MmuUnitGateContextMenuItem
    gateIndex: number
}>()

const emit = defineEmits<{
    'close-context-menu': []
}>()

const { loadings } = useBase()
const { canSend, doSend } = useMmu()

const isDisabled = computed<boolean>(() => {
    if (!props.item.disabled) return false

    if (typeof props.item.disabled === 'function') {
        return props.item.disabled(props.gateIndex)
    }

    return props.item.disabled
})

const isLoading = computed<boolean>(() => loadings.value.includes(props.item.loading))

function runMenuItem() {
    if (isDisabled.value) return

    emit('close-context-menu')

    if (props.item.action.kind === 'gcode' && 'command' in props.item.action) {
        if (!canSend.value) return

        doSend(`${props.item.action.command} GATE=${props.gateIndex}`, props.item.loading)
        return
    }

    if (props.item.action.kind === 'call' && 'fn' in props.item.action) {
        props.item.action.fn(props.gateIndex)
        return
    }
}
</script>
