<template>
    <v-card-text>
        <h3 class="text-h5 mb-3">{{ t('Settings.MiscellaneousTab.Miscellaneous') }}</h3>
        <template v-if="filteredLights.length">
            <template v-for="(light, index) in filteredLights" :key="index">
                <v-divider v-if="index" class="my-2" />
                <settings-miscellaneous-tab-list-light :type="light.type" :name="light.name" @open-page="openPage" />
            </template>
        </template>
        <p v-else class="mb-0 text-center font-italic">{{ t('Settings.MiscellaneousTab.NoDevicesFound') }}</p>
    </v-card-text>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsMiscellaneousTabListLight from '@/components/settings/Miscellaneous/SettingsMiscellaneousTabListLight.vue'
import { useMiscellaneous } from '@/composables/useMiscellaneous'
import { usePrinterStore } from '@/store/printer'

const emit = defineEmits<{
    'open-page': [payload: { page: string; type: string; name: string }]
}>()

const { t } = useI18n()
const { lights } = useMiscellaneous()
const printerStore = usePrinterStore()

const settings = computed(() => printerStore.configfile?.settings ?? {})

const lightsWithSettings = computed(() =>
    lights.value.map((light: { type: string; name: string }) => {
        const key = `${light.type.toLowerCase()} ${light.name.toLowerCase()}`
        const config = settings.value[key] ?? {}
        let colorOrder = config?.color_order ?? ''

        if (light.type.toLowerCase() === 'led') {
            if ('red_pin' in config) colorOrder += 'R'
            if ('green_pin' in config) colorOrder += 'G'
            if ('blue_pin' in config) colorOrder += 'B'
            if ('white_pin' in config) colorOrder += 'W'
        }

        return {
            ...light,
            colorOrder: colorOrder,
        }
    })
)

const filteredLights = computed(() => lightsWithSettings.value.filter((light: { type: string; name: string; colorOrder: string }) => light.colorOrder.length > 0))

function openPage(payload: { page: string; type: string; name: string }) {
    emit('open-page', payload)
}
</script>
