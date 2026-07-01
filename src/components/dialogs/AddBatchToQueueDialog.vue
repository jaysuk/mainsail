<template>
    <v-dialog v-model="showDialog" :max-width="400" @click:outside="closeDialog" @keydown.esc="closeDialog">
        <panel :title="t('Files.AddToQueue')" card-class="gcode-files-add-to-queue-dialog" :icon="mdiPlaylistPlus" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>

            <v-form v-model="isValid" @submit.prevent="addBatchToQueueAction">
                <v-card-text>
                    <v-text-field ref="inputField" v-model="input" :label="t('Files.Count')" required hide-spin-buttons type="number" :rules="rules.count">
                        <template #append-inner>
                            <div class="_spin_button_group">
                                <v-btn class="mt-n3" icon="" variant="plain" size="small" @click="increment">
                                    <v-icon>{{ mdiChevronUp }}</v-icon>
                                </v-btn>
                                <v-btn :disabled="Number(input) <= 1" class="mb-n3" icon="" variant="plain" size="small" @click="decrement">
                                    <v-icon>{{ mdiChevronDown }}</v-icon>
                                </v-btn>
                            </div>
                        </template>
                    </v-text-field>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="closeDialog">{{ t('Buttons.Cancel') }}</v-btn>
                    <v-btn color="primary" variant="text" type="submit" :disabled="!isValid">
                        {{ t('Files.AddToQueue') }}
                    </v-btn>
                </v-card-actions>
            </v-form>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toast-notification'
import type { FocusableRef } from '@/types/vuetify'
import { mdiChevronDown, mdiChevronUp, mdiPlaylistPlus, mdiCloseThick } from '@mdi/js'
import { useServerJobQueueStore } from '@/store/server/jobQueue'

const props = withDefaults(
    defineProps<{
        showToast?: boolean
        filename: string
    }>(),
    {
        showToast: false,
    }
)

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()

const inputField = ref<FocusableRef | null>(null)

const isValid = ref(false)
// because of the text field, the input is always a string
const input = ref('1')

const rules = {
    count: [(value: string) => !!value || t('JobQueue.InvalidCountEmpty'), (value: string) => parseInt(value, 10) > 0 || t('JobQueue.InvalidCountGreaterZero')],
}

function increment() {
    input.value = String(Number(input.value) + 1)
}

function decrement() {
    input.value = String(Number(input.value) - 1)
}

async function addBatchToQueueAction() {
    let filename = props.filename
    if (filename.startsWith('/')) filename = filename.slice(1)
    const array = Array(parseInt(input.value)).fill(filename)

    useServerJobQueueStore().addToQueue(array)

    if (props.showToast) useToast().info(t('History.AddToQueueSuccessful', { filename }))

    closeDialog()
}

function closeDialog() {
    showDialog.value = false
}

function resetFormState() {
    input.value = '1'
}

watch(showDialog, (newVal) => {
    if (!newVal) return

    resetFormState()
    setTimeout(() => {
        inputField.value?.focus()
    })
})
</script>

<style scoped>
._spin_button_group {
    width: 24px;
    margin-top: -6px;
    margin-left: -6px;
    margin-bottom: -6px;
}
</style>
