<template>
    <div style="height: 100%">
        <v-menu v-if="presets.length" location="bottom start">
            <template #activator="{ props: activatorProps }">
                <v-btn variant="text" tile color="primary" v-bind="activatorProps" :disabled="['printing', 'paused'].includes(printer_state)" class="pa-1">
                    <span class="d-none ml-1 d-md-block">{{ t('Panels.TemperaturePanel.Presets') }}</span>
                    <v-icon class="d-md-none">{{ mdiFire }}</v-icon>
                    <v-icon>{{ mdiMenuDown }}</v-icon>
                </v-btn>
            </template>
            <v-list density="compact" class="py-0">
                <v-list-item v-for="(preset, index) of presets" :key="index" link @click="preheat(preset)">
                    <div class="d-flex align-center _preset-title">
                        <v-icon size="small" class="mr-1">{{ mdiFire }}</v-icon>
                        <span style="padding-top: 2px">{{ preset.name }}</span>
                    </div>
                </v-list-item>
            </v-list>
            <v-divider class="_fix_transparency" />
            <v-list density="compact" class="py-0">
                <v-list-item link @click="btnCoolDown">
                    <div class="d-flex align-center _preset-title">
                        <v-icon size="small" color="primary" class="mr-1">{{ mdiSnowflake }}</v-icon>
                        <span class="text-primary">{{ t('Panels.TemperaturePanel.Cooldown') }}</span>
                    </div>
                </v-list-item>
            </v-list>
        </v-menu>
        <v-btn v-else :icon="smAndDown" :variant="mdAndUp ? 'text' : undefined" tile color="primary" @click="btnCoolDown">
            <v-icon size="small">{{ mdiSnowflake }}</v-icon>
            <span class="d-none ml-1 d-md-inline">{{ t('Panels.TemperaturePanel.Cooldown') }}</span>
        </v-btn>
        <confirmation-dialog
            v-model="showCoolDownDialog"
            :icon="mdiSnowflake"
            :title="t('CoolDownDialog.CoolDown')"
            :text="t('CoolDownDialog.AreYouSure')"
            :action-button-text="t('Buttons.Yes')"
            :action-button-color="'primary'"
            :cancel-button-text="t('Buttons.No')"
            @action="cooldown" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import type { GuiPresetsStatePreset } from '@/store/gui/presets/types'
import { mdiFire, mdiMenuDown, mdiSnowflake } from '@mdi/js'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue'
import { useBase } from '@/composables/useBase'
import { useGuiStore } from '@/store/gui'
import { useGuiPresetsStore } from '@/store/gui/presets'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { printer_state } = useBase()
const display = useDisplay()
const guiStore = useGuiStore()
const guiPresetsStore = useGuiPresetsStore()

const smAndDown = computed(() => display.smAndDown.value)
const mdAndUp = computed(() => display.mdAndUp.value)

const showCoolDownDialog = ref(false)

const presets = computed<GuiPresetsStatePreset[]>(() => guiPresetsStore.getPresets ?? [])

const cooldownGcode = computed<string>(() => guiPresetsStore.getCooldownGcode)

const confirmOnCoolDown = computed<boolean>(() => guiStore.uiSettings.confirmOnCoolDown)

function preheat(preset: GuiPresetsStatePreset): void {
    for (const [name, attributes] of Object.entries(preset.values)) {
        if (attributes.bool) {
            const splits = name.split(' ')
            const printerObject = splits[0]
            const printerObjectName = splits[1] ?? splits[0]

            // set default heater command
            let command = 'SET_HEATER_TEMPERATURE'
            let commandAttribute = 'HEATER'

            // override command for temperature_fan
            if (printerObject === 'temperature_fan') {
                command = 'SET_TEMPERATURE_FAN_TARGET'
                commandAttribute = 'TEMPERATURE_FAN'
            }

            // build gcode
            const gcode = `${command} ${commandAttribute}=${printerObjectName} TARGET=${attributes.value}`

            useServerStore().addEvent({ message: gcode, type: 'command' })
            webSocketClient.emit('printer.gcode.script', { script: gcode })
        }
    }

    if (preset.gcode !== '') {
        setTimeout(() => {
            useServerStore().addEvent({ message: preset.gcode, type: 'command' })
            webSocketClient.emit('printer.gcode.script', { script: preset.gcode })
        }, 100)
    }
}

function btnCoolDown(): void {
    if (confirmOnCoolDown.value) {
        showCoolDownDialog.value = true
        return
    }

    cooldown()
}

function cooldown(): void {
    useServerStore().addEvent({ message: cooldownGcode.value, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: cooldownGcode.value })
}
</script>

<style scoped>
._preset-title {
    font-size: 0.8125rem;
    font-weight: 500;
}

/*
workaround for fixing a transparency issue
which is assumingly a vuetify bug
*/
._fix_transparency {
    background-color: #1e1e1e;
}
</style>
