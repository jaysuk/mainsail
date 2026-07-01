<template>
    <v-list-item>
        <v-btn size="small" @click="showChangeSpoolDialog = true">
            <span v-if="color != null" class="_extruderColorState mr-2" :style="dotStyle" />
            {{ name }}
            <span v-if="spoolId === null" class="font-italic ml-1">({{ t('Panels.SpoolmanPanel.NoSpool') }})</span>
            <span v-else class="ml-1">({{ spool?.filament?.name ?? '--' }})</span>
        </v-btn>
        <spoolman-change-spool-dialog v-model="showChangeSpoolDialog" :tool="name" />
    </v-list-item>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import SpoolmanChangeSpoolDialog from '@/components/dialogs/SpoolmanChangeSpoolDialog.vue'
import { usePrinterStore } from '@/store/printer'
import { useServerSpoolmanStore } from '@/store/server/spoolman'

const props = withDefaults(
    defineProps<{
        objectName?: string
    }>(),
    { objectName: '' }
)

const { t } = useI18n()
const printerStore = usePrinterStore()
const serverSpoolmanStore = useServerSpoolmanStore()

const showChangeSpoolDialog = ref(false)

const name = computed(() => (props.objectName.split(' ')[1] ?? 'Unknown').toUpperCase())

const color = computed(() => spool.value?.filament?.color_hex ?? '000000')

const dotStyle = computed(() => ({
    'background-color': '#' + color.value,
}))

const spoolId = computed(() => {
    const object = (printerStore as unknown as Record<string, { spool_id?: number }>)[props.objectName] ?? {}

    return object.spool_id ?? null
})

const spools = computed<ServerSpoolmanStateSpool[]>(() => serverSpoolmanStore.spools ?? [])

const spool = computed(() => spools.value.find((spool) => spool.id === spoolId.value) ?? null)
</script>

<style scoped>
._extruderColorState {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid lightgray;
}
</style>
