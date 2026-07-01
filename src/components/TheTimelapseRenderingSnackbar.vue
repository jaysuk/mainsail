<template>
    <div>
        <v-snackbar :model-value="boolShowDialogRunning" :timeout="-1" location="bottom right">
            <div>{{ t('Timelapse.TimelapseRendering') }}...</div>
            <v-progress-linear v-if="progress > 0" class="mt-2" :model-value="progress" indeterminate />
            <v-progress-linear v-if="progress === 0" class="mt-2" indeterminate />
        </v-snackbar>
        <v-snackbar v-model="boolShowDialogSuccess" :timeout="5000" location="bottom right">
            <div>
                {{ t('Timelapse.TimelapseRenderingSuccessful') }}
                <br />
                <strong>{{ filename }}</strong>
            </div>
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useServerTimelapseStore } from '@/store/server/timelapse'

const { t } = useI18n()
const timelapseStore = useServerTimelapseStore()

const status = computed(() => timelapseStore.rendering.status ?? '')
const progress = computed(() => timelapseStore.rendering.progress ?? 0)
const filename = computed(() => timelapseStore.rendering.filename ?? '')

const boolShowDialogRunning = computed(() => status.value === 'running')

const boolShowDialogSuccess = computed({
    get: () => status.value === 'success',
    set: (newVal) => {
        if (!newVal) timelapseStore.resetSnackbar()
    },
})
</script>
