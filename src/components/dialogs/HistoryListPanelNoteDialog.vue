<template>
    <v-dialog v-model="showDialog" :max-width="600" persistent @keydown.esc="closeDialog">
        <panel :title="panelTitle" :icon="icon" card-class="history-note-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text class="pb-0">
                <v-row>
                    <v-col>
                        <v-textarea v-model="note" variant="outlined" hide-details :label="t('History.Note')" />
                    </v-col>
                </v-row>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="closeDialog">{{ t('Buttons.Cancel') }}</v-btn>
                <v-btn color="primary" variant="text" @click="saveNote">{{ t('Buttons.Save') }}</v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import type { ServerHistoryStateJob } from '@/store/server/history/types'
import { mdiCloseThick, mdiNoteEditOutline, mdiNotePlusOutline } from '@mdi/js'
import { useServerHistoryStore } from '@/store/server/history'

const props = defineProps<{
    type: 'create' | 'edit'
    job: ServerHistoryStateJob
}>()

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()
const historyStore = useServerHistoryStore()

const note = ref('')

const panelTitle = computed(() => {
    if (props.type === 'create') return t('History.CreateNote')

    return t('History.EditNote')
})

const icon = computed(() => {
    if (props.type === 'create') return mdiNotePlusOutline

    return mdiNoteEditOutline
})

function saveNote() {
    historyStore.saveHistoryNote({
        job_id: props.job?.job_id,
        note: note.value,
    })

    closeDialog()
}

function closeDialog() {
    showDialog.value = false
}

watch(showDialog, (newVal) => {
    if (!newVal) return

    note.value = props.job.note ?? ''
})
</script>

<style scoped>
:deep(.os-content .row:first-child) {
    margin-top: 1em !important;
}

:deep(.os-content .row:last-child) {
    margin-bottom: 1em !important;
}
</style>
