<template>
    <v-dialog v-model="showDialog" width="400" @click:outside="closeDialog">
        <panel :title="t('Panels.AfcPanel.InfiniteSpoolHeadline')" :icon="afcIconLogo" card-class="afc-unit-lane-infinite-spool-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>
                <v-row>
                    <v-col class="pb-0">
                        <p>{{ t('Panels.AfcPanel.InfiniteSpoolDescription', { name }) }}</p>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col class="pt-0 text-center">
                        <v-btn v-for="lane in laneList" :key="lane" :disabled="runoutLane === lane" color="primary" class="ma-2" @click="setRunout(lane)">
                            {{ lane }}
                        </v-btn>
                    </v-col>
                </v-row>
            </v-card-text>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick } from '@mdi/js'
import { afcIconLogo } from '@/plugins/afcIcons'
import { useAfc } from '@/composables/useAfc'
import { useControl } from '@/composables/useControl'

const props = defineProps<{
    name: string
}>()

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()
const { afc, getAfcLaneObject } = useAfc()
const { doSend } = useControl()

const lane = computed(() => getAfcLaneObject(props.name) as Record<string, any>)

const runoutLane = computed(() => lane.value.runout_lane ?? 'NONE')

const laneList = computed(() => {
    const allLanes = (afc.value.lanes as string[]) ?? []
    let output: string[] = []

    for (const laneName of allLanes) {
        if (laneName === props.name) continue

        const lane = getAfcLaneObject(laneName) as { prep?: boolean; load?: boolean; name: string }
        const prep = lane.prep ?? false
        const load = lane.load ?? false

        if (prep && load) output.push(lane.name)
    }

    output = output.sort((a, b) => a.localeCompare(b))
    output.unshift('NONE')

    return output
})

function closeDialog() {
    showDialog.value = false
}

function setRunout(newLane: string) {
    doSend(`SET_RUNOUT LANE=${props.name} RUNOUT=${newLane}`)

    closeDialog()
}
</script>
