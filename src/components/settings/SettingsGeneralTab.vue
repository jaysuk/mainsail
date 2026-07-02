<template>
    <div>
        <v-card flat>
            <v-card-text>
                <settings-row :title="t('Settings.GeneralTab.PrinterName')">
                    <v-text-field v-model="printerName" hide-details variant="outlined" density="compact" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GeneralTab.Language')">
                    <v-select v-model="currentLanguage" :items="availableLanguages" hide-details variant="outlined" density="compact" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GeneralTab.DateFormat')">
                    <v-select v-model="dateFormat" :items="dateFormatItems" hide-details variant="outlined" density="compact" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GeneralTab.TimeFormat')">
                    <v-select v-model="timeFormat" :items="timeFormatItems" hide-details variant="outlined" density="compact" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GeneralTab.CalcPrintProgress')" :sub-title="t('Settings.GeneralTab.CalcPrintProgressDescription')">
                    <v-select v-model="calcPrintProgress" :items="calcPrintProgressItems" hide-details density="compact" variant="outlined" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GeneralTab.CalcEstimateTime')" :sub-title="t('Settings.GeneralTab.CalcEstimateTimeDescription')">
                    <v-select v-model="calcEstimateTime" :items="calcEstimateItems" multiple hide-details density="compact" variant="outlined" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GeneralTab.CalcEtaTime')" :sub-title="t('Settings.GeneralTab.CalcEtaTimeDescription')">
                    <v-select v-model="calcEtaTime" :items="calcEtaTimeItems" multiple hide-details density="compact" variant="outlined" />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GeneralTab.MainsailSettingsMoonrakerDb')" :dynamic-slot-width="true">
                    <settings-general-tab-backup-database />
                    <settings-general-tab-restore-database />
                </settings-row>
                <v-divider class="my-2" />
                <settings-row :title="t('Settings.GeneralTab.FactoryReset')" :dynamic-slot-width="true">
                    <settings-general-tab-reset-database />
                </settings-row>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import SettingsGeneralTabBackupDatabase from '@/components/settings/General/GeneralBackup.vue'
import SettingsGeneralTabRestoreDatabase from '@/components/settings/General/GeneralRestore.vue'
import SettingsGeneralTabResetDatabase from '@/components/settings/General/GeneralReset.vue'
import { useBase } from '@/composables/useBase'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { formatDate, browserLocale } = useBase()
const guiStore = useGuiStore()

const availableLanguages = ref<{ title: string; value: string }[]>([])

onMounted(async () => {
    const locales = import.meta.glob('../../locales/*.json', { import: 'default' })
    const languages: { title: string; value: string }[] = []

    for (const file in locales) {
        const langKey = file.slice(file.lastIndexOf('/') + 1, file.lastIndexOf('.'))
        const locale = (await locales[file]()) as { title: string }

        languages.push({
            title: locale.title,
            value: langKey,
        })
    }

    availableLanguages.value = languages.sort((a, b) => a.title.localeCompare(b.title))
})

const printerName = computed({
    get: () => guiStore.general.printername,
    set: (newVal) => guiStore.saveSetting({ name: 'general.printername', value: newVal }),
})

const currentLanguage = computed({
    get: () => guiStore.general.language,
    set: (newVal) => guiStore.saveSetting({ name: 'general.language', value: newVal }),
})

const dateFormat = computed({
    get: () => guiStore.general.dateFormat,
    set: (newVal) => guiStore.saveSetting({ name: 'general.dateFormat', value: newVal }),
})

const dateFormatItems = computed(() => {
    const date = new Date()
    const availableFormats = [
        null,
        'short',
        'iso',
        'mm-dd-yyyy',
        'mm-dd-yy',
        'm-d-yyyy',
        'm-d-yy',
        'dd-mm-yyyy',
        'dd-mm-yy',
        'dd.mm.yyyy',
        'dd.mm.yy',
        'd.m.yyyy',
        'd.m.yy',
        'yyyy. mm. dd.',
        'yy. mm. dd.',
    ]

    return availableFormats.map((format) => {
        let name: string = format ?? 'Browser'
        if (format !== null && ['short', 'iso'].includes(format)) name = format.toUpperCase()

        let example = formatDate(date, format)
        if (format === null) example = date.toLocaleDateString(browserLocale.value, { dateStyle: 'medium' })

        return {
            value: format,
            title: `${name} (${example})`,
        }
    })
})

const timeFormat = computed({
    get: () => guiStore.general.timeFormat,
    set: (newVal) => guiStore.saveSetting({ name: 'general.timeFormat', value: newVal }),
})

const timeFormatItems = computed(() => {
    const date = new Date()
    const userLocale = navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language

    return [
        { value: null, title: `Browser (${date.toLocaleTimeString(userLocale, { timeStyle: 'short' })})` },
        {
            value: '24hours',
            title: t('Settings.GeneralTab.24hours', {
                time: date.toLocaleTimeString(userLocale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
            }),
        },
        {
            value: '12hours',
            title: t('Settings.GeneralTab.12hours', {
                time: date.toLocaleTimeString(userLocale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h12' }),
            }),
        },
    ]
})

const calcPrintProgressItems = computed(() => [
    { value: 'file-relative', title: t('Settings.GeneralTab.CalcPrintProgressItems.FileRelative') },
    { value: 'file-absolute', title: t('Settings.GeneralTab.CalcPrintProgressItems.FileAbsolute') },
    { value: 'slicer', title: t('Settings.GeneralTab.CalcPrintProgressItems.Slicer') },
    { value: 'filament', title: t('Settings.GeneralTab.CalcPrintProgressItems.Filament') },
])

const calcPrintProgress = computed({
    get: () => guiStore.general.calcPrintProgress ?? 'file-relative',
    set: (newVal) => guiStore.saveSetting({ name: 'general.calcPrintProgress', value: newVal }),
})

const calcEstimateItems = computed(() => [
    { value: 'file', title: t('Settings.GeneralTab.EstimateValues.File') },
    { value: 'filament', title: t('Settings.GeneralTab.EstimateValues.Filament') },
])

const calcEstimateTime = computed({
    get: () => guiStore.general.calcEstimateTime,
    set: (newVal) => guiStore.saveSetting({ name: 'general.calcEstimateTime', value: newVal }),
})

const calcEtaTimeItems = computed(() => [
    { value: 'file', title: t('Settings.GeneralTab.EstimateValues.File') },
    { value: 'filament', title: t('Settings.GeneralTab.EstimateValues.Filament') },
    { value: 'slicer', title: t('Settings.GeneralTab.EstimateValues.Slicer') },
])

const calcEtaTime = computed({
    get: () => guiStore.general.calcEtaTime,
    set: (newVal) => guiStore.saveSetting({ name: 'general.calcEtaTime', value: newVal }),
})
</script>
