<template>
    <settings-row :title="plugin.name" :sub-title="subTitle">
        <v-btn v-if="plugin.homepage" size="small" variant="outlined" class="ml-3 minwidth-0 px-2" :href="plugin.homepage" target="_blank">
            <v-icon size="small">{{ mdiOpenInNew }}</v-icon>
        </v-btn>
        <v-switch :model-value="plugin.enabled" hide-details density="compact" class="ml-3 shrink" @update:model-value="toggleEnabled" />
        <v-btn size="small" variant="outlined" class="ml-3 minwidth-0 px-2" color="error" @click="dialogUninstall = true">
            <v-icon size="small">{{ mdiDelete }}</v-icon>
        </v-btn>
        <confirmation-dialog
            v-model="dialogUninstall"
            :title="t('Settings.PluginsTab.UninstallPlugin')"
            :text="t('Settings.PluginsTab.UninstallPluginQuestion', { name: plugin.name })"
            :action-button-text="t('Settings.PluginsTab.Uninstall')"
            @action="uninstallPlugin" />
    </settings-row>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import type { GuiPluginsStatePlugin } from '@/store/gui/plugins/types'
import { mdiDelete, mdiOpenInNew } from '@mdi/js'
import { useGuiPluginsStore } from '@/store/gui/plugins'

const props = defineProps<{
    plugin: GuiPluginsStatePlugin
}>()

const { t } = useI18n()
const guiPluginsStore = useGuiPluginsStore()

const dialogUninstall = ref(false)

const subTitle = computed(() => `${props.plugin.author} · v${props.plugin.version}`)

function toggleEnabled() {
    guiPluginsStore.toggleEnabled(props.plugin.id)
}

function uninstallPlugin() {
    guiPluginsStore.uninstall(props.plugin.id)
}
</script>
