<template>
    <settings-row :title="group.name" :sub-title="subTitle" :dynamic-slot-width="true">
        <v-btn size="small" variant="outlined" class="ml-3" @click="editGroup">
            <v-icon start size="small">{{ mdiPencil }}</v-icon>
            {{ t('Settings.Edit') }}
        </v-btn>
        <v-btn size="small" variant="outlined" class="ml-3 minwidth-0 px-2" color="error" @click="deleteGroup">
            <v-icon size="small">{{ mdiDelete }}</v-icon>
        </v-btn>
    </settings-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiDelete, mdiPencil } from '@mdi/js'
import { useGuiMiscellaneousStore } from '@/store/gui/miscellaneous'
import type { GuiMiscellaneousStateEntryLightgroup } from '@/store/gui/miscellaneous/types'

const props = defineProps<{
    type: string
    name: string
    group: GuiMiscellaneousStateEntryLightgroup
}>()

const { t } = useI18n()
const guiMiscellaneousStore = useGuiMiscellaneousStore()

const emit = defineEmits<{
    'edit-group': [groupId: string]
}>()

const subTitle = computed(() =>
    t('Settings.MiscellaneousTab.GroupSubTitle', { start: props.group.start, end: props.group.end })
)

function editGroup() {
    emit('edit-group', props.group.id ?? '')
}

function deleteGroup() {
    guiMiscellaneousStore.deleteLightgroup({
        type: props.type,
        name: props.name,
        lightgroupId: props.group.id ?? '',
    })
}
</script>
