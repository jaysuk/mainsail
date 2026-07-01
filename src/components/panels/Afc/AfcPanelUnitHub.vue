<template>
    <div class="ml-3">
        <v-tooltip location="top">
            <template #activator="{ props: activatorProps }">
                <span v-bind="activatorProps" class="sensor-status rounded-circle d-inline-block mr-2" :class="sensorClass" />
            </template>
            <span>{{ sensorOutput }}</span>
        </v-tooltip>
        <span class="text-body-1">{{ t('Panels.AfcPanel.Hub') }}</span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAfc } from '@/composables/useAfc'

const props = defineProps<{
    name: string
}>()

const { t } = useI18n()
const { getAfcHubObject } = useAfc()

const hub = computed(() => getAfcHubObject(props.name) as Record<string, any>)

const sensorStatus = computed(() => hub.value.state ?? false)

const sensorOutput = computed(() => {
    const status = sensorStatus.value ? t('Panels.AfcPanel.Detected') : t('Panels.AfcPanel.Empty')

    return `${props.name} ${t('Panels.AfcPanel.HubLoad')} - ${status}`
})

const sensorClass = computed(() => ({
    success: sensorStatus.value,
    error: !sensorStatus.value,
}))
</script>

<style scoped>
.sensor-status {
    width: 10px;
    height: 10px;
}
</style>
