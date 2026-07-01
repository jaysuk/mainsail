<template>
    <v-dialog v-model="showDialog" width="400" @click:outside="closeDialog">
        <panel :title="t('Panels.AfcPanel.LaneMapping')" :icon="afcIconLogo" card-class="afc-unit-lane-mapping-tool-dialog" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>
                <v-row>
                    <v-col class="pb-0">
                        <p>{{ t('Panels.AfcPanel.LaneMappingToCommand', { name }) }}</p>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col class="pt-0 text-center">
                        <v-btn v-for="tool in afcMapList" :key="tool" :disabled="mappedTools.includes(tool.toLowerCase())" color="primary" class="ma-2" @click="mapTool(tool)">
                            {{ tool.toUpperCase() }}
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
const { afcMapList, getAfcLaneObject } = useAfc()
const { doSend } = useControl()

const lane = computed(() => getAfcLaneObject(props.name) as { map?: string | string[] })

const mappedTools = computed<string[]>(() => {
    const map = lane.value.map
    if (!map) return []

    return Array.isArray(map) ? map.map((t: string) => t.toLowerCase()) : [map.toLowerCase()]
})

function closeDialog() {
    showDialog.value = false
}

function mapTool(newTool: string) {
    doSend(`SET_MAP LANE=${props.name} MAP=${newTool}`)

    closeDialog()
}
</script>
