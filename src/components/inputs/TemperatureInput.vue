<template>
    <div class="d-flex align-center">
        <form @submit.prevent="setTemps">
            <v-text-field
                v-model.number="value"
                suffix="°C"
                type="number"
                density="compact"
                variant="outlined"
                hide-details
                hide-spin-buttons
                class="_temp-input"
                :style="inputStyle"
                @blur="value = target"
                @focus="($event.target as HTMLInputElement)?.select()" />
        </form>
        <v-menu v-if="presets.length" location="bottom end" title="Preheat">
            <template #activator="{ props: activatorProps }">
                <v-btn
                    :disabled="['printing', 'paused'].includes(printer_state)"
                    tabindex="-1"
                    size="x-small"
                    variant="plain"
                    v-bind="activatorProps"
                    class="pa-0"
                    style="min-width: 24px">
                    <v-icon>{{ mdiMenuDown }}</v-icon>
                </v-btn>
            </template>
            <v-list density="compact" class="py-0">
                <v-list-item
                    v-for="preset of presets"
                    :key="preset.value"
                    link
                    style="min-height: 32px"
                    @click="doSend(`${command} ${attributeName}=${name} TARGET=${preset.value}`)">
                    <div class="_preset">
                        <v-icon v-if="preset.value === 0" color="primary" size="small" class="_preset-icon">
                            {{ mdiSnowflake }}
                        </v-icon>
                        <v-icon v-else size="small" class="_preset-icon">{{ mdiFire }}</v-icon>
                        <span style="padding-top: 2px">{{ preset.value }}°C</span>
                    </div>
                </v-list-item>
            </v-list>
        </v-menu>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toast-notification'
import { mdiSnowflake, mdiFire, mdiMenuDown } from '@mdi/js'
import { useControl } from '@/composables/useControl'
import { useBase } from '@/composables/useBase'

const props = withDefaults(
    defineProps<{
        name: string
        target: number
        min_temp: number
        max_temp: number
        command: string
        attributeName: string
        presets?: { value: number; text: string }[]
        inputDigits?: number
    }>(),
    {
        presets: () => [],
        inputDigits: 3,
    }
)

const { t } = useI18n()
const { doSend } = useControl()
const { printer_state } = useBase()

const value = ref<number | string>(0)

const inputStyle = computed(() => {
    const PER_DIGIT = 10
    const WIDTH_C_GRAD = 21
    const PADDING = 20
    const SPACE_FOR_DECIMAL = 10

    const width = props.inputDigits * PER_DIGIT + WIDTH_C_GRAD + PADDING + SPACE_FOR_DECIMAL

    return { width: `${width}px` }
})

function normalizeValue(raw: number | string | null): number {
    if (typeof raw === 'string') raw = parseFloat(raw)
    if (raw === null || isNaN(raw)) return 0
    return raw
}

function setTemps(): void {
    const temp = normalizeValue(value.value)

    if (temp > props.max_temp) {
        value.value = props.target
        const msg = t('Panels.TemperaturePanel.TempTooHigh', { name: props.name, max: props.max_temp })
        useToast().error(msg)
        return
    }

    if (temp < props.min_temp && temp !== 0) {
        value.value = props.target
        const msg = t('Panels.TemperaturePanel.TempTooLow', { name: props.name, min: props.min_temp })
        useToast().error(msg)
        return
    }

    // don't send a command if the temperature is unchanged
    if (props.target === temp) return

    doSend(`${props.command} ${props.attributeName}=${props.name} TARGET=${temp}`)
}

onMounted(() => {
    value.value = props.target
})

watch(
    () => props.target,
    (newVal) => {
        value.value = newVal
    }
)
</script>

<style scoped>
._temp-input :deep(.v-input__slot) {
    min-height: 1rem !important;
    padding-left: 8px !important;
    padding-right: 8px !important;
}

._temp-input :deep(.v-text-field__slot input) {
    padding-top: 4px;
    padding-bottom: 4px;
}

._preset {
    font-size: 0.875rem;
}

._preset-icon {
    margin-top: -1px;
    margin-right: 4px;
}
</style>
