<template>
    <v-text-field :class="cssClassName" readonly density="compact" variant="outlined" hide-details :label="label" :model-value="value">
        <template #append-inner>
            <v-icon @click="copy">{{ mdiContentCopy }}</v-icon>
            <v-tooltip v-model="isShowTooltip" activator="parent" open-on-click :open-on-hover="false" location="top">
                <span>{{ t('App.TextfieldWithCopy.Copied') }}</span>
            </v-tooltip>
        </template>
    </v-text-field>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiContentCopy } from '@mdi/js'
import { copyToClipboard } from '@/plugins/helpers'
import { v4 as uuidv4 } from 'uuid'

const props = defineProps<{ label: string; value: string }>()

const { t } = useI18n()

const isShowTooltip = ref(false)
const cssClassName = `textfield-with-copy-${uuidv4()}`

function copy() {
    copyToClipboard(props.value)

    isShowTooltip.value = true
    setTimeout(() => (isShowTooltip.value = false), 2000)
}
</script>
<style scoped>
:deep(.v-tooltip .v-overlay__content) {
    top: 4px !important;
    left: auto !important;
    right: 46px;
}
</style>
