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
                        <update-hint-alert v-for="repo of filteredModules" :key="repo.name" :repo="repo.data" :bool-title="true" @open-commit-history="openCommitHistory(repo.data)" />
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
                <v-btn variant="text" color="primary" :disabled="!checkboxUpdateQuestion" @click="updateAll">
                    {{ t('Machine.UpdatePanel.StartUpdate') }}
                </v-btn>
            </v-card-actions>
        </panel>
        <git-commits-list v-model="boolShowCommitHistory" :repo="showCommitsRepo" />
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ServerUpdateManagerStateGitRepo, ServerUpdateManagerStateGuiList } from '@/store/server/updateManager/types'
import { mdiProgressQuestion, mdiCloseThick } from '@mdi/js'
import Panel from '@/components/ui/Panel.vue'
import GitCommitsList from '@/components/panels/Machine/UpdatePanel/GitCommitsList.vue'
import UpdateHintAlert from '@/components/panels/Machine/UpdatePanel/UpdateHintAlert.vue'
import semver from 'semver'
import { useServerUpdateManagerStore } from '@/store/server/updateManager'

const emit = defineEmits<{ 'update-all': [] }>()

const { t } = useI18n()
const serverUpdateManagerStore = useServerUpdateManagerStore()

const checkboxUpdateQuestion = ref(false)
const boolShowCommitHistory = ref(false)
const showCommitsRepo = ref<ServerUpdateManagerStateGitRepo | null>(null)

const showDialog = defineModel<boolean>({ required: true })

const modules = computed(() => serverUpdateManagerStore.getUpdateManagerList ?? [])

const filteredModules = computed(() =>
    modules.value.filter((module: ServerUpdateManagerStateGuiList) => {
        // check git repos for updates
        if (module.type === 'git' && module.data?.commits_behind?.length) return true

        // check client web for updates
        if (module.type === 'web' && semver.valid(module.data?.remote_version, { loose: true }) && semver.valid(module.data?.version, { loose: true }) && semver.gt(module.data?.remote_version, module.data?.version, { loose: true }))
            return true

        return false
    })
)

function openCommitHistory(repo: ServerUpdateManagerStateGitRepo) {
    showCommitsRepo.value = repo
    boolShowCommitHistory.value = true
}

function closeDialog() {
    showDialog.value = false
}

function updateAll() {
    emit('update-all')
}
</script>
