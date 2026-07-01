<template>
    <form @submit.prevent="submit">
        <v-text-field
            v-model="position"
            :label="`[ ${label} ]`"
            :suffix="suffix"
            :disabled="disabled"
            :step="step"
            :readonly="readonly"
            hide-details="auto"
            type="number"
            hide-spin-buttons
            variant="outlined"
            reverse
            density="compact"
            @blur="onBlur"
            @focus="!readonly ? ($event.target as HTMLInputElement)?.select() : undefined"></v-text-field>
    </form>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        currentPos: string
        label?: string
        suffix?: string
        step?: number
        disabled?: boolean
        readonly?: boolean
    }>(),
    { step: 1 }
)

const emit = defineEmits<{ submit: [] }>()

const position = defineModel<string>({ required: true })

function onBlur() {
    if (position.value !== props.currentPos) {
        position.value = props.currentPos
    }
}

function submit(): void {
    emit('submit')
}
</script>
