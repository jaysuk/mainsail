<template>
    <v-menu :close-on-content-click="false" location="bottom end">
        <template #activator="{ props: activatorProps }">
            <v-btn icon="" variant="text" v-bind="activatorProps">
                <v-icon size="small">{{ mdiCog }}</v-icon>
            </v-btn>
        </template>
        <v-list>
            <v-list-item v-if="hasMmuEncoder || hasSyncFeedback" class="minHeight36">
                <v-checkbox v-model="showClogDetection" class="mt-0" hide-details :label="t('Panels.MmuPanel.ShowClogTangleDetection')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showTtgMap" class="mt-0" hide-details :label="t('Panels.MmuPanel.ShowTtgMap')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showDetails" class="mt-0" hide-details :label="t('Panels.MmuPanel.ShowDetails')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="largeFilamentStatus" class="mt-0" hide-details :label="t('Panels.MmuPanel.LargeFilamentStatus')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showUnavailableSpoolColor" class="mt-0" hide-details :label="t('Panels.MmuPanel.ShowUnavailableSpoolColor')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showName" class="mt-0" hide-details :label="t('Panels.MmuPanel.ShowName')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showLogos" class="mt-0" hide-details :label="t('Panels.MmuPanel.ShowLogos')" />
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-checkbox v-model="showClimate" class="mt-0" hide-details :label="t('Panels.MmuPanel.ShowClimate')" />
            </v-list-item>
        </v-list>
    </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiCog } from '@mdi/js'
import { useMmu } from '@/composables/useMmu'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { hasMmuEncoder, hasSyncFeedback } = useMmu()
const guiStore = useGuiStore()

const showClogDetection = computed<boolean>({
    get: () => guiStore.view.mmu.showClogDetection,
    set: (newVal) => guiStore.saveSetting({ name: 'view.mmu.showClogDetection', value: newVal }),
})

const showTtgMap = computed<boolean>({
    get: () => guiStore.view.mmu.showTtgMap,
    set: (newVal) => guiStore.saveSetting({ name: 'view.mmu.showTtgMap', value: newVal }),
})

const showDetails = computed<boolean>({
    get: () => guiStore.view.mmu.showDetails,
    set: (newVal) => guiStore.saveSetting({ name: 'view.mmu.showDetails', value: newVal }),
})

const largeFilamentStatus = computed<boolean>({
    get: () => guiStore.view.mmu.largeFilamentStatus,
    set: (newVal) => guiStore.saveSetting({ name: 'view.mmu.largeFilamentStatus', value: newVal }),
})

const showLogos = computed<boolean>({
    get: () => guiStore.view.mmu.showLogos,
    set: (newVal) => guiStore.saveSetting({ name: 'view.mmu.showLogos', value: newVal }),
})

const showName = computed<boolean>({
    get: () => guiStore.view.mmu.showName,
    set: (newVal) => guiStore.saveSetting({ name: 'view.mmu.showName', value: newVal }),
})

const showClimate = computed<boolean>({
    get: () => guiStore.view.mmu.showClimate,
    set: (newVal) => guiStore.saveSetting({ name: 'view.mmu.showClimate', value: newVal }),
})

const showUnavailableSpoolColor = computed<boolean>({
    get: () => guiStore.view.mmu.showUnavailableSpoolColor,
    set: (newVal) => guiStore.saveSetting({ name: 'view.mmu.showUnavailableSpoolColor', value: newVal }),
})
</script>
