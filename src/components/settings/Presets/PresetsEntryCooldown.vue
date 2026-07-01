<template>
    <settings-row :title="t('Settings.PresetsTab.Cooldown')">
        <v-btn size="small" variant="outlined" class="ml-3" @click="editCooldown">
            <v-icon start size="small">{{ mdiPencil }}</v-icon>
            {{ t('Settings.Edit') }}
        </v-btn>
    </settings-row>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiPencil } from '@mdi/js'

const emit = defineEmits<{
    edit: []
}>()

const { t } = useI18n()

function editCooldown() {
    emit('edit')
}
</script>
