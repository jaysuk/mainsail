<template>
    <div>
        <v-card v-if="!form.bool" flat>
            <v-card-text>
                <div class="d-flex align-center">
                    <v-icon style="opacity: 0.7">{{ mdiConsoleLine }}</v-icon>
                    <v-card-title class="mx-n2">
                        {{ t('Settings.ConsoleTab.Console') }}
                    </v-card-title>
                    <v-divider class="ml-3" />
                </div>
                <settings-row :title="t('Settings.ConsoleTab.Direction')">
                    <v-select v-model="consoleDirection" :items="availableDirections" hide-details variant="outlined" density="compact" attach />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.ConsoleTab.EntryStyle')">
                    <v-select v-model="entryStyle" :items="availableEntryStyles" hide-details variant="outlined" density="compact" attach />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.ConsoleTab.Height')">
                    <v-slider v-model="consoleHeightTmp" hide-details :min="200" :max="900" :step="10" :label="consoleHeightTmp + 'px'" @update:model-value="updateConsoleHeight" />
                </settings-row>
                <div class="d-flex align-center">
                    <v-icon style="opacity: 0.7">{{ mdiFilter }}</v-icon>
                    <v-card-title class="mx-n2">
                        {{ t('Settings.ConsoleTab.Filters') }}
                    </v-card-title>
                    <v-divider class="ml-3" />
                </div>
                <settings-row :title="t('Settings.ConsoleTab.HideTemperatures')" :dynamic-slot-width="true">
                    <v-switch v-model="hideWaitTemperatures" hide-details class="mt-0" />
                </settings-row>
                <template v-if="moonrakerComponents.includes('timelapse')">
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.ConsoleTab.HideTimelapse')" :dynamic-slot-width="true">
                        <v-switch v-model="hideTimelapse" hide-details class="mt-0" />
                    </settings-row>
                </template>
                <v-divider class="my-2" />
                <div v-for="(filter, index) in consoleFilters" :key="index">
                    <v-divider v-if="index" class="my-2" />
                    <settings-row :title="filter.name">
                        <v-btn size="small" variant="outlined" class="minwidth-0 px-2" :color="filter.bool ? 'white' : 'grey'" @click="toggleFilter(filter)">
                            <v-icon size="small">{{ filter.bool ? mdiFilter : mdiFilterOff }}</v-icon>
                        </v-btn>
                        <v-btn size="small" variant="outlined" class="ml-3" @click="editFilter(filter)">
                            <v-icon start size="small">{{ mdiPencil }}</v-icon>
                            {{ t('Settings.Edit') }}
                        </v-btn>
                        <v-btn size="small" variant="outlined" class="ml-3 minwidth-0 px-2" color="error" @click="deleteFilter(filter.id)">
                            <v-icon size="small">{{ mdiDelete }}</v-icon>
                        </v-btn>
                    </settings-row>
                </div>
            </v-card-text>
            <v-card-actions class="d-flex justify-end">
                <v-btn variant="text" color="primary" @click="createFilter">{{ t('Settings.ConsoleTab.AddFilter') }}</v-btn>
            </v-card-actions>
        </v-card>
        <v-card v-else flat>
            <v-form v-model="form.valid" @submit.prevent="saveFilter">
                <v-card-title>
                    {{ form.id === null ? t('Settings.ConsoleTab.CreateHeadline') : t('Settings.ConsoleTab.EditHeadline') }}
                </v-card-title>
                <v-card-text>
                    <settings-row :title="t('Settings.ConsoleTab.Name')">
                        <v-text-field v-model="form.name" hide-details="auto" :rules="[rules.required, rules.unique]" density="compact" variant="outlined" />
                    </settings-row>
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.ConsoleTab.Regex')">
                        <v-textarea v-model="form.regex" variant="outlined" hide-details="auto" />
                    </settings-row>
                </v-card-text>
                <v-card-actions class="d-flex justify-end">
                    <v-btn variant="text" @click="form.bool = false">
                        {{ t('Buttons.Cancel') }}
                    </v-btn>
                    <v-btn color="primary" variant="text" type="submit">
                        {{ form.id === null ? t('Settings.ConsoleTab.StoreButton') : t('Settings.ConsoleTab.UpdateButton') }}
                    </v-btn>
                </v-card-actions>
            </v-form>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiFilter, mdiPencil, mdiFilterOff, mdiDelete, mdiConsoleLine } from '@mdi/js'
import type { GuiConsoleStateFilter } from '@/store/gui/console/types'
import { useGuiConsoleStore } from '@/store/gui/console'
import { useBase } from '@/composables/useBase'

interface ConsoleForm {
    bool: boolean
    id: string | null
    valid: boolean
    name: string
    regex: string
}

type ConsoleFilter = Omit<GuiConsoleStateFilter, 'id'> & { id: string }

const { t } = useI18n()
const guiConsoleStore = useGuiConsoleStore()
const { moonrakerComponents } = useBase()

const form = ref<ConsoleForm>({
    bool: false,
    valid: false,
    name: '',
    regex: '',
    id: null,
})

const rules = {
    required: (value: string) => value !== '' || 'required',
    unique: (value: string) => !existsPresetName(value) || 'Name already exists',
}

const consoleHeightTmp = ref(300)
let debounceTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
    consoleHeightTmp.value = consoleHeight.value
})

const consoleFilters = computed(() => (guiConsoleStore.getConsolefilters ?? []) as ConsoleFilter[])

const availableDirections = computed(() => [
    { title: t('Settings.ConsoleTab.DirectionTable'), value: 'table' },
    { title: t('Settings.ConsoleTab.DirectionShell'), value: 'shell' },
])

const consoleDirection = computed({
    get: () => guiConsoleStore.direction ?? 'table',
    set: (newVal) => guiConsoleStore.saveSetting({ name: 'direction', value: newVal }),
})

const availableEntryStyles = computed(() => [
    { title: t('Settings.ConsoleTab.EntryStyleDefault'), value: 'default' },
    { title: t('Settings.ConsoleTab.EntryStyleCompact'), value: 'compact' },
])

const entryStyle = computed({
    get: () => guiConsoleStore.entryStyle ?? 'default',
    set: (newVal) => guiConsoleStore.saveSetting({ name: 'entryStyle', value: newVal }),
})

const consoleHeight = computed({
    get: () => guiConsoleStore.height ?? 300,
    set: (newVal) => guiConsoleStore.saveSetting({ name: 'height', value: newVal }),
})

watch(consoleHeight, (newVal) => {
    consoleHeightTmp.value = newVal
})

function updateConsoleHeight(newVal: number) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        consoleHeight.value = newVal
    }, 500)
}

const hideWaitTemperatures = computed({
    get: () => guiConsoleStore.hideWaitTemperatures,
    set: (newVal) => guiConsoleStore.saveSetting({ name: 'hideWaitTemperatures', value: newVal }),
})

const hideTimelapse = computed({
    get: () => guiConsoleStore.hideTlCommands,
    set: (newVal) => guiConsoleStore.saveSetting({ name: 'hideTlCommands', value: newVal }),
})

function existsPresetName(name: string) {
    return consoleFilters.value.some((filter) => filter.name === name && filter.id !== form.value.id)
}

function clearForm() {
    form.value.bool = false
    form.value.id = null
    form.value.name = ''
    form.value.regex = ''
}

function toggleFilter(filter: ConsoleFilter) {
    const values = {
        name: filter.name,
        bool: !filter.bool,
        regex: filter.regex,
    }

    guiConsoleStore.filterUpdate({ id: filter.id, values })
}

function createFilter() {
    clearForm()
    form.value.bool = true
}

function editFilter(filter: ConsoleFilter) {
    form.value.name = filter.name
    form.value.id = filter.id
    form.value.regex = filter.regex

    form.value.bool = true
}

function saveFilter() {
    if (form.value.valid) {
        const filter = {
            name: form.value.name,
            bool: form.value.bool,
            regex: form.value.regex,
        }

        if (form.value.id) guiConsoleStore.filterUpdate({ id: form.value.id, values: filter })
        else guiConsoleStore.filterStore({ values: filter })

        clearForm()
    }
}

function deleteFilter(id: string) {
    guiConsoleStore.filterDelete(id)
}
</script>
