<template>
    <settings-row :title="outputName" :sub-title="subTitle">
        <v-chip v-if="!(is_base ?? false)" label size="small">
            <v-icon v-if="sign === 'CCW'" size="small" start>{{ mdiRotateLeft }}</v-icon>
            <v-icon v-if="sign === 'CW'" size="small" start>{{ mdiRotateRight }}</v-icon>
            {{ adjust }}
        </v-chip>
        <v-chip v-else label size="small">{{ t('ScrewsTiltAdjust.Base') }}</v-chip>
    </settings-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiRotateLeft, mdiRotateRight } from '@mdi/js'
import { usePrinterStore } from '@/store/printer'

interface ScrewsTiltAdjustResult {
    z: number
    sign?: string
    adjust?: string
    is_base: boolean
}

const props = defineProps<{
    name: string
    result: ScrewsTiltAdjustResult
}>()

const { t } = useI18n()
const printerStore = usePrinterStore()

const settings = computed(() => printerStore.configfile?.settings?.screws_tilt_adjust ?? {})

const outputName = computed(() => settings.value[props.name + '_name'] ?? 'Unknown')

const coordinates = computed(() => settings.value[props.name] ?? [0, 0])

const x = computed(() => coordinates.value[0] ?? 0)

const y = computed(() => coordinates.value[1] ?? 0)

const z = computed(() => props.result.z.toFixed(3))

const subTitle = computed(() => `(X: ${x.value}, Y: ${y.value}, Z: ${z.value})`)

const sign = computed(() => props.result.sign ?? '')

const adjust = computed(() => props.result.adjust ?? '00:00')

const is_base = computed(() => props.result.is_base ?? false)
</script>
