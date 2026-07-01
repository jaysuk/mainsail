<template>
    <v-alert v-if="bypassState" type="warning" class="mt-3" density="compact" variant="text">
        {{ t('Panels.AfcPanel.BypassActive') }}
    </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAfc } from '@/composables/useAfc'

const { t } = useI18n()
const { afc } = useAfc()

const bypassState = computed(() => afc.value.bypass_state ?? false)
</script>
