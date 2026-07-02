<template>
    <div>
        <template v-if="!boolFormEdit">
            <v-card-text>
                <h3 class="text-h5 mb-3">{{ t('Settings.MacrosTab.Macrogroups') }}</h3>
                <template v-if="groups.length">
                    <div v-for="(group, index) in groups" :key="index">
                        <v-divider v-if="index" class="my-2" />
                        <settings-row
                            :title="group.name !== '' ? group.name : '<' + t('Settings.MacrosTab.UnknownGroup') + '>'"
                            :sub-title="t('Settings.MacrosTab.CountMacros', { count: 'macros' in group ? group.macros?.length ?? 0 : 0 }, 'macros' in group ? group.macros?.length ?? 0 : 0)"
                            :dynamic-slot-width="true">
                            <v-btn size="small" variant="outlined" class="ml-3" @click="editMacrogroup(group)">
                                <v-icon start size="small">{{ mdiPencil }}</v-icon>
                                {{ t('Settings.Edit') }}
                            </v-btn>
                            <v-btn size="small" variant="outlined" class="ml-3 minwidth-0 px-2" color="error" @click="deleteMacrogroup(group.id ?? '')">
                                <v-icon size="small">{{ mdiDelete }}</v-icon>
                            </v-btn>
                        </settings-row>
                    </div>
                </template>
                <template v-else>
                    <v-row>
                        <v-col>
                            <p class="mb-0 text-center font-italic">{{ t('Settings.MacrosTab.NoGroups') }}</p>
                        </v-col>
                    </v-row>
                </template>
            </v-card-text>
            <v-card-actions class="d-flex justify-end">
                <v-btn variant="text" color="primary" @click="addGroup">{{ t('Settings.MacrosTab.AddGroup') }}</v-btn>
            </v-card-actions>
        </template>
        <template v-else-if="boolFormEdit">
            <v-card-text>
                <h3 class="text-h5 mb-3">{{ t('Settings.MacrosTab.EditGroup') }}</h3>
                <settings-row :title="t('Settings.MacrosTab.Name')">
                    <v-text-field v-model="editGroupName" hide-details="auto" :rules="[rules.required, rules.groupUnique]" density="compact" variant="outlined" @update:model-value="updateGroupOptionName" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.MacrosTab.Color')">
                    <v-select v-model="editGroupColor" :items="groupColors" variant="outlined" density="compact" hide-details attach @update:model-value="updateGroupOptionColor" />
                </settings-row>
                <template v-if="editGroup?.color === 'custom'">
                    <v-divider class="my-2" />
                    <settings-row :title="t('Settings.MacrosTab.CustomColor')">
                        <v-menu location="bottom start" :close-on-content-click="false">
                            <template #activator="{ props: activatorProps }">
                                <v-btn v-bind="activatorProps" :color="editGroup?.colorCustom" class="minwidth-0 px-5" size="small" />
                            </template>
                            <v-color-picker :model-value="editGroup?.colorCustom" hide-mode-switch mode="rgba" @update:model-value="updateGroupOptionColorCustom" />
                        </v-menu>
                    </settings-row>
                </template>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.MacrosTab.Status')">
                    <v-tooltip location="top">
                        <template #activator="{ props: activatorProps }">
                            <v-btn
                                size="small"
                                variant="outlined"
                                v-bind="activatorProps"
                                class="ml-3 minwidth-0 px-2"
                                :color="editGroup?.showInStandby ? '' : 'secondary'"
                                @click="updateGroupOptionShowInStandby(!editGroup?.showInStandby)">
                                <v-icon size="small">{{ mdiSleep }}</v-icon>
                            </v-btn>
                        </template>
                        <span>{{ t('Settings.MacrosTab.ShowInStateStandby') }}</span>
                    </v-tooltip>
                    <v-tooltip location="top">
                        <template #activator="{ props: activatorProps }">
                            <v-btn
                                size="small"
                                variant="outlined"
                                v-bind="activatorProps"
                                class="ml-3 minwidth-0 px-2"
                                :color="editGroup?.showInPause ? '' : 'secondary'"
                                @click="updateGroupOptionShowInPause(!editGroup?.showInPause)">
                                <v-icon size="small">{{ mdiPause }}</v-icon>
                            </v-btn>
                        </template>
                        <span>{{ t('Settings.MacrosTab.ShowInStatePaused') }}</span>
                    </v-tooltip>
                    <v-tooltip location="top">
                        <template #activator="{ props: activatorProps }">
                            <v-btn
                                size="small"
                                variant="outlined"
                                v-bind="activatorProps"
                                class="ml-3 minwidth-0 px-2"
                                :color="editGroup?.showInPrinting ? '' : 'secondary'"
                                @click="updateGroupOptionShowInPrinting(!editGroup?.showInPrinting)">
                                <v-icon size="small">{{ mdiPrinter3dNozzle }}</v-icon>
                            </v-btn>
                        </template>
                        <span>{{ t('Settings.MacrosTab.ShowInStatePrinting') }}</span>
                    </v-tooltip>
                </settings-row>
                <v-divider class="my-2" />
                <h3 class="text-h5 mt-6 mb-3">{{ t('Settings.MacrosTab.GroupMacros') }}</h3>
                <template v-if="editGroup?.macros && editGroup?.macros?.length">
                    <draggable v-model="editGroupMacros" handle=".handle" ghost-class="ghost" group="macros" :force-fallback="true" @change="updateMacroOrder">
                        <template #item="{ element: macro, index }">
                            <v-row class="my-2 mx-0" :style="draggableBgStyle">
                                <v-col class="col-auto pr-0 d-flex py-2">
                                    <v-icon class="handle">{{ mdiDragVertical }}</v-icon>
                                </v-col>
                                <v-col class="py-2">
                                    <settings-row :key="'groupMacro_macro_' + index" :title="macro.name" :sub-title="getMacroDescription(macro.name)" :dynamic-slot-width="true">
                                        <template v-if="existsMacro(macro.name)">
                                            <v-tooltip location="top">
                                                <template #activator="{ props: activatorProps }">
                                                    <v-btn size="small" variant="outlined" v-bind="activatorProps" class="ml-3 minwidth-0 px-2" :color="macro.color" @click="changeColorMacroFromGroup(macro)">
                                                        <v-icon size="small" start>{{ mdiPalette }}</v-icon>
                                                        {{ macro.color }}
                                                    </v-btn>
                                                </template>
                                                <span>{{ t('Settings.MacrosTab.ChangeMacroColor') }}</span>
                                            </v-tooltip>
                                            <v-tooltip location="top">
                                                <template #activator="{ props: activatorProps }">
                                                    <v-btn
                                                        size="small"
                                                        variant="outlined"
                                                        v-bind="activatorProps"
                                                        class="ml-3 minwidth-0 px-2"
                                                        :color="macro.showInStandby ? '' : 'secondary'"
                                                        @click="updateMacroFromGroup(macro, 'showInStandby', !macro.showInStandby)">
                                                        <v-icon size="small">{{ mdiSleep }}</v-icon>
                                                    </v-btn>
                                                </template>
                                                <span>{{ t('Settings.MacrosTab.ShowInStateStandby') }}</span>
                                            </v-tooltip>
                                            <v-tooltip location="top">
                                                <template #activator="{ props: activatorProps }">
                                                    <v-btn
                                                        size="small"
                                                        variant="outlined"
                                                        v-bind="activatorProps"
                                                        class="ml-3 minwidth-0 px-2"
                                                        :color="macro.showInPause ? '' : 'secondary'"
                                                        @click="updateMacroFromGroup(macro, 'showInPause', !macro.showInPause)">
                                                        <v-icon size="small">{{ mdiPause }}</v-icon>
                                                    </v-btn>
                                                </template>
                                                <span>{{ t('Settings.MacrosTab.ShowInStatePaused') }}</span>
                                            </v-tooltip>
                                            <v-tooltip location="top">
                                                <template #activator="{ props: activatorProps }">
                                                    <v-btn
                                                        size="small"
                                                        variant="outlined"
                                                        v-bind="activatorProps"
                                                        class="ml-3 minwidth-0 px-2"
                                                        :color="macro.showInPrinting ? '' : 'secondary'"
                                                        @click="updateMacroFromGroup(macro, 'showInPrinting', !macro.showInPrinting)">
                                                        <v-icon size="small">{{ mdiPrinter3dNozzle }}</v-icon>
                                                    </v-btn>
                                                </template>
                                                <span>{{ t('Settings.MacrosTab.ShowInStatePrinting') }}</span>
                                            </v-tooltip>
                                        </template>
                                        <v-tooltip location="top">
                                            <template #activator="{ props: activatorProps }">
                                                <v-btn size="small" variant="outlined" v-bind="activatorProps" class="ml-3 minwidth-0 px-2" color="error" @click="removeMacroFromGroup(macro)">
                                                    <v-icon size="small">{{ mdiDelete }}</v-icon>
                                                </v-btn>
                                            </template>
                                            <span>{{ t('Settings.MacrosTab.DeleteMacroFromGroup') }}</span>
                                        </v-tooltip>
                                    </settings-row>
                                </v-col>
                            </v-row>
                        </template>
                    </draggable>
                </template>
                <template v-else>
                    <v-row>
                        <v-col>
                            <p class="mb-0 text-center font-italic">{{ t('Settings.MacrosTab.NoMacrosInGroup') }}</p>
                        </v-col>
                    </v-row>
                </template>
                <v-row class="mt-6 mb-3 flex-column flex-md-row">
                    <v-col class="py-0 align-content-center mb-3 mb-md-0">
                        <h3 class="text-h5">{{ t('Settings.MacrosTab.AvailableMacros') }}</h3>
                    </v-col>
                    <v-col class="py-0">
                        <v-text-field v-model="searchMacros" :append-icon="mdiMagnify" :label="t('Settings.MacrosTab.Search')" single-line variant="outlined" clearable hide-details density="compact" />
                    </v-col>
                </v-row>
                <template v-if="availableMacros.length">
                    <template v-for="(macro, index) in availableMacros" :key="'availableMacro_macro_' + index">
                        <v-divider v-if="index" class="my-2" />
                        <settings-row :title="macro.name" :sub-title="macro.description" :dynamic-slot-width="true">
                            <v-btn size="small" variant="outlined" class="ml-3" @click="addMacroToGroup(macro)">
                                <v-icon start size="small">{{ mdiPlus }}</v-icon>
                                {{ t('Settings.MacrosTab.Add') }}
                            </v-btn>
                        </settings-row>
                    </template>
                </template>
                <template v-else>
                    <v-row>
                        <v-col>
                            <p class="mb-0 text-center font-italic">{{ t('Settings.MacrosTab.NoAvailableMacros') }}</p>
                        </v-col>
                    </v-row>
                </template>
            </v-card-text>
            <v-card-actions class="d-flex justify-end">
                <v-btn variant="text" @click="cancelEditMacrogroup">{{ t('Buttons.Close') }}</v-btn>
            </v-card-actions>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import draggable from 'vuedraggable'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiDelete, mdiSleep, mdiPause, mdiPrinter3dNozzle, mdiPlus, mdiDragVertical, mdiPalette, mdiPencil, mdiMagnify } from '@mdi/js'
import type { PrinterStateMacro } from '@/store/printer/types'
import type { GuiMacrosStateMacrogroup, GuiMacrosStateMacrogroupMacro } from '@/store/gui/macros/types'
import { clearColorObject, type ColorPickerValue } from '@/plugins/helpers'
import type { DraggableChangeEvent } from '@/types/vuedraggable'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { usePrinterStore } from '@/store/printer'
import { useGuiMacrosStore } from '@/store/gui/macros'

const emit = defineEmits<{
    'update:showGeneral': [boolean]
    scrollToTop: []
}>()

const { t } = useI18n()
const { draggableBgStyle } = useMainsailTheme()
const printerStore = usePrinterStore()
const guiMacrosStore = useGuiMacrosStore()

const rules = {
    required: (value: string) => value !== '' || 'required',
    groupUnique: (value: string) => !existsGroupName(value) || 'Name already exists',
}

const boolFormEdit = ref(false)
const editGroupId = ref<string | null>('')
const searchMacros = ref('')

const groupColors = computed(() => [
    { title: t('Settings.MacrosTab.Primary'), value: 'primary' },
    { title: t('Settings.MacrosTab.Secondary'), value: 'secondary' },
    { title: t('Settings.MacrosTab.Success'), value: 'success' },
    { title: t('Settings.MacrosTab.Warning'), value: 'warning' },
    { title: t('Settings.MacrosTab.Error'), value: 'error' },
    { title: t('Settings.MacrosTab.Custom'), value: 'custom' },
])

const macroColors = computed(() => {
    const colors = [...groupColors.value]
    const indexCustom = colors.findIndex((color) => color.value === 'custom')
    if (indexCustom !== -1) colors.splice(indexCustom, 1)

    colors.push({ title: t('Settings.MacrosTab.Group'), value: 'group' })

    return colors
})

const allMacros = computed(() => {
    const macros = printerStore.getMacros ?? []
    return macros.filter((macro: PrinterStateMacro) => {
        return macro.name.toLowerCase().includes(searchMacros.value.toLowerCase()) || macro.description?.toLowerCase().includes(searchMacros.value.toLowerCase())
    })
})

const editGroupUsedMacros = computed(() => editGroup.value?.macros?.map((m: GuiMacrosStateMacrogroupMacro) => m.name) ?? [])

const availableMacros = computed(() => allMacros.value.filter((m: PrinterStateMacro) => !editGroupUsedMacros.value.includes(m.name)))

const groups = computed(() => guiMacrosStore.getAllMacrogroups ?? [])

const editGroup = computed<GuiMacrosStateMacrogroup | undefined>(() => guiMacrosStore.getMacrogroup(editGroupId.value ?? ''))

const editGroupName = ref('')
const editGroupColor = ref<GuiMacrosStateMacrogroup['color']>('primary')

watch(
    editGroup,
    () => {
        editGroupName.value = editGroup.value?.name ?? ''
        editGroupColor.value = editGroup.value?.color ?? 'primary'
    },
    { immediate: true }
)

const editGroupMacros = computed<GuiMacrosStateMacrogroupMacro[]>({
    get: () => {
        const macros = editGroup.value?.macros ?? []
        macros.sort((a: GuiMacrosStateMacrogroupMacro, b: GuiMacrosStateMacrogroupMacro) => a.pos - b.pos)

        return macros
    },
    set: () => {},
})

function existsGroupName(name: string) {
    return groups.value.findIndex((group: GuiMacrosStateMacrogroup) => group.name === name && group.id !== editGroupId.value) >= 0
}

function updateShowGeneral(newVal: boolean) {
    emit('update:showGeneral', newVal)
}

async function addGroup() {
    const values: GuiMacrosStateMacrogroup = {
        id: null,
        name: '',
        color: 'primary',
        colorCustom: '#fff',
        showInStandby: true,
        showInPause: true,
        showInPrinting: true,
    }
    editGroupId.value = guiMacrosStore.groupStore({ values })

    boolFormEdit.value = true
}

function editMacrogroup(group: GuiMacrosStateMacrogroup) {
    boolFormEdit.value = true
    editGroupId.value = group.id
}

function deleteMacrogroup(id: string) {
    guiMacrosStore.groupDelete(id)
}

function addMacroToGroup(macro: PrinterStateMacro) {
    guiMacrosStore.addMacroToMacrogroup({
        id: editGroupId.value ?? '',
        macro: macro.name,
    })
}

function updateMacroFromGroup<K extends keyof GuiMacrosStateMacrogroupMacro>(macro: GuiMacrosStateMacrogroupMacro, option: K, value: GuiMacrosStateMacrogroupMacro[K]) {
    guiMacrosStore.updateMacroFromMacrogroup({
        id: editGroupId.value ?? '',
        macro: macro.name,
        option,
        value,
    })
}

function updateMacroOrder(output: DraggableChangeEvent<GuiMacrosStateMacrogroupMacro>) {
    if (!output.moved) return

    const oldIndex = output.moved.oldIndex
    const newIndex = output.moved.newIndex
    const oldPos = editGroupMacros.value[oldIndex].pos
    const newPos = editGroupMacros.value[newIndex].pos

    updateMacroFromGroup(editGroupMacros.value[oldIndex], 'pos', newPos)
    updateMacroFromGroup(editGroupMacros.value[newIndex], 'pos', oldPos)
}

function changeColorMacroFromGroup(macro: GuiMacrosStateMacrogroupMacro) {
    let index = macroColors.value.findIndex((color) => color.value === macro.color) + 1
    const maxIndex = macroColors.value.length - 1

    if (index > maxIndex) index = 0
    const newColor = macroColors.value[index].value as GuiMacrosStateMacrogroupMacro['color']

    updateMacroFromGroup(macro, 'color', newColor)
}

function removeMacroFromGroup(macro: GuiMacrosStateMacrogroupMacro) {
    guiMacrosStore.removeMacroFromMacrogroup({
        id: editGroupId.value ?? '',
        macro: macro.name,
    })
}

function existsMacro(macroname: string) {
    return allMacros.value.findIndex((m: PrinterStateMacro) => m.name.toLowerCase() === macroname.toLowerCase()) !== -1
}

function getMacroDescription(macroname: string) {
    const macro = allMacros.value.find((m: PrinterStateMacro) => m.name.toLowerCase() === macroname.toLowerCase())
    if (!macro) return t('Settings.MacrosTab.DeletedMacro')

    return macro?.description ?? null
}

function updateMacrogroupOption(option: string, newVal: boolean | string) {
    const values: Record<string, boolean | string> = {}
    values[option] = newVal

    guiMacrosStore.groupUpdate({
        id: editGroupId.value ?? '',
        values,
    })
}

let nameDebounceTimer: ReturnType<typeof setTimeout> | undefined
function updateGroupOptionName(newVal: string) {
    if (nameDebounceTimer) clearTimeout(nameDebounceTimer)
    nameDebounceTimer = setTimeout(() => {
        updateMacrogroupOption('name', newVal)
    }, 250)
}

function updateGroupOptionColor(newVal: string) {
    updateMacrogroupOption('color', newVal)
}

let colorCustomDebounceTimer: ReturnType<typeof setTimeout> | undefined
function updateGroupOptionColorCustom(newVal: ColorPickerValue) {
    if (colorCustomDebounceTimer) clearTimeout(colorCustomDebounceTimer)
    colorCustomDebounceTimer = setTimeout(() => {
        updateMacrogroupOption('colorCustom', clearColorObject(newVal))
    }, 250)
}

function updateGroupOptionShowInStandby(newVal: boolean) {
    updateMacrogroupOption('showInStandby', newVal)
}

function updateGroupOptionShowInPause(newVal: boolean) {
    updateMacrogroupOption('showInPause', newVal)
}

function updateGroupOptionShowInPrinting(newVal: boolean) {
    updateMacrogroupOption('showInPrinting', newVal)
}

watch(boolFormEdit, (newVal) => {
    updateShowGeneral(!newVal)
})

function cancelEditMacrogroup() {
    boolFormEdit.value = false
    emit('scrollToTop')
}
</script>
