<template>
    <v-dialog v-model="showDialog" persistent :max-width="400" @keydown.esc="closeDialog">
        <panel :title="t('Heightmap.BedMeshCalibrate')" :icon="mdiGrid" card-class="heightmap-calibrate-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>
                <v-text-field
                    ref="input"
                    v-model="name"
                    :label="t('Heightmap.Name')"
                    required
                    :rules="rules"
                    @update:error="
                        (newVal: boolean) => {
                            isInvalidName = newVal
                        }
                    "
                    @keyup.enter="calibrateMesh" />
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="closeDialog">{{ t('Buttons.Cancel') }}</v-btn>
                <v-btn :disabled="isInvalidName" color="primary" variant="text" @click="calibrateMesh">
                    {{ t('Heightmap.Calibrate') }}
                </v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FocusableRef } from '@/types/vuetify'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick, mdiGrid } from '@mdi/js'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()

const input = ref<FocusableRef | null>(null)

const isInvalidName = ref(false)
const name = ref('')

const rules = [
    (value: string) => !!value || t('Heightmap.InvalidNameEmpty'),

    // eslint-disable-next-line no-control-regex
    (value: string) => value === value.replace(/[^\x00-\x7F]/g, '') || t('Heightmap.InvalidNameAscii'),
]

function calibrateMesh(): void {
    const gcode = `BED_MESH_CALIBRATE PROFILE="${name.value}"`

    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode }, { loading: 'bedMeshCalibrate' })

    closeDialog()
}

function closeDialog() {
    showDialog.value = false
}

watch(showDialog, (newVal) => {
    if (!newVal) return

    name.value = 'default'
    setTimeout(() => {
        input.value?.focus()
    })
})
</script>
