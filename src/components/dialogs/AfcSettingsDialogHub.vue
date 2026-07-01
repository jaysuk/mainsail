<template>
    <div>
        <h3 class="text-h5 mb-3">{{ title }}</h3>
        <settings-row :title="t('Panels.AfcPanel.SettingsDialog.BowdenLength')" :sub-title="t('Panels.AfcPanel.SettingsDialog.BowdenLengthDescription')">
            <number-input
                label="afc_bowden_length"
                param="LENGTH"
                :target="currentLength"
                :default-value="settingsLength"
                :output-error-msg="true"
                :has-spinner="true"
                :spinner-factor="1"
                :step="1"
                :min="0"
                :max="null"
                :dec="0"
                unit="mm"
                class="w-100"
                @submit="setBowdenLength" />
        </settings-row>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import NumberInput from '@/components/inputs/NumberInput.vue'
import { convertName } from '@/plugins/helpers'
import { useControl } from '@/composables/useControl'
import { usePrinterStore } from '@/store/printer'

const props = defineProps<{
    name: string
}>()

const { t } = useI18n()
const { doSend } = useControl()
const printerStore = usePrinterStore()

const title = computed(() => {
    const name = convertName(`Hub ${props.name}`)

    return t('Panels.AfcPanel.SettingsDialog.SettingsForTitle', { name })
})

const afcSettingsHub = computed(() => {
    const settings = printerStore.configfile?.settings ?? {}
    const name = `AFC_hub ${props.name}`.toLowerCase()

    return settings[name] || {}
})

const settingsLength = computed(() => afcSettingsHub.value.afc_bowden_length || 0)

const printerObject = computed(() => {
    const printer = printerStore as unknown as Record<string, any>
    const key = `AFC_hub ${props.name}`

    return printer[key] ?? {}
})

const currentLength = computed(() => printerObject.value.afc_bowden_length || 0)

function setBowdenLength(args: { name: string; value: number }) {
    const gcode = `SET_BOWDEN_LENGTH HUB=${props.name} ${args.name}=${args.value}`
    doSend(gcode)
}
</script>
