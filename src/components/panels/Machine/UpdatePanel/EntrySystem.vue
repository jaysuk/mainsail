<template>
    <div>
        <v-row class="py-2">
            <v-col class="pl-6">
                <strong>{{ t('Machine.UpdatePanel.System') }}</strong>
                <br />
                <template v-if="package_count">
                    <a class="text-info cursor--pointer" @click="boolShowPackageList = true">
                        <v-icon size="small" color="info" class="mr-1">{{ mdiInformation }}</v-icon>
                        {{ t('Machine.UpdatePanel.CountPackagesCanBeUpgraded', { count: package_count }) }}
                    </a>
                </template>
                <span v-else>{{ t('Machine.UpdatePanel.OSPackages') }}</span>
            </v-col>
            <v-col class="col-auto pr-6 text-right" align-self="center">
                <v-chip size="small" label variant="outlined" :color="btnColor" :disabled="btnDisabled" class="minwidth-0 px-2 text-uppercase" @click="doUpdate">
                    <v-icon size="small" class="mr-1">{{ btnIcon }}</v-icon>
                    {{ btnText }}
                </v-chip>
            </v-col>
        </v-row>
        <system-packages-list v-model="boolShowPackageList" :packages-list="package_list" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiCheck, mdiInformation, mdiProgressUpload } from '@mdi/js'
import SystemPackagesList from '@/components/panels/Machine/UpdatePanel/SystemPackagesList.vue'
import { useBase } from '@/composables/useBase'
import { useServerUpdateManagerStore } from '@/store/server/updateManager'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { printer_state } = useBase()
const serverUpdateManagerStore = useServerUpdateManagerStore()

// to display the dialog for packages
const boolShowPackageList = ref(false)

const package_count = computed(() => serverUpdateManagerStore.system?.package_count ?? 0)

const package_list = computed(() => serverUpdateManagerStore.system?.package_list ?? [])

const btnDisabled = computed(() => {
    // disable button if the printer is printing
    if (['printing', 'paused'].includes(printer_state.value)) return true

    // disable button if no package is available to update
    return package_count.value === 0
})

const btnIcon = computed(() => {
    if (package_count.value) return mdiProgressUpload

    return mdiCheck
})

const btnColor = computed(() => {
    // set button to primary, if updates are available
    if (package_count.value) return 'primary'

    return 'green'
})

const btnText = computed(() => {
    if (package_count.value) return t('Machine.UpdatePanel.Upgrade')

    return t('Machine.UpdatePanel.UpToDate')
})

function doUpdate() {
    webSocketClient.emit('machine.update.system', {})
}
</script>

<style scoped></style>
