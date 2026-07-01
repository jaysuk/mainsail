<template>
    <v-list-item class="minHeight36 text-no-wrap">
        <v-checkbox v-model="value" class="mt-0" hide-details :label="label" />
    </v-list-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAfc } from '@/composables/useAfc'
import { useGuiStore } from '@/store/gui'

const props = defineProps<{
    name: string
}>()

const { t } = useI18n()
const { afcHiddenExtruders } = useAfc()
const guiStore = useGuiStore()

const label = computed(() => t('Panels.AfcPanel.ShowTool', { name: props.name }))

const value = computed<boolean>({
    get: () => !afcHiddenExtruders.value.includes(props.name),
    set: (newValue) => {
        const hiddenExtruders = [...afcHiddenExtruders.value]
        const index = hiddenExtruders.indexOf(props.name)

        if (newValue) {
            if (index > -1) hiddenExtruders.splice(index, 1)
        } else if (index === -1) {
            hiddenExtruders.push(props.name)
        }

        guiStore.saveSetting({ name: 'view.afc.hiddenExtruders', value: hiddenExtruders })
    },
})
</script>
