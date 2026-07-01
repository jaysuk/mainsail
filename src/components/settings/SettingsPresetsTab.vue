<template>
    <div>
        <presets-form v-if="boolForm" :preset="formPreset" @close="boolForm = false" />
        <presets-form-cooldown v-else-if="boolFormCooldown" :input-gcode="cooldownGcode" @close="boolFormCooldown = false" />
        <v-card v-else flat>
            <v-card-text>
                <h3 class="text-h5 mb-3">{{ t('Settings.PresetsTab.PreheatPresets') }}</h3>
                <div v-for="(preset, key) in presets" :key="preset.id ?? key">
                    <v-divider v-if="key" class="my-2" />
                    <presets-entry :preset="preset" @edit="edit" />
                </div>
                <v-divider v-if="presets.length" class="my-2" />
                <presets-entry-cooldown @edit="boolFormCooldown = true" />
            </v-card-text>
            <v-card-actions class="d-flex justify-end">
                <v-btn variant="text" color="primary" @click="createPreset">{{ t('Settings.PresetsTab.AddPreset') }}</v-btn>
            </v-card-actions>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GuiPresetsStatePreset } from '@/store/gui/presets/types'
import PresetsEntry from '@/components/settings/Presets/PresetsEntry.vue'
import PresetsEntryCooldown from '@/components/settings/Presets/PresetsEntryCooldown.vue'
import PresetsForm from '@/components/settings/Presets/PresetsForm.vue'
import PresetsFormCooldown from '@/components/settings/Presets/PresetsFormCooldown.vue'
import { useGuiPresetsStore } from '@/store/gui/presets'

const { t } = useI18n()
const guiPresetsStore = useGuiPresetsStore()

const boolForm = ref(false)
const boolFormCooldown = ref(false)

const formPreset = ref<GuiPresetsStatePreset>({} as GuiPresetsStatePreset)

const presets = computed(() => guiPresetsStore.getPresets ?? [])
const cooldownGcode = computed(() => guiPresetsStore.getCooldownGcode)

function createPreset() {
    formPreset.value = {
        id: null,
        name: '',
        values: {},
        gcode: '',
    }

    boolForm.value = true
}

function edit(preset: GuiPresetsStatePreset) {
    formPreset.value = { ...preset }
    boolForm.value = true
}
</script>
