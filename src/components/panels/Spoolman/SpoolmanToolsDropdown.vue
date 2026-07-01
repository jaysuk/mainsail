<template>
    <v-menu location="bottom end" :close-on-content-click="false">
        <template #activator="{ props: activatorProps }">
            <v-btn icon tile v-bind="activatorProps">
                <v-icon>{{ mdiSwapVertical }}</v-icon>
            </v-btn>
        </template>
        <v-list density="compact">
            <v-list-item>
                <v-btn size="small" @click="showChangeSpoolDialog = true">
                    <v-icon start>{{ mdiSwapVertical }}</v-icon>
                    {{ t('Panels.SpoolmanPanel.ActiveSpool') }}
                </v-btn>
            </v-list-item>
            <spoolman-tools-dropdown-item v-for="tool in tools" :key="tool" :object-name="tool" />
        </v-list>
        <spoolman-change-spool-dialog v-model="showChangeSpoolDialog" />
    </v-menu>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiSwapVertical } from '@mdi/js'
import SpoolmanToolsDropdownItem from '@/components/panels/Spoolman/SpoolmanToolsDropdownItem.vue'
import SpoolmanChangeSpoolDialog from '@/components/dialogs/SpoolmanChangeSpoolDialog.vue'

withDefaults(
    defineProps<{
        tools?: string[]
    }>(),
    { tools: () => [] }
)

const { t } = useI18n()

const showChangeSpoolDialog = ref(false)
</script>
