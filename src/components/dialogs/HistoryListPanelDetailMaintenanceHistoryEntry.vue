<template>
    <div>
        <v-timeline-item class="pb-2" size="small" hide-dot>
            <div>
                <span v-if="restFilamentText" :class="restFilamentClass">
                    <v-icon size="small">{{ mdiAdjust }}</v-icon>
                    {{ restFilamentText }}
                </span>
                <span v-if="restPrinttimeText" :class="restPrinttimeClass">
                    <v-icon size="small">{{ mdiAlarm }}</v-icon>
                    {{ restPrinttimeText }}
                </span>
                <span v-if="restDaysText" :class="restDaysClass">
                    <v-icon size="small">{{ mdiCalendar }}</v-icon>
                    {{ restDaysText }}
                </span>
            </div>
            <p v-if="note" class="mt-2 mb-0" v-html="note" />
        </v-timeline-item>
        <v-timeline-item :class="classDateItem" size="small">
            <strong>{{ dateText }}</strong>
        </v-timeline-item>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiAdjust, mdiAlarm, mdiCalendar, mdiCloseThick } from '@mdi/js'
import type { GuiMaintenanceStateEntry } from '@/store/gui/maintenance/types'
import { useBase } from '@/composables/useBase'
import { useServerHistoryStore } from '@/store/server/history'

const props = withDefaults(
    defineProps<{
        item: GuiMaintenanceStateEntry
        current?: boolean
        last?: boolean
    }>(),
    {
        current: false,
        last: false,
    }
)

const { t } = useI18n()
const { formatDateTime } = useBase()
const historyStore = useServerHistoryStore()

const date = computed(() => formatDateTime(props.item.start_time * 1000, false))

const dateText = computed(() => {
    if (props.last) return t('History.EntryCreatedAt', { date: date.value })

    return t('History.EntryPerformedAt', { date: date.value })
})

const showGoals = computed(() => {
    if (props.item.reminder.type === null) return false

    return props.current && props.item.end_time === null
})

const restFilament = computed(() => {
    const start = props.item?.start_filament ?? 0
    const end = props.item.end_filament ?? 0
    const current = historyStore.job_totals?.total_filament_used ?? 0

    let used = current - start
    if (end) used = end - start

    used /= 1000

    return used
})

const restFilamentText = computed(() => {
    const value = props.item.reminder.filament?.value ?? 0
    if (!showGoals.value) return `${restFilament.value.toFixed(0)} m`

    if (!props.item.reminder.filament.bool) return false

    return `${restFilament.value.toFixed(0)} / ${value} m`
})

const restFilamentClass = computed(() => {
    const output = ['mr-3']
    if (!showGoals.value || !props.item.reminder.filament.bool) return output

    const value = props.item.reminder.filament?.value ?? 0
    if (restFilament.value > value) return [...output, 'text-error', 'font-weight-bold']

    return output
})

const restPrinttime = computed(() => {
    const start = props.item.start_printtime ?? 0
    const end = props.item.end_printtime ?? 0
    const current = historyStore.job_totals?.total_print_time ?? 0

    let used = current - start
    if (end) used = end - start

    used /= 3600

    return used
})

const restPrinttimeText = computed(() => {
    const value = props.item.reminder.printtime?.value ?? 0
    if (!showGoals.value) return `${restPrinttime.value.toFixed(1)} h`

    if (!props.item.reminder.printtime.bool) return false

    return `${restPrinttime.value.toFixed(1)} / ${value} h`
})

const restPrinttimeClass = computed(() => {
    const output = ['mr-3']
    if (!showGoals.value || !props.item.reminder.printtime.bool) return output

    const value = props.item.reminder.printtime?.value ?? 0
    if (restPrinttime.value > value) return [...output, 'text-error', 'font-weight-bold']

    return output
})

const restDays = computed(() => {
    const start = props.item.start_time ?? 0
    const end = props.item.end_time ?? 0
    const current = new Date().getTime() / 1000

    let used = current - start
    if (end) used = end - start

    return used / (60 * 60 * 24)
})

const restDaysText = computed(() => {
    const value = props.item.reminder.date?.value ?? 0

    if (!showGoals.value) return `${restDays.value.toFixed(0)} days`

    if (!props.item.reminder.date.bool) return false

    return `${restDays.value.toFixed(0)} / ${value} days`
})

const restDaysClass = computed(() => {
    const output = ['mr-3']
    if (!showGoals.value || !props.item.reminder.date.bool) return output

    const value = props.item.reminder.date?.value ?? 0
    if (restDays.value > value) return [...output, 'text-error', 'font-weight-bold']

    return output
})

const classDateItem = computed(() => ({
    'pb-2': !props.last,
    'pb-5': props.last,
}))

const note = computed(() => props.item.perform_note?.replaceAll('\n', '<br>'))
</script>
