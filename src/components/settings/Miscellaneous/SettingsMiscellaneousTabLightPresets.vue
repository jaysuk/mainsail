<template>
    <settings-miscellaneous-tab-light-presets-form v-if="page === 'form'" :type="type" :name="name" :preset-id="presetId" @close="openPage('')" />
    <settings-miscellaneous-tab-light-presets-list v-else :type="type" :name="name" @create-preset="openPage('form')" @edit-preset="editPreset" @close="close" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SettingsMiscellaneousTabLightPresetsForm from '@/components/settings/Miscellaneous/SettingsMiscellaneousTabLightPresetsForm.vue'
import SettingsMiscellaneousTabLightPresetsList from '@/components/settings/Miscellaneous/SettingsMiscellaneousTabLightPresetsList.vue'

defineProps<{
    type: string
    name: string
}>()

const emit = defineEmits<{
    close: []
}>()

const page = ref('')
const presetId = ref<string | null>(null)

function editPreset(newPresetId: string) {
    openPage('form')
    presetId.value = newPresetId
}

function openPage(name: string) {
    page.value = name
    presetId.value = null
}

function close() {
    emit('close')
}
</script>
