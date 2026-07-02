<template>
    <div>
        <plugins-install-dialog v-model="boolInstallDialog" />
        <v-card flat>
            <v-card-text>
                <h3 class="text-h5 mb-3">{{ t('Settings.PluginsTab.Plugins') }}</h3>
                <p v-if="plugins.length === 0" class="text-medium-emphasis">{{ t('Settings.PluginsTab.NoPlugins') }}</p>
                <div v-for="(plugin, key) in plugins" :key="plugin.id ?? key">
                    <v-divider v-if="key" class="my-2" />
                    <plugins-entry :plugin="plugin" />
                </div>
            </v-card-text>
            <v-card-actions class="d-flex justify-end">
                <v-btn variant="text" color="primary" @click="boolInstallDialog = true">
                    <v-icon start>{{ mdiPuzzle }}</v-icon>
                    {{ t('Settings.PluginsTab.InstallPlugin') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiPuzzle } from '@mdi/js'
import PluginsEntry from '@/components/settings/Plugins/PluginsEntry.vue'
import PluginsInstallDialog from '@/components/settings/Plugins/PluginsInstallDialog.vue'
import { useGuiPluginsStore } from '@/store/gui/plugins'

const { t } = useI18n()
const guiPluginsStore = useGuiPluginsStore()

const boolInstallDialog = ref(false)

const plugins = computed(() => guiPluginsStore.getPlugins ?? [])
</script>
