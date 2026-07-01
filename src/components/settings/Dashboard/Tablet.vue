<template>
    <v-card variant="flat">
        <v-card-text>
            <v-row>
                <v-col class="col-12 col-md-6">
                    <settings-dashboard-sortable viewport-name="tablet" :column="1" />
                </v-col>
                <v-col class="col-12 col-md-6">
                    <settings-dashboard-sortable viewport-name="tablet" :column="2" />
                </v-col>
            </v-row>
            <v-row>
                <v-col class="text-center">
                    <v-btn color="error" @click="resetLayout">{{ t('Settings.DashboardTab.ResetLayout') }}</v-btn>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SettingsDashboardSortable from '@/components/settings/Dashboard/Sortable.vue'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const guiStore = useGuiStore()

function resetLayout() {
    guiStore.resetLayout('tabletLayout1')
    guiStore.resetLayout('tabletLayout2')
}
</script>
