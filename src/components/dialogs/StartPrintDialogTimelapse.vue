<template>
    <v-card-text class="py-3 bt-1">
        <settings-row :title="t('Dialogs.StartPrint.Timelapse')" :dense="true">
            <v-switch v-model="timelapseEnabled" hide-details class="mt-0" />
        </settings-row>
    </v-card-text>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { useTimelapse } from '@/composables/useTimelapse'

const { t } = useI18n()
const { enabled: timelapseEnabled } = useTimelapse()
</script>
