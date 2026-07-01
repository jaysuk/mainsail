<template>
    <div>
        <v-row>
            <template v-if="klipperReadyForGui">
                <v-col class="col-12 col-md-8 pb-0">
                    <heightmap-chart-panel />
                </v-col>
                <v-col class="col-12 col-md-4">
                    <heightmap-current-profile-panel />
                    <heightmap-profiles-panel />
                </v-col>
            </template>
            <template v-else>
                <v-col>
                    <v-alert density="compact" variant="text" type="warning" elevation="2" class="mx-auto mt-6" max-width="500" :icon="mdiLockOutline">
                        {{ t('Heightmap.ErrorKlipperNotReady') }}
                    </v-alert>
                </v-col>
            </template>
        </v-row>
    </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { mdiLockOutline } from '@mdi/js'
import HeightmapChartPanel from '@/components/panels/Heightmap/HeightmapChartPanel.vue'
import HeightmapCurrentProfilePanel from '@/components/panels/Heightmap/HeightmapCurrentProfilePanel.vue'
import HeightmapProfilesPanel from '@/components/panels/Heightmap/HeightmapProfilesPanel.vue'
import { useBase } from '@/composables/useBase'

const { t } = useI18n()
const { klipperReadyForGui } = useBase()
</script>
