<template>
    <v-dialog v-model="showDialog" persistent max-width="600">
        <panel :title="t('Machine.UpdatePanel.AreYouSure')" :icon="mdiProgressQuestion" :margin-bottom="false" card-class="machine-update-hint-dialog">
            <template #buttons>
                <v-btn icon tile @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>
                <v-row>
                    <v-col>
                        <update-hint-alert :repo="repo" @open-commit-history="openCommitHistory" />
                        <div>
                            <v-checkbox v-model="checkboxUpdateQuestion" :label="t('Machine.UpdatePanel.IUnderstandTheRisks')" hide-details />
                        </div>
                    </v-col>
                </v-row>
            </v-card-text>
            <v-divider />
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="closeDialog">{{ t('Machine.UpdatePanel.Abort') }}</v-btn>
                <v-btn variant="text" color="primary" :disabled="!checkboxUpdateQuestion" @click="doUpdate">
                    {{ t('Machine.UpdatePanel.StartUpdate') }}
                </v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ServerUpdateManagerStateGitRepo } from '@/store/server/updateManager/types'
import { mdiProgressQuestion, mdiCloseThick } from '@mdi/js'
import Panel from '@/components/ui/Panel.vue'
import UpdateHintAlert from '@/components/panels/Machine/UpdatePanel/UpdateHintAlert.vue'

defineProps<{ repo: ServerUpdateManagerStateGitRepo }>()

const emit = defineEmits<{ 'do-update': []; 'open-commit-history': [] }>()

const { t } = useI18n()

const checkboxUpdateQuestion = ref(false)

const showDialog = defineModel<boolean>({ required: true })

function doUpdate() {
    emit('do-update')
}

function openCommitHistory() {
    emit('open-commit-history')
}

function closeDialog() {
    showDialog.value = false
}
</script>
