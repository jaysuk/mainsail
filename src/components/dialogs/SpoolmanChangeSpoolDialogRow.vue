<template>
    <tr class="cursor-pointer" @click="setSpoolRow">
        <td style="width: 50px" class="pr-0 py-2">
            <spool-icon :color="color" :multi-color-hexes="multi_color_hexes" :multi-color-direction="multi_color_direction" style="width: 50px; float: left" class="mr-3" />
        </td>

        <td class="py-2" style="min-width: 300px">
            <v-list-item lines="two">
                <div class="text-disabled mb-1">#{{ id }} | {{ vendor }}</div>
                <v-list-item-title class="mb-1">
                    <span class="text--filament">{{ name }}</span>
                    <template v-if="location">
                        <br />
                        <small>{{ t('Panels.SpoolmanPanel.Location') }}: {{ location }}</small>
                    </template>
                    <template v-if="spool.comment">
                        <br />
                        <small class="comment">{{ spool.comment }}</small>
                    </template>
                    <template v-if="spoolLoaded">
                        <br />
                        <v-chip color="primary" size="small" class="mt-2">
                            {{ t('Panels.AfcPanel.LoadedInLane', { lane: spoolLoaded.lane.toUpperCase() }) }}
                        </v-chip>
                    </template>
                </v-list-item-title>
            </v-list-item>
        </td>
        <td class="text-center text-no-wrap">{{ material }}</td>
        <td class="text-right text-no-wrap">{{ last_used }}</td>
        <td class="text-right text-no-wrap">
            <strong>{{ remaining_weight_format }}</strong>
            <small class="ml-1">/ {{ total_weight_format }}</small>
        </td>
    </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import SpoolIcon from '@/components/ui/SpoolIcon.vue'
import { useAfc } from '@/composables/useAfc'

const props = defineProps<{
    spool: ServerSpoolmanStateSpool
    max_id_digits?: number
}>()

const emit = defineEmits<{
    'set-spool': [spool: ServerSpoolmanStateSpool]
}>()

const { t } = useI18n()
const { afcLoadedSpools } = useAfc()

const color = computed(() => {
    const color = props.spool.filament?.color_hex ?? '000'

    return `#${color}`
})

const multi_color_hexes = computed(() => props.spool.filament?.multi_color_hexes)

const multi_color_direction = computed(() => props.spool.filament?.multi_color_direction)

const id = computed(() => {
    // add leading zeros depending on max_id digit count
    let id: string = props.spool.id.toString()

    while (id.length < (props.max_id_digits ?? 0)) {
        id = '0' + id
    }

    return id
})

const vendor = computed(() => props.spool.filament?.vendor?.name ?? 'Unknown')

const name = computed(() => props.spool.filament?.name ?? 'Unknown')

const location = computed(() => props.spool.location)

const material = computed(() => props.spool.filament?.material ?? '--')

const remaining_weight = computed(() => props.spool.remaining_weight ?? 0)

const total_weight = computed(() => props.spool.filament?.weight ?? 0)

const remaining_weight_format = computed(() => `${remaining_weight.value.toFixed(0)}g`)

const total_weight_format = computed(() => {
    if (total_weight.value < 1000) {
        return `${total_weight.value.toFixed(0)}g`
    }

    let totalRound = Math.round(total_weight.value / 1000)
    if (totalRound !== total_weight.value / 1000) {
        totalRound = Math.round(total_weight.value / 100) / 10
    }

    return `${totalRound}kg`
})

const last_used = computed(() => {
    const last_used = props.spool.last_used ?? null
    if (!last_used) return t('Panels.SpoolmanPanel.Never')

    const date = new Date(props.spool.last_used)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff <= 1000 * 60 * 60 * 24) return t('Panels.SpoolmanPanel.Today')
    if (diff <= 1000 * 60 * 60 * 24 * 2) return t('Panels.SpoolmanPanel.Yesterday')
    if (diff <= 1000 * 60 * 60 * 24 * 14) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))

        return t('Panels.SpoolmanPanel.DaysAgo', { days })
    }

    return date.toLocaleDateString()
})

const spoolLoaded = computed(() => {
    const spools = afcLoadedSpools.value ?? []
    if (!spools.length) return false

    return spools.find((s) => s.spoolId === props.spool.id)
})

function setSpoolRow() {
    emit('set-spool', props.spool)
}
</script>
<style scoped>
.text--filament {
    font-size: 1.1rem;
}

.comment {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}
</style>
