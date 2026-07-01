<template>
    <div class="d-flex flex-column flex-grow-1">
        <v-row class="mt-0 flex-grow-1">
            <v-col class="align-content-center text-center text-disabled px-6" :class="{ 'pb-6': !prep, 'pt-3': !prep }">
                {{ text }}
            </v-col>
        </v-row>
        <v-row v-if="prep" class="mt-0 flex-grow-0">
            <v-col class="px-6 pb-6">
                <v-tooltip location="top">
                    <template #activator="{ props: activatorProps }">
                        <v-btn density="compact" size="small" class="w-100 elevation-0" v-bind="activatorProps" @click="ejectLane">
                            <v-icon size="small">{{ mdiEject }}</v-icon>
                        </v-btn>
                    </template>
                    <span>{{ t('Panels.AfcPanel.EjectFilament') }}</span>
                </v-tooltip>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiEject } from '@mdi/js'
import { useAfc } from '@/composables/useAfc'
import { useControl } from '@/composables/useControl'

const props = defineProps<{
    name: string
}>()

const { t } = useI18n()
const { getAfcLaneObject } = useAfc()
const { doSend } = useControl()

const lane = computed(() => getAfcLaneObject(props.name) as Record<string, any>)

const prep = computed(() => lane.value?.prep ?? false)

const text = computed(() => {
    if (prep.value) return t('Panels.AfcPanel.PrepDetected')

    return t('Panels.AfcPanel.Empty')
})

function ejectLane() {
    doSend(`LANE_UNLOAD LANE=${props.name}`)
}
</script>
