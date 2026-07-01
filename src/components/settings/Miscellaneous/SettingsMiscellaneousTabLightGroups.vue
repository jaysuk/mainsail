<template>
    <settings-miscellaneous-tab-light-groups-form v-if="page === 'form'" :type="type" :name="name" :group-id="groupId" @close="openPage('')" />
    <settings-miscellaneous-tab-light-groups-list v-else :type="type" :name="name" @create-group="openPage('form')" @edit-group="editGroup" @close="close" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SettingsMiscellaneousTabLightGroupsForm from '@/components/settings/Miscellaneous/SettingsMiscellaneousTabLightGroupsForm.vue'
import SettingsMiscellaneousTabLightGroupsList from '@/components/settings/Miscellaneous/SettingsMiscellaneousTabLightGroupsList.vue'

defineProps<{
    type: string
    name: string
}>()

const emit = defineEmits<{
    close: []
}>()

const page = ref('')
const groupId = ref<string | null>(null)

function editGroup(newGroupId: string) {
    openPage('form')
    groupId.value = newGroupId
}

function openPage(name: string) {
    page.value = name
    groupId.value = null
}

function close() {
    emit('close')
}
</script>
