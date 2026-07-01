<template>
    <div>
        <settings-row :title="t('Panels.MmuPanel.MmuMaintenanceDialog.MotorSync')" dense>
            <v-row dense>
                <v-col class="col-6">
                    <v-btn block size="small" :disabled="!canSend || mmuSyncDrive" color="secondary" @click="doSend('MMU_SYNC_GEAR_MOTOR SYNC=1')">
                        <v-icon start>{{ mdiSync }}</v-icon>
                        {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Sync') }}
                    </v-btn>
                </v-col>
                <v-col class="col-6">
                    <v-btn block size="small" :disabled="!canSend || !mmuSyncDrive" color="secondary" @click="doSend('MMU_SYNC_GEAR_MOTOR SYNC=0')">
                        <v-icon start>{{ mdiSyncOff }}</v-icon>
                        {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Unsync') }}
                    </v-btn>
                </v-col>
            </v-row>
        </settings-row>
        <settings-row :title="t('Panels.MmuPanel.MmuMaintenanceDialog.ExtruderOnly')" dense>
            <v-row dense>
                <v-col class="col-6">
                    <v-btn block size="small" :disabled="!canSend" color="secondary" @click="doSend('MMU_LOAD EXTRUDER_ONLY=1')">
                        <v-icon start>{{ mdiDownloadOutline }}</v-icon>
                        {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Load') }}
                    </v-btn>
                </v-col>
                <v-col class="col-6">
                    <v-btn block size="small" :disabled="!canSend" color="secondary" @click="doSend('MMU_UNLOAD EXTRUDER_ONLY=1')">
                        <v-icon start>{{ mdiUploadOutline }}</v-icon>
                        {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Unload') }}
                    </v-btn>
                </v-col>
            </v-row>
        </settings-row>
        <settings-row :title="t('Panels.MmuPanel.MmuMaintenanceDialog.MmuMotors')" dense>
            <v-row dense>
                <v-col class="col-6">
                    <v-btn block size="small" :disabled="!canSend" color="secondary" @click="doSend('MMU_MOTORS_ON')">
                        <v-icon start>{{ mdiEngineOutline }}</v-icon>
                        {{ t('Panels.MmuPanel.MmuMaintenanceDialog.On') }}
                    </v-btn>
                </v-col>
                <v-col class="col-6">
                    <v-btn block size="small" :disabled="!canSend" color="secondary" @click="doSend('MMU_MOTORS_OFF')">
                        <v-icon start>{{ mdiEngineOffOutline }}</v-icon>
                        {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Off') }}
                    </v-btn>
                </v-col>
            </v-row>
        </settings-row>

        <v-divider class="my-6" />
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { useMmu } from '@/composables/useMmu'
import { mdiSync, mdiSyncOff, mdiDownloadOutline, mdiUploadOutline, mdiEngineOutline, mdiEngineOffOutline } from '@mdi/js'

const { t } = useI18n()
const { canSend, mmuSyncDrive, doSend } = useMmu()
</script>
