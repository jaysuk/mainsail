<template>
    <form @submit.prevent="submit">
        <v-text-field
            v-model="value"
            :label="label"
            :suffix="unit"
            :error="invalidInput"
            :error-messages="inputErrors"
            :disabled="disabled"
            :step="step"
            :min="min"
            :max="max"
            :dec="dec"
            hide-spin-buttons
            hide-details="auto"
            variant="outlined"
            density="compact"
            class="d-flex align-top"
            @blur="value = target.toString()"
            @focus="($event.target as HTMLInputElement)?.select()"
            @keydown="checkInvalidChars">
            <template v-if="defaultValue !== null" #append-inner>
                <v-icon @click="resetToDefault">{{ value !== defaultValue.toString() ? mdiRestart : '' }}</v-icon>
            </template>
            <template v-if="hasSpinner" #append>
                <div class="_spin_button_group">
                    <v-btn
                        :disabled="(max !== null && inputValue >= max) || invalidInput || disabled"
                        class="mt-n3"
                        icon
                        variant="plain"
                        size="small"
                        @click="incrementValue">
                        <v-icon>{{ mdiChevronUp }}</v-icon>
                    </v-btn>
                    <v-btn
                        :disabled="inputValue <= min || invalidInput || disabled"
                        class="mb-n3"
                        icon
                        variant="plain"
                        size="small"
                        @click="decrementValue">
                        <v-icon>{{ mdiChevronDown }}</v-icon>
                    </v-btn>
                </div>
            </template>
        </v-text-field>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiChevronDown, mdiChevronUp, mdiRestart } from '@mdi/js'

const props = withDefaults(
    defineProps<{
        label: string
        param: string
        target: number
        defaultValue?: number | null
        min: number
        max?: number | null
        dec: number
        step?: number
        unit?: string
        hasSpinner?: boolean
        spinnerFactor?: number
        disabled?: boolean
        outputErrorMsg?: boolean
    }>(),
    {
        defaultValue: null,
        max: null,
        step: 1,
        unit: undefined,
        hasSpinner: false,
        spinnerFactor: 1,
        disabled: false,
        outputErrorMsg: false,
    }
)

const emit = defineEmits<{ submit: [{ name: string; value: number }] }>()

const { t } = useI18n()

const value = ref(props.target.toString())
const invalidChars: string[] = ['e', 'E', '+']

watch(
    () => props.target,
    () => {
        value.value = props.target.toString()
    }
)

// this only parses `value`, to escape an empty input
const inputValue = computed<number>(() => {
    if (value.value.toString() === '') return 0

    return parseFloat(value.value.replace(',', '.'))
})

const inputErrors = computed(() => {
    if (!props.outputErrorMsg) return []

    const errors = []
    if (props.max === null && inputValue.value < props.min) {
        errors.push(t('App.NumberInput.GreaterOrEqualError', { min: props.min }))
    }
    if (props.max !== null && (inputValue.value > props.max || inputValue.value < props.min)) {
        errors.push(t('App.NumberInput.MustBeBetweenError', { min: props.min, max: props.max }))
    }

    return errors
})

const invalidInput = computed(() => inputErrors.value.length > 0)

function submit(): void {
    if (invalidInput.value) return
    emit('submit', { name: props.param, value: inputValue.value })
}

function incrementValue(): void {
    if (inputValue.value + props.step * props.spinnerFactor < props.max! || props.max === null) {
        value.value = (Math.round((inputValue.value + props.step * props.spinnerFactor) * 10 ** props.dec) / 10 ** props.dec).toString()
    } else value.value = props.max.toString()

    submit()
}

function decrementValue(): void {
    if (inputValue.value - props.step * props.spinnerFactor > props.min) {
        value.value = (Math.round((inputValue.value - props.step * props.spinnerFactor) * 10 ** props.dec) / 10 ** props.dec).toString()
    } else value.value = props.min.toString()

    submit()
}

function resetToDefault(): void {
    value.value = props.defaultValue?.toString() ?? '0'
    submit()
}

function checkInvalidChars(event: KeyboardEvent): void {
    // add '-' to invalid characters if no negative input is allowed
    if (props.min >= 0 && !invalidChars.includes('-')) invalidChars.push('-')
    if (invalidChars.includes(event.key)) event.preventDefault()
}
</script>

<style scoped>
._spin_button_group {
    width: 24px;
    margin-top: -6px;
    margin-left: -6px;
    margin-bottom: -6px;
}

.v-input--has-state {
    margin-bottom: -18px !important;
}
</style>
