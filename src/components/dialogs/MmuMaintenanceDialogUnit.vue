<template>
    <div v-if="isRotaryOrServoSelector || isLinearSelector">
        <h3 class="text-h5 mb-3 mt-5">{{ name }}</h3>

        <settings-row v-if="isRotaryOrServoSelector" :title="t('Panels.MmuPanel.MmuMaintenanceDialog.Selector')" dense dynamic-slot-width>
            <v-btn size="small" :disabled="!canSend" color="secondary" @click="doSend('MMU_HOME')">
                <v-icon start>{{ mdiHomeOutline }}</v-icon>
                {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Home') }}
            </v-btn>
            <v-btn size="small" :disabled="!canSend || mmuGrip === 'Gripped'" color="secondary" class="ml-2" @click="doSend('MMU_GRIP')">
                <v-icon start>{{ mdiArrowCollapseHorizontal }}</v-icon>
                {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Grip') }}
            </v-btn>
            <v-btn size="small" :disabled="!canSend || mmuGrip === 'Released'" color="secondary" class="ml-2" @click="doSend('MMU_RELEASE')">
                <v-icon start>{{ mdiArrowExpandHorizontal }}</v-icon>
                {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Release') }}
            </v-btn>
        </settings-row>

        <settings-row v-else-if="isLinearSelector" :title="t('Panels.MmuPanel.MmuMaintenanceDialog.Selector')" dense dynamic-slot-width>
            <v-btn size="small" :disabled="!canSend" class="ml-2" color="secondary" @click="doSend('MMU_HOME')">
                <v-icon start>{{ mdiHomeOutline }}</v-icon>
                {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Home') }}
            </v-btn>
            <v-btn size="small" :disabled="!canSend || mmuServo === 'Up'" color="secondary" class="ml-2" @click="doSend('MMU_SERVO POS=up')">
                <v-icon start>{{ mdiArrowUpThin }}</v-icon>
                {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Up') }}
            </v-btn>
            <v-btn size="small" :disabled="!canSend || mmuServo === 'Down'" color="secondary" class="ml-2" @click="doSend('MMU_SERVO POS=down')">
                <v-icon start>{{ mdiArrowDownThin }}</v-icon>
                {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Down') }}
            </v-btn>
            <v-btn size="small" :disabled="!canSend || mmuServo === 'Move'" color="secondary" class="ml-2" @click="doSend('MMU_SERVO POS=move')">
                <v-icon start>{{ mdiArrowLeftRight }}</v-icon>
                {{ t('Panels.MmuPanel.MmuMaintenanceDialog.Move') }}
            </v-btn>
        </settings-row>

        <v-divider class="my-6" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { mdiHomeOutline, mdiArrowDownThin, mdiArrowUpThin, mdiArrowLeftRight, mdiArrowCollapseHorizontal, mdiArrowExpandHorizontal } from '@mdi/js'
import { useMmu } from '@/composables/useMmu'

const props = defineProps<{
    unitIndex: number
}>()

const { t } = useI18n()
const { canSend, mmuGrip, mmuServo, doSend, getMmuMachineUnit } = useMmu()

const unit = computed(() => getMmuMachineUnit(props.unitIndex))

const name = computed(() => {
    const name = unit.value?.name ?? 'Unit'

    return `MMU #${props.unitIndex + 1} - ${name}`
})

const selectorType = computed(() => unit.value?.selector_type ?? 'VirtualSelector')

const isRotaryOrServoSelector = computed(() => ['RotarySelector', 'ServoSelector'].includes(selectorType.value))

const isLinearSelector = computed(() => selectorType.value === 'LinearSelector')
</script>
