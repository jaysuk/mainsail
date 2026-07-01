<template>
    <div>
        <v-card-text>
            <h3 class="text-h5 mb-3">{{ t('Settings.MiscellaneousTab.LightGroups', { name }) }}</h3>
            <template v-if="groups.length">
                <div v-for="(group, index) in groups" :key="group.id">
                    <v-divider v-if="index" class="my-2" />
                    <settings-miscellaneous-tab-light-groups-list-entry :type="type" :name="name" :group="group" @edit-group="editGroup" />
                </div>
            </template>
            <p v-else class="mb-0 text-center font-italic">{{ t('Settings.MiscellaneousTab.NoGroupFound') }}</p>
        </v-card-text>
        <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="close">{{ t('Buttons.Close') }}</v-btn>
            <v-btn variant="text" color="primary" @click="createGroup">{{ t('Settings.MiscellaneousTab.AddGroup') }}</v-btn>
        </v-card-actions>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsMiscellaneousTabLightGroupsListEntry from '@/components/settings/Miscellaneous/SettingsMiscellaneousTabLightGroupsListEntry.vue'
import { caseInsensitiveSort } from '@/plugins/helpers'
import { useGuiMiscellaneousStore } from '@/store/gui/miscellaneous'
import type { GuiMiscellaneousStateEntryLightgroup } from '@/store/gui/miscellaneous/types'

const props = defineProps<{
    type: string
    name: string
}>()

const emit = defineEmits<{
    'edit-group': [groupId: string]
    close: []
    'create-group': []
}>()

const { t } = useI18n()
const guiMiscellaneousStore = useGuiMiscellaneousStore()

const entry = computed(() => guiMiscellaneousStore.getEntry({ type: props.type, name: props.name }))

const groups = computed(() => {
    const lightgroups = entry.value?.lightgroups ?? {}

    const groups: GuiMiscellaneousStateEntryLightgroup[] = Object.keys(lightgroups).map((key) => ({
        name: lightgroups[key].name,
        start: lightgroups[key].start,
        end: lightgroups[key].end,
        id: key,
    }))

    return caseInsensitiveSort(groups, 'name')
})

function editGroup(groupId: string) {
    emit('edit-group', groupId)
}

function close() {
    emit('close')
}

function createGroup() {
    emit('create-group')
}
</script>
