<template>
    <v-row dense>
        <v-col class="pa-0">
            <v-list-subheader class="_tool-slider-subheader px-1">
                <v-icon size="small" class="mr-2">
                    {{ icon }}
                </v-icon>
                <span>{{ label }}</span>
                <v-btn v-if="value !== defaultValue && !hasInputField" size="x-small" icon class="ml-2" :disabled="isLocked" @click="resetSlider">
                    <v-icon>{{ mdiRestart }}</v-icon>
                </v-btn>
                <v-spacer></v-spacer>
                <span v-if="!hasInputField" class="font-weight-bold">{{ value }} {{ unit }}</span>
                <form @submit.prevent="submitInput">
                    <v-text-field
                        v-if="hasInputField"
                        v-model="numInput"
                        :error="errors().length > 0"
                        :suffix="unit"
                        type="number"
                        hide-spin-buttons
                        hide-details
                        variant="outlined"
                        density="compact"
                        class="_slider-input d-flex align-center pt-1"
                        @blur="numInput = value"
                        @focus="($event.target as HTMLInputElement)?.select()"
                        @keydown="checkInvalidChars">
                        <template v-if="value !== defaultValue || value !== numInput" #append-inner>
                            <v-icon size="small" @click="resetSlider">{{ mdiRestart }}</v-icon>
                        </template>
                    </v-text-field>
                </form>
            </v-list-subheader>
            <transition name="fade">
                <!-- display errors-->
                <div v-show="errors().length > 0" class="_error-msg d-flex justify-end">
                    {{ errors()[0] }}
                </div>
            </transition>
            <v-card-text class="pa-0 d-flex align-center">
                <v-btn v-if="lockSliders && isTouchDevice" variant="plain" size="small" icon class="_lock-button" @click="isLocked = !isLocked">
                    <v-icon size="small" :color="isLocked ? 'red' : ''">
                        {{ isLocked ? mdiLockOutline : mdiLockOpenVariantOutline }}
                    </v-icon>
                </v-btn>
                <v-slider
                    v-model="value"
                    v-touch="{ start: resetLockTimer }"
                    :disabled="isLocked"
                    :min="min"
                    :max="processedMax"
                    :color="colorBar"
                    hide-details
                    @update:model-value="changeSlider">
                    <template #prepend>
                        <v-icon :disabled="isLocked || value <= min" @click="decrement">{{ mdiMinus }}</v-icon>
                    </template>

                    <template #append>
                        <v-icon :disabled="isLocked || (value >= max && !dynamicRange)" @click="increment">
                            {{ mdiPlus }}
                        </v-icon>
                    </template>
                </v-slider>
            </v-card-text>
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiLockOpenVariantOutline, mdiLockOutline, mdiMinus, mdiPlus, mdiRestart } from '@mdi/js'
import { useBase } from '@/composables/useBase'
import { useGuiStore } from '@/store/gui'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const props = withDefaults(
    defineProps<{
        target: number
        command: string
        attributeName?: string
        label?: string
        icon?: string
        unit?: string
        attributeScale?: number
        min?: number
        max?: number
        hasInputField?: boolean
        dynamicRange?: boolean
        defaultValue?: number
        step?: number
        multi?: number
    }>(),
    {
        attributeName: '',
        label: '',
        icon: '',
        unit: '%',
        attributeScale: 1,
        min: 0,
        max: 100,
        hasInputField: false,
        dynamicRange: false,
        defaultValue: 100,
        step: 100,
        multi: 1,
    }
)

const { t } = useI18n()
const { isTouchDevice } = useBase()
const guiStore = useGuiStore()

let timeout: ReturnType<typeof setTimeout>
const isLocked = ref(false)
const invalidChars: string[] = ['e', 'E', '+']

const dynamicStep = ref(Math.floor(props.max / 2))
const value = ref(props.target * props.multi)
const numInput = ref(value.value)
const processedMax = ref(value.value >= 100 ? (Math.ceil(value.value / dynamicStep.value) + 1) * dynamicStep.value : 100)

const lockSliders = computed(() => guiStore.uiSettings.lockSlidersOnTouchDevices)
const lockSlidersDelay = computed(() => guiStore.uiSettings.lockSlidersDelay)
const colorBar = computed<string>(() => (props.max < value.value ? 'warning' : 'primary'))

watch(
    lockSliders,
    () => {
        isLocked.value = lockSliders.value && isTouchDevice.value
    },
    { immediate: true }
)

function startLockTimer(): void {
    const t = lockSlidersDelay.value
    if (!isTouchDevice.value || !lockSliders.value || t <= 0) return
    timeout = setTimeout(() => (isLocked.value = true), t * 1000)
}

function resetLockTimer(): void {
    clearTimeout(timeout)
}

function sendCmd(): void {
    const val = (Math.max(1, value.value) * props.attributeScale).toFixed(0)
    const gcode = `${props.command} ${props.attributeName}${val}`

    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode })

    startLockTimer()
}

// debounce replaces the removed vue-debounce-decorator @Debounce(250)
let debounceTimer: ReturnType<typeof setTimeout> | undefined
function changeSlider(): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        sendCmd()

        if (!props.dynamicRange) return
        if (value.value >= processedMax.value) {
            processedMax.value = value.value + dynamicStep.value
        }
    }, 250)
}

watch(
    value,
    (newVal) => {
        numInput.value = newVal
    },
    { immediate: true }
)

watch(
    () => props.target,
    (newVal) => {
        value.value = Math.round(newVal * props.multi)

        if (!props.dynamicRange) return
        if (value.value >= processedMax.value) {
            processedMax.value = value.value + dynamicStep.value
        }
    },
    { immediate: true }
)

watch(
    () => props.max,
    (newVal) => {
        processedMax.value = newVal > value.value ? newVal : Math.ceil(value.value / dynamicStep.value) * dynamicStep.value
    },
    { immediate: true }
)

function checkInvalidChars(event: KeyboardEvent): void {
    if (props.min >= 0 && !invalidChars.includes('-')) invalidChars.push('-')
    if (invalidChars.includes(event.key)) event.preventDefault()
}

function errors() {
    const errors = []
    if (numInput.value.toString() === '') {
        errors.push(t('App.NumberInput.NoEmptyAllowedError'))
    }
    if (numInput.value < props.min) {
        errors.push(t('App.NumberInput.GreaterOrEqualError', { min: props.min }))
    }
    if ((!props.dynamicRange && numInput.value > props.max) || numInput.value < props.min) {
        errors.push(t('App.NumberInput.MustBeBetweenError', { min: props.min, max: props.max }))
    }
    return errors
}

function submitInput(): void {
    if (errors().length > 0) return
    if (!props.dynamicRange && numInput.value > props.max) value.value = props.max
    else value.value = numInput.value
    sendCmd()
}

function resetSlider(): void {
    value.value = props.defaultValue
    numInput.value = props.defaultValue
    processedMax.value = props.max
    if (value.value >= processedMax.value) {
        processedMax.value = (Math.ceil(value.value / dynamicStep.value) + 1) * dynamicStep.value
    }

    sendCmd()
}

function decrement(): void {
    value.value = value.value > props.min ? Math.round(value.value - props.step) : props.min
    sendCmd()
}

function increment(): void {
    value.value = value.value < processedMax.value || props.dynamicRange ? Math.round(value.value + props.step) : processedMax.value
    sendCmd()
}

onBeforeUnmount(() => {
    clearTimeout(timeout)
    if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<style scoped>
._tool-slider-subheader {
    height: auto;
}

._lock-button {
    margin-left: -6px;
}

._error-msg {
    color: #ff5252;
    font-size: 12px;
    padding: 4px 16px 2px 0;
}

.fade-enter-active {
    animation: slide-in 0.15s reverse;
    opacity: 1;
}

.fade-leave-active {
    animation: slide-in 0.15s;
    opacity: 1;
}

@keyframes slide-in {
    100% {
        transform: translateY(-5px);
    }
}

._slider-input {
    min-width: 4.2rem;
    max-width: 5rem;
    margin-left: 12px;
}

._slider-input :deep(.v-input__slot) {
    min-height: 1rem !important;
}

._slider-input :deep(.v-text-field__slot input) {
    padding-top: 4px;
    padding-bottom: 4px;
}

._slider-input :deep(.v-input__append-inner) {
    margin: auto -5px auto 0 !important;
}
</style>
