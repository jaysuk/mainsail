<template>
    <v-card flat>
        <v-form @submit.prevent="saveCooldown">
            <v-card-title>{{ t('Settings.PresetsTab.EditCooldown') }}</v-card-title>
            <v-card-text>
                <settings-row :title="t('Settings.PresetsTab.CustomGCode')">
                    <v-textarea v-model="gcode" variant="outlined" hide-details />
                </settings-row>
            </v-card-text>
            <v-card-actions class="d-flex justify-end">
                <v-btn variant="text" @click="closeForm">
                    {{ t('Buttons.Cancel') }}
                </v-btn>
                <v-btn color="primary" variant="text" type="submit">
                    {{ t('Settings.PresetsTab.UpdateCooldown') }}
                </v-btn>
            </v-card-actions>
        </v-form>
    </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { useGuiPresetsStore } from '@/store/gui/presets'

const props = defineProps<{
    inputGcode: string
}>()

const emit = defineEmits<{
    close: []
}>()

const { t } = useI18n()
const guiPresetsStore = useGuiPresetsStore()

const gcode = ref('')

onMounted(() => {
    gcode.value = props.inputGcode
})

function closeForm() {
    emit('close')
}

function saveCooldown() {
    guiPresetsStore.updateCooldownGcode(gcode.value)
    closeForm()
}
</script>
