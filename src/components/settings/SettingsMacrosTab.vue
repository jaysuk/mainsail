<template>
    <v-card flat>
        <v-card-text v-if="showGeneral">
            <h3 class="text-h5 mb-3">{{ t('Settings.MacrosTab.General') }}</h3>
            <settings-row :title="t('Settings.MacrosTab.Management')">
                <v-select v-model="mode" :items="modes" variant="outlined" density="compact" hide-details attach />
            </settings-row>
            <v-divider class="my-2" />
        </v-card-text>
        <template v-if="mode === 'expert'">
            <settings-macros-tab-expert @update:show-general="updateShowGeneral" @scroll-to-top="scrollToTop" />
        </template>
        <template v-else>
            <settings-macros-tab-simple />
        </template>
    </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import SettingsMacrosTabSimple from '@/components/settings/SettingsMacrosTabSimple.vue'
import SettingsMacrosTabExpert from '@/components/settings/SettingsMacrosTabExpert.vue'
import { useGuiMacrosStore } from '@/store/gui/macros'

const emit = defineEmits<{
    scrollToTop: []
}>()

const { t } = useI18n()
const guiMacrosStore = useGuiMacrosStore()

const showGeneral = ref(true)

const modes = computed(() => [
    { text: t('Settings.MacrosTab.Simple'), value: 'simple' },
    { text: t('Settings.MacrosTab.Expert'), value: 'expert' },
])

const mode = computed({
    get: () => guiMacrosStore.mode ?? 'simple',
    set: (newVal) => guiMacrosStore.saveSetting({ name: 'mode', value: newVal }),
})

function updateShowGeneral(newVal: boolean) {
    showGeneral.value = newVal
}

function scrollToTop() {
    emit('scrollToTop')
}
</script>
