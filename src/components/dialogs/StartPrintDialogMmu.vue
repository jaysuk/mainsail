<template>
    <v-card-text>
        <p class="body-2">{{ summary }}</p>
        <div class="text-center">
            <v-btn color="primary" @click="showEditTtgMapDialog = true">
                <v-icon start>{{ mdiStateMachine }}</v-icon>
                {{ t('Panels.MmuPanel.EditTtgMap') }}
            </v-btn>
        </div>
        <mmu-edit-ttg-map-dialog v-model="showEditTtgMapDialog" :file="file" />
    </v-card-text>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu, TOOL_GATE_BYPASS } from '@/composables/useMmu'
import type { FileStateGcodefile } from '@/store/files/types'
import { mdiStateMachine } from '@mdi/js'
import MmuEditTtgMapDialog from '@/components/dialogs/MmuEditTtgMapDialog.vue'

const props = defineProps<{
    file: FileStateGcodefile
}>()

const { t } = useI18n()
const { mmuGate } = useMmu()

const showEditTtgMapDialog = ref(false)

const summary = computed(() => {
    const referencedTools = props.file.referenced_tools ?? ''
    const numTools = referencedTools.length

    if (numTools <= 1 && mmuGate.value !== TOOL_GATE_BYPASS) {
        return t('Panels.MmuPanel.StartPrintDialogMmu.SingleColor')
    }

    return t('Panels.MmuPanel.StartPrintDialogMmu.MultiColor', { numTools: numTools })
})
</script>
