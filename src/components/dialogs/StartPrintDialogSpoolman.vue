<template>
    <v-card-text class="py-3 px-2 bt-1">
        <spoolman-panel-active-spool v-if="activeSpoolId !== null" :small="true" class="my-0" @change-spool="showChangeSpoolDialog = true" />
        <v-alert v-for="alert in alerts" :key="alert.text" variant="text" :color="alert.color" class="mx-3">
            {{ alert.text }}
        </v-alert>
        <div class="text-center">
            <v-btn color="primary" size="small" class="mx-auto" @click="showChangeSpoolDialog = true">
                {{ buttonText }}
            </v-btn>
        </div>
        <spoolman-change-spool-dialog v-model="showChangeSpoolDialog" />
    </v-card-text>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SpoolmanPanelActiveSpool from '@/components/panels/Spoolman/SpoolmanPanelActiveSpool.vue'
import SpoolmanChangeSpoolDialog from '@/components/dialogs/SpoolmanChangeSpoolDialog.vue'
import type { FileStateGcodefile } from '@/store/files/types'
import { convertStringToArray } from '@/plugins/helpers'
import { useServerSpoolmanStore } from '@/store/server/spoolman'

const props = defineProps<{
    file: FileStateGcodefile
}>()

const { t } = useI18n()
const spoolmanStore = useServerSpoolmanStore()

const showChangeSpoolDialog = ref(false)

const activeSpoolId = computed(() => {
    let spoolId = spoolmanStore.active_spool_id ?? null
    if (spoolId === 0) spoolId = null

    return spoolId
})

const activeSpool = computed(() => spoolmanStore.active_spool ?? null)

const buttonText = computed(() => {
    if (activeSpoolId.value === null) return t('Panels.SpoolmanPanel.SelectSpool')

    return t('Panels.SpoolmanPanel.ChangeSpool')
})

const alerts = computed(() => {
    const alerts = []

    if (activeSpoolId.value === null) {
        alerts.push({
            text: t('Panels.SpoolmanPanel.NoSpoolSelected'),
            color: 'orange',
        })

        // No need to check for filament type mismatch if no spool is selected
        return alerts
    }

    const gcodeFilamentType = convertStringToArray(props.file.filament_type ?? '')[0] ?? ''
    if (gcodeFilamentType !== '' && activeSpool.value?.filament?.material?.toLowerCase() !== gcodeFilamentType.toLowerCase()) {
        alerts.push({
            text: t('Panels.SpoolmanPanel.FilamentTypeMismatch', {
                fileType: gcodeFilamentType,
                spoolType: activeSpool.value?.filament?.material,
            }),
            color: 'warning',
        })
    }

    const fileWeight = Math.round(props.file.filament_weight_total ?? 0)
    const spoolWeight = Math.round(activeSpool.value?.remaining_weight ?? 0)
    if (spoolWeight < fileWeight) {
        alerts.push({
            text: t('Panels.SpoolmanPanel.TooLessFilament', {
                fileWeight,
                spoolWeight,
            }),
            color: 'warning',
        })
    }

    return alerts
})
</script>
