<template>
    <panel :title="t('Heightmap.Profiles')" card-class="heightmap-profiles-panel" :icon="mdiStackOverflow" :collapsible="true" class="mt-6 mt-md-0">
        <v-card-text v-if="Object.keys(profiles).length" class="px-0 py-3">
            <template v-for="(profile, name, index) in profiles" :key="`profile_${name}`">
                <v-divider v-if="index" class="my-3" />
                <heightmap-profiles-panel-row :profile="profile" :name="String(name)" />
            </template>
        </v-card-text>
        <v-card-text v-else>
            <p class="mb-0">{{ t('Heightmap.NoProfile') }}</p>
        </v-card-text>
    </panel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiStackOverflow } from '@mdi/js'
import Panel from '@/components/ui/Panel.vue'
import HeightmapProfilesPanelRow from '@/components/panels/Heightmap/HeightmapProfilesPanelRow.vue'
import { usePrinterStore } from '@/store/printer'

const { t } = useI18n()
const printerStore = usePrinterStore()

const profiles = computed(() => printerStore.bed_mesh?.profiles ?? {})
</script>
