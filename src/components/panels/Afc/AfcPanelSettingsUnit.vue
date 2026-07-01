<template>
    <v-list-item class="minHeight36 text-no-wrap">
        <v-checkbox v-model="value" class="mt-0" hide-details :label="label" />
    </v-list-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { convertName } from '@/plugins/helpers'
import { useAfc } from '@/composables/useAfc'
import { useGuiStore } from '@/store/gui'

const props = defineProps<{
    name: string
}>()

const { t } = useI18n()
const { afcHiddenUnits } = useAfc()
const guiStore = useGuiStore()

const label = computed(() => {
    const unitName = props.name.substring(props.name.indexOf(' ') + 1)

    return t('Panels.AfcPanel.ShowUnit', { name: convertName(unitName) })
})

const value = computed<boolean>({
    get: () => !afcHiddenUnits.value.includes(props.name),
    set: (newValue) => {
        const hiddenUnits = [...afcHiddenUnits.value]
        const index = hiddenUnits.indexOf(props.name)

        if (newValue) {
            if (index > -1) hiddenUnits.splice(index, 1)
        } else if (index === -1) {
            hiddenUnits.push(props.name)
        }

        guiStore.saveSetting({ name: 'view.afc.hiddenUnits', value: hiddenUnits })
    },
})
</script>
