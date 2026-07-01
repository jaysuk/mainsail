<template>
    <v-col class="pl-6">
        <template v-if="selectAll">
            <v-checkbox
                v-model="selectAllModel"
                :label="t('Settings.GeneralTab.Everything')"
                hide-details
                class="mt-0"
                :indeterminate="selectAllIndeterminate"
                @update:model-value="emit('update:selectedCheckboxes', selectedCheckboxes)"></v-checkbox>
            <v-divider class="my-2" />
        </template>
        <template v-for="option in options" :key="option.value">
            <v-checkbox
                v-model="selectedCheckboxes"
                :label="option.label"
                hide-details
                class="mt-0"
                :value="option.value"
                @update:model-value="emit('update:selectedCheckboxes', selectedCheckboxes)"></v-checkbox>
        </template>
    </v-col>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
    defineProps<{
        options: { label: string; value: string }[]
        selectAll?: boolean
    }>(),
    { selectAll: false }
)

const emit = defineEmits<{ 'update:selectedCheckboxes': [string[]] }>()

const { t } = useI18n()

const selectedCheckboxes = ref<string[]>([])
const selectAllIndeterminate = ref(false)

function getSelectAll(): boolean {
    selectAllIndeterminate.value = false
    if (0 < selectedCheckboxes.value.length && selectedCheckboxes.value.length < props.options.length) {
        selectAllIndeterminate.value = true
        return false
    }

    return selectedCheckboxes.value.length == props.options.length
}

function setSelectAll(state: boolean) {
    if (state) {
        selectedCheckboxes.value = props.options.map((o) => o.value)
        return
    }

    selectedCheckboxes.value = []
}

const selectAllModel = computed<boolean>({
    get: getSelectAll,
    set: setSelectAll,
})
</script>
