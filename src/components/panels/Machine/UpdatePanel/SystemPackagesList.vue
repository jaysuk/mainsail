<template>
    <v-dialog v-model="showDialog" persistent max-width="800">
        <panel :title="t('Machine.UpdatePanel.UpgradeableSystemPackages')" :icon="mdiPackageVariantClosed" :margin-bottom="false" card-class="machine-update-system-packages-list-dialog">
            <template #buttons>
                <v-btn icon tile @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>
                <v-row>
                    <v-col>
                        <p>{{ t('Machine.UpdatePanel.ThesePackagesCanBeUpgrade') }}</p>
                        <p class="system-packages-list">{{ packagesList.join(', ') }}</p>
                    </v-col>
                </v-row>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" color="primary" @click="closeDialog">{{ t('Buttons.Close') }}</v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { mdiCloseThick, mdiPackageVariantClosed } from '@mdi/js'
import Panel from '@/components/ui/Panel.vue'

defineProps<{ packagesList: string[] }>()

const { t } = useI18n()

const showDialog = defineModel<boolean>({ required: true })

function closeDialog() {
    showDialog.value = false
}
</script>

<style scoped>
.system-packages-list {
    font-family: monospace;
    margin-bottom: 0 !important;
}
</style>
