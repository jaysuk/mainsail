<template>
    <v-dialog v-model="showDialog" max-width="400">
        <panel :title="t('JobQueue.ChangeCount')" :icon="mdiCounter" card-class="jobqueue-change-count-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>

            <v-card-text>
                <v-text-field ref="inputField" v-model="count" :label="t('JobQueue.Count')" required :rules="countInputRules" hide-spin-buttons type="number" @keyup.enter="update">
                    <template #append-inner>
                        <div class="_spin_button_group">
                            <v-btn class="mt-n3" icon="" variant="plain" size="small" @click="count++">
                                <v-icon>{{ mdiChevronUp }}</v-icon>
                            </v-btn>
                            <v-btn :disabled="count <= 1" class="mb-n3" icon="" variant="plain" size="small" @click="count--">
                                <v-icon>{{ mdiChevronDown }}</v-icon>
                            </v-btn>
                        </div>
                    </template>
                </v-text-field>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="closeDialog">{{ t('Buttons.Cancel') }}</v-btn>
                <v-btn color="primary" variant="text" @click="update">{{ t('JobQueue.ChangeCount') }}</v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FocusableRef } from '@/types/vuetify'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick, mdiChevronUp, mdiChevronDown, mdiCounter } from '@mdi/js'
import type { ServerJobQueueStateJob } from '@/store/server/jobQueue/types'
import { useServerJobQueueStore } from '@/store/server/jobQueue'

const props = defineProps<{
    job: ServerJobQueueStateJob
}>()

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()

const inputField = ref<FocusableRef | null>(null)

const count = ref(1)

const countInputRules = [(value: string) => !!value || t('JobQueue.InvalidCountEmpty'), (value: string) => parseInt(value) > 0 || t('JobQueue.InvalidCountGreaterZero')]

function update() {
    useServerJobQueueStore().changeCount({
        job_id: props.job.job_id,
        count: count.value,
    })

    closeDialog()
}

function closeDialog() {
    showDialog.value = false
}

watch(showDialog, (newVal) => {
    if (!newVal) return

    count.value = (props.job.combinedIds?.length ?? 0) + 1
    setTimeout(() => {
        inputField.value?.focus()
    })
})
</script>
