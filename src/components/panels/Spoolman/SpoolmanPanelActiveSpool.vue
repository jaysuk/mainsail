<template>
    <v-list-item lines="three" :class="listItemContentClass">
        <template #title>
            <div :class="overlineClass">#{{ id }} | {{ vendor }}</div>
            <div :class="listItemTitleClass">
                <span class="cursor-pointer" @click="clickSpool">{{ name }}</span>
            </div>
        </template>
        <template #subtitle>
            {{ subtitle }}
        </template>
        <template #append>
            <v-avatar tile :size="avatarSize">
                <spool-icon :color="color" :multi-color-hexes="multi_color_hexes" :multi-color-direction="multi_color_direction" @click-spool="clickSpool" />
            </v-avatar>
        </template>
    </v-list-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SpoolIcon from '@/components/ui/SpoolIcon.vue'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import { useServerSpoolmanStore } from '@/store/server/spoolman'

const props = withDefaults(
    defineProps<{
        small?: boolean
    }>(),
    { small: false }
)

const emit = defineEmits<{ 'change-spool': [] }>()

const serverSpoolmanStore = useServerSpoolmanStore()

const listItemContentClass = computed(() => (props.small ? 'my-0' : ''))

const overlineClass = computed(() => {
    const classes = ['text-overline', 'mb-1']
    if (props.small) classes.push('line-height-auto')

    return classes
})

const listItemTitleClass = computed(() => (props.small ? ['text-h6', 'mb-1'] : ['text-h5', 'mb-1']))

const avatarSize = computed(() => (props.small ? 60 : 80))

const active_spool = computed<ServerSpoolmanStateSpool | null>(() => serverSpoolmanStore.active_spool ?? null)

const color = computed(() => {
    const color = active_spool.value?.filament.color_hex ?? null
    if (color === null) return '#000'

    return `#${color}`
})

const multi_color_hexes = computed(() => active_spool.value?.filament?.multi_color_hexes)
const multi_color_direction = computed(() => active_spool.value?.filament?.multi_color_direction)
const id = computed(() => active_spool.value?.id ?? 'XX')
const vendor = computed(() => active_spool.value?.filament?.vendor?.name ?? 'Unknown')
const name = computed(() => active_spool.value?.filament.name ?? 'Unknown')

const materialOutput = computed(() => {
    const material = active_spool.value?.filament.material ?? null
    if (material === null) return null

    return material
})

const weightOutput = computed(() => {
    let remaining = active_spool.value?.remaining_weight ?? null
    const total = active_spool.value?.filament.weight ?? null

    if (remaining === null || total === null) return null
    remaining = Math.round(remaining)
    let totalRound = Math.floor(total / 1000)

    if (total >= 1000) {
        if (totalRound !== total / 1000) {
            totalRound = Math.round(total / 100) / 10
        }

        return `${remaining}g / ${totalRound}kg`
    }

    return `${remaining} / ${total}g`
})

const lengthOutput = computed(() => {
    let remaining = active_spool.value?.remaining_length ?? null

    if (remaining === null) return null
    remaining = Math.round(remaining / 1000)

    return `${remaining}m`
})

const subtitle = computed(() => [materialOutput.value, weightOutput.value, lengthOutput.value].filter((v) => v !== null).join(' | '))

function clickSpool() {
    emit('change-spool')
}
</script>

<style scoped>
.line-height-auto {
    line-height: 1;
}
</style>
