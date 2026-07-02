<template>
    <v-dialog v-model="showDialog" width="500" :fullscreen="isMobile">
        <panel card-class="plugins-install-dialog" :icon="mdiPuzzle" :title="t('Settings.PluginsTab.InstallPlugin')" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="close">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>
                <p class="mb-3">{{ t('Settings.PluginsTab.InstallPluginDescription') }}</p>
                <v-file-input
                    v-model="zipFile"
                    accept=".zip"
                    :label="t('Settings.PluginsTab.PluginPackage')"
                    variant="outlined"
                    density="compact"
                    :loading="installing"
                    :disabled="installing"
                    :error-messages="errorMessage ? [errorMessage] : []"
                    hide-details="auto" />
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" :disabled="installing" @click="close">{{ t('Buttons.Cancel') }}</v-btn>
                <v-btn variant="text" color="primary" :loading="installing" :disabled="!zipFileValue" @click="install">{{ t('Settings.PluginsTab.Install') }}</v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick, mdiPuzzle } from '@mdi/js'
import { useBase } from '@/composables/useBase'
import { useGuiPluginsStore } from '@/store/gui/plugins'
import { installPluginPackage, PluginPackageError } from '@/plugins/mainsail/packageInstall'

const { t } = useI18n()
const { isMobile } = useBase()
const guiPluginsStore = useGuiPluginsStore()

const showDialog = defineModel<boolean>({ required: true })

const zipFile = ref<File[] | File | null>(null)
const installing = ref(false)
const errorMessage = ref('')

const zipFileValue = computed<File | null>(() => (Array.isArray(zipFile.value) ? (zipFile.value[0] ?? null) : zipFile.value))

const errorMessages: Record<string, string> = {
    notAZip: 'Settings.PluginsTab.Errors.NotAZip',
    pathTraversal: 'Settings.PluginsTab.Errors.PathTraversal',
    missingManifest: 'Settings.PluginsTab.Errors.MissingManifest',
    invalidManifest: 'Settings.PluginsTab.Errors.InvalidManifest',
    missingEntryFile: 'Settings.PluginsTab.Errors.MissingEntryFile',
    uploadFailed: 'Settings.PluginsTab.Errors.UploadFailed',
}

watch(zipFile, () => {
    errorMessage.value = ''
})

async function install() {
    if (!zipFileValue.value) return

    installing.value = true
    errorMessage.value = ''

    try {
        const { entryUrl, ...manifest } = await installPluginPackage(zipFileValue.value)
        await guiPluginsStore.install({ manifest, entryUrl })
        close()
    } catch (e) {
        const key = e instanceof PluginPackageError ? errorMessages[e.message] : undefined
        errorMessage.value = t(key ?? 'Settings.PluginsTab.Errors.Unknown')
    } finally {
        installing.value = false
    }
}

function close() {
    showDialog.value = false
    zipFile.value = null
    errorMessage.value = ''
}
</script>
