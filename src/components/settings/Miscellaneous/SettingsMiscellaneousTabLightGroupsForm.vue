<template>
    <v-form ref="form" v-model="formValid">
        <v-card-text>
            <h3 class="text-h5 mb-3">{{ title }}</h3>
            <settings-row :title="t('Settings.MiscellaneousTab.Name')">
                <v-text-field v-model="groupname" hide-details="auto" :rules="[rules.required, rules.groupUnique]" density="compact" variant="outlined" />
            </settings-row>
            <v-divider class="my-2" />
            <settings-row :title="t('Settings.MiscellaneousTab.Start')" :sub-title="t('Settings.MiscellaneousTab.StartDescription')">
                <v-text-field
                    v-model="start"
                    hide-details="auto"
                    type="number"
                    :step="1"
                    :rules="[rules.required, rules.minStart, rules.max]"
                    density="compact"
                    variant="outlined"
                    @keyup="revalidateForm" />
            </settings-row>
            <v-divider class="my-2" />
            <settings-row :title="t('Settings.MiscellaneousTab.End')" :sub-title="t('Settings.MiscellaneousTab.EndDescription')">
                <v-text-field
                    v-model="end"
                    hide-details="auto"
                    type="number"
                    :step="1"
                    :rules="[rules.required, rules.minEnd, rules.max]"
                    density="compact"
                    variant="outlined"
                    @keyup="revalidateForm" />
            </settings-row>
        </v-card-text>
        <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="close">{{ t('Buttons.Cancel') }}</v-btn>
            <v-btn v-if="groupId !== null" variant="text" color="primary" :disabled="!formValid" @click="updateGroup">
                {{ t('Settings.Update') }}
            </v-btn>
            <v-btn v-else variant="text" color="primary" :disabled="!formValid" @click="storeGroup">
                {{ t('Settings.Store') }}
            </v-btn>
        </v-card-actions>
    </v-form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { VForm } from 'vuetify/components'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { caseInsensitiveSort } from '@/plugins/helpers'
import { usePrinterStore } from '@/store/printer'
import { useGuiMiscellaneousStore } from '@/store/gui/miscellaneous'
import type { GuiMiscellaneousStateEntryLightgroup } from '@/store/gui/miscellaneous/types'

const props = withDefaults(
    defineProps<{
        type?: string | null
        name?: string | null
        groupId?: string | null
    }>(),
    { type: null, name: null, groupId: null }
)

const emit = defineEmits<{
    close: []
}>()

const { t } = useI18n()
const printerStore = usePrinterStore()
const guiMiscellaneousStore = useGuiMiscellaneousStore()

const form = ref<InstanceType<typeof VForm> | null>(null)

const formValid = ref(false)
const groupname = ref('')
const start = ref(1)
const end = ref(1)

const rules = computed(() => ({
    required: (value: string) => value !== '' || t('Settings.MiscellaneousTab.Required'),
    groupUnique: (value: string) => !existsGroupName(value) || t('Settings.MiscellaneousTab.NameExists'),
    minStart: (value: string) => parseInt(value) > 0 || t('Settings.MiscellaneousTab.GreaterThanZero'),
    minEnd: (value: string) => parseInt(value) >= start.value || t('Settings.MiscellaneousTab.HigherThanStart'),
    max: (value: string) => parseInt(value) <= chainCount.value || t('Settings.MiscellaneousTab.LessThanChainCount', { count: chainCount.value }),
}))

const title = computed(() => (props.groupId ? t('Settings.MiscellaneousTab.EditGroup') : t('Settings.MiscellaneousTab.CreateGroup')))

const settings = computed(() => {
    if (!props.type || !props.name) return null

    const key = `${props.type.toLowerCase()} ${props.name.toLowerCase()}`
    return printerStore.configfile?.settings?.[key] ?? {}
})

const chainCount = computed(() => settings.value?.chain_count ?? 1)

const entry = computed(() => guiMiscellaneousStore.getEntry({ type: props.type ?? '', name: props.name ?? '' }))

const groups = computed(() => {
    const lightgroups = entry.value?.lightgroups ?? {}

    const groups: GuiMiscellaneousStateEntryLightgroup[] = Object.keys(lightgroups).map((key) => ({
        ...lightgroups[key],
        id: key,
    }))

    return caseInsensitiveSort(groups, 'name')
})

const group = computed(() => {
    if (!props.groupId) return null

    return groups.value.find((group) => group.id === props.groupId) ?? null
})

watch(
    group,
    () => {
        groupname.value = group.value?.name ?? ''
        start.value = group.value?.start ?? 1
        end.value = group.value?.end ?? 1
    },
    { immediate: true }
)

function close() {
    emit('close')
}

function revalidateForm() {
    nextTick(() => {
        form.value?.validate()
    })
}

function storeGroup() {
    guiMiscellaneousStore.storeLightgroup({
        type: props.type ?? '',
        name: props.name ?? '',
        lightgroup: {
            name: groupname.value,
            start: parseInt(start.value.toString(), 10),
            end: parseInt(end.value.toString(), 10),
        },
    })

    close()
}

function updateGroup() {
    guiMiscellaneousStore.updateLightgroup({
        type: props.type ?? '',
        name: props.name ?? '',
        lightgroupId: props.groupId ?? '',
        lightgroup: {
            name: groupname.value,
            start: parseInt(start.value.toString(), 10),
            end: parseInt(end.value.toString(), 10),
        },
    })

    close()
}

function existsGroupName(name: string) {
    return groups.value.findIndex((group) => group.name === name && group.id !== props.groupId) >= 0
}
</script>
