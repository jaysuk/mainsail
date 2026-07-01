<template>
    <v-card class="mmuEditTtgMapDialogTool" :class="cardClasses" @click="selectTool">
        <v-card-title class="justify-center py-0">{{ title }}</v-card-title>
        <v-card-text class="px-2 py-0">
            <v-row>
                <v-col cols="5" class="pr-0">
                    <mmu-unit-gate-spool svg-class="w-100" :gate-index="gate" />
                </v-col>
                <v-col cols="7" class="d-flex flex-column justify-space-between pl-1">
                    <div class="body-2 text-center">
                        <div>{{ t('Panels.MmuPanel.TtgMapDialog.Gate') }}</div>
                        <div class="body-1 font-weight-bold">#{{ gate }}</div>
                    </div>
                    <div class="body-2 text-center">
                        <v-divider />
                        <div class="font-smaller text-truncate">
                            <span class="infinity">&infin;</span>
                            {{ endlessSpoolText }}
                        </div>
                    </div>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu, TOOL_GATE_BYPASS, TOOL_GATE_UNKNOWN } from '@/composables/useMmu'
import MmuUnitGateSpool from '@/components/panels/Mmu/MmuUnitGateSpool.vue'

const props = withDefaults(
    defineProps<{
        gate: number
        tool: number
        isSelected?: boolean
        isDisabled?: boolean
    }>(),
    {
        isSelected: false,
        isDisabled: false,
    }
)

const emit = defineEmits<{
    'select-tool': [tool: number]
}>()

const { t } = useI18n()
const { endlessSpoolGroups } = useMmu()

const title = computed(() => {
    if (props.tool === TOOL_GATE_BYPASS) return t('Panels.MmuPanel.Bypass')
    if (props.tool === TOOL_GATE_UNKNOWN) return `T?`

    return `T${props.tool}`
})

const endlessSpoolText = computed(() => {
    const currentGroup = endlessSpoolGroups.value[props.gate]

    const eSGates = endlessSpoolGroups.value.map((_, i) => (props.gate + i) % endlessSpoolGroups.value.length).filter((idx) => idx !== props.gate && endlessSpoolGroups.value[idx] === currentGroup)

    return eSGates.join(', ') || t('Panels.MmuPanel.TtgMapDialog.None')
})

const cardClasses = computed(() => ({
    'is-selected': props.isSelected,
    'is-disabled': props.isDisabled,
}))

function selectTool() {
    emit('select-tool', props.tool)
}
</script>

<style scoped>
.mmuEditTtgMapDialogTool {
    min-width: 105px;
    flex-basis: 0;
    background: #2c2c2c;
    cursor: pointer;
}

html.theme--light .mmuEditTtgMapDialogTool {
    background: #f0f0f0;
}

.mmuEditTtgMapDialogTool.is-selected {
    background: #595959 !important;
}

.mmuEditTtgMapDialogTool.is-disabled {
    opacity: 0.5;
}

.font-smaller {
    font-size: 0.75rem;
}

.infinity {
    position: relative;
    top: 1px;
}
</style>
