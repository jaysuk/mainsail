<template>
    <div>
        <v-row class="my-3">
            <v-col class="pl-6 pr-0 pt-0 pb-0 d-flex flex-column">
                <v-tooltip location="top">
                    <template #activator="{ props: activatorProps }">
                        <span class="d-flex align-center justify-center" v-bind="activatorProps">
                            <afc-filament-reel :percent="spoolPercent" :color="spoolColor" class="filamentSpool cursor-pointer" @click-spool="onFilamentClick" />
                        </span>
                    </template>
                    <span>
                        <div class="font-weight-bold">{{ spoolFilamentHeadline }}</div>
                        <div>{{ spoolFilamentName }}</div>
                        <div v-if="spoolMaterial">{{ spoolMaterialDetails }}</div>
                        <div v-if="spoolWeightsOutput !== undefined">{{ spoolWeightsOutput }}</div>
                    </span>
                </v-tooltip>
                <spoolman-change-spool-dialog v-if="afcExistsSpoolman" v-model="showSpoolmanDialog" :afc-lane="name" />
                <afc-unit-lane-filament-dialog v-model="showFilamentDialog" :name="name" />
            </v-col>
            <v-col class="pr-6 pl-2 pt-0 pb-0 d-flex flex-column justify-space-between align-end">
                <v-btn v-if="afcShowLaneInfinite" size="x-small" @click="showInfintiyDialog = true">
                    <v-icon v-if="runoutLane === 'NONE'" color="error" size="small">{{ afcIconInfintiy }}</v-icon>
                    <template v-else>{{ runoutLane }}</template>
                </v-btn>
                <afc-unit-lane-infinite-dialog v-model="showInfintiyDialog" :name="name" />
                <span class="font-weight-bold">{{ spoolMaterialOutput }}</span>
                <span class="text-disabled">{{ spoolRemainingWeightOutput }}</span>
                <v-tooltip v-if="hasTd" location="top">
                    <template #activator="{ props: activatorProps }">
                        <span class="d-flex align-center justify-center text-disabled" v-bind="activatorProps"> TD: {{ tdValue }} </span>
                    </template>
                    <span>{{ t('Panels.AfcPanel.Color') }}: #{{ tdColor }}</span>
                </v-tooltip>
            </v-col>
        </v-row>
        <v-row v-if="afcShowFilamentName" class="mb-0 mt-n3">
            <v-col class="px-6 pt-1">
                <div class="position-relative pb-4">
                    <a v-if="spoolUrl" :href="spoolUrl" target="_blank" rel="noopener noreferrer" class="position-absolute text-truncate text-truncate-element text-center text-decoration-none filament-link">
                        {{ spoolFilamentName }}
                    </a>
                    <span v-else class="position-absolute text-truncate text-truncate-element text-center">
                        {{ spoolFilamentName }}
                    </span>
                </div>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import { afcIconInfintiy } from '@/plugins/afcIcons'
import AfcFilamentReel from '@/components/panels/Afc/AfcFilamentReel.vue'
import AfcUnitLaneInfiniteDialog from '@/components/dialogs/AfcUnitLaneInfiniteDialog.vue'
import AfcUnitLaneFilamentDialog from '@/components/dialogs/AfcUnitLaneFilamentDialog.vue'
import SpoolmanChangeSpoolDialog from '@/components/dialogs/SpoolmanChangeSpoolDialog.vue'
import { useBase } from '@/composables/useBase'
import { useAfc } from '@/composables/useAfc'
import { useServerSpoolmanStore } from '@/store/server/spoolman'
import { useGuiStore } from '@/store/gui'

const props = defineProps<{
    name: string
}>()

const { t } = useI18n()
const { spoolManagerUrl } = useBase()
const { afcShowLaneInfinite, afcShowFilamentName, afcExistsSpoolman, getAfcLaneObject } = useAfc()
const spoolmanStore = useServerSpoolmanStore()
const guiStore = useGuiStore()

const showInfintiyDialog = ref(false)
const showSpoolmanDialog = ref(false)
const showFilamentDialog = ref(false)

const lane = computed(() => getAfcLaneObject(props.name) as Record<string, any>)

const runoutLane = computed(() => lane.value.runout_lane ?? 'NONE')

const spoolId = computed<number>(() => Number(lane.value.spool_id || '0'))

const spool = computed<ServerSpoolmanStateSpool | null>(() => {
    if (spoolId.value === 0) return null

    const spools = spoolmanStore.spools || []

    return spools.find((spool: ServerSpoolmanStateSpool) => spool.id === spoolId.value) || null
})

const spoolFilamentHeadline = computed<string>(() => {
    const array = [`#${spoolId.value}`]
    if (spoolFilamentVendor.value) array.push(spoolFilamentVendor.value)

    return array.join(' | ')
})

const showTd1Color = computed<boolean>(() => guiStore.view.afc?.showTd1Color ?? true)

const hasTd = computed(() => (lane.value?.td1_td || null) !== null)

const tdValue = computed(() => lane.value?.td1_td || '--')

const tdColor = computed(() => lane.value?.td1_color || '------')

const spoolColor = computed(() => {
    if (hasTd.value && showTd1Color.value) return `#${tdColor.value}`

    return lane.value.color || '#000000'
})

const spoolRemainingWeight = computed<number | undefined>(() => spool.value?.remaining_weight ?? lane.value.weight ?? undefined)

const spoolRemainingWeightOutput = computed<string>(() => {
    if (spoolRemainingWeight.value === undefined) return '--'

    return `${Math.round(spoolRemainingWeight.value)}g`
})

const spoolFullWeight = computed<number | undefined>(() => spool.value?.initial_weight ?? lane.value.initial_weight ?? undefined)

const spoolUsedWeight = computed<number | undefined>(() => spool.value?.used_weight)

const spoolWeightsOutput = computed<string | undefined>(() => {
    if (spoolRemainingWeight.value === undefined) return undefined

    const array = [t('Panels.AfcPanel.WeightRemaining', { weight: Math.round(spoolRemainingWeight.value ?? 0) })]

    if (spoolUsedWeight.value !== undefined) {
        array.push(t('Panels.AfcPanel.WeightUsed', { weight: Math.round(spoolUsedWeight.value ?? 0) }))
    }

    return array.join(' | ')
})

const spoolPercent = computed(() => {
    if (spoolRemainingWeight.value === undefined || spoolFullWeight.value === undefined) return 100
    if (spoolFullWeight.value === 0) return 100

    return Math.round((spoolRemainingWeight.value / spoolFullWeight.value) * 100)
})

const spoolMaterial = computed<string>(() => spool.value?.filament?.material ?? lane.value.material ?? '')

const spoolMaterialOutput = computed<string>(() => spoolMaterial.value || '--')

const spoolExtruderTemp = computed<number | undefined>(() => spool.value?.filament?.settings_extruder_temp)

const spoolBedTemp = computed<number | undefined>(() => spool.value?.filament?.settings_bed_temp)

const spoolMaterialDetails = computed<string>(() => {
    const array = [spoolMaterialOutput.value]
    if (spoolExtruderTemp.value !== undefined) array.push(`${spoolExtruderTemp.value}°C`)
    if (spoolBedTemp.value !== undefined) array.push(`${spoolBedTemp.value}°C`)

    return array.join(' | ')
})

const spoolFilamentVendor = computed<string | undefined>(() => spool.value?.filament?.vendor?.name)

const spoolFilamentName = computed<string>(() => spool.value?.filament?.name || lane.value.filament_name || 'Unknown')

const spoolUrl = computed<string | undefined>(() => {
    if (!spoolManagerUrl.value || !spoolId.value) return undefined

    return `${spoolManagerUrl.value.replace(/\/$/, '')}/spool/show/${spoolId.value}`
})

function onFilamentClick() {
    if (afcExistsSpoolman.value) {
        showSpoolmanDialog.value = true
        return
    }

    showFilamentDialog.value = true
}
</script>

<style scoped>
.filamentSpool {
    max-width: 38px;
}

.text-truncate-element {
    left: 0;
    right: 0;
}

.filament-link {
    color: inherit !important;
    cursor: pointer;
}

.filament-link:hover,
.filament-link:focus {
    text-decoration: underline !important;
}
</style>
