<template>
    <div class="grey flex-grow-1 afc-unit-lane d-flex flex-column" :class="laneStatusClass">
        <afc-panel-unit-lane-header :name="name" />
        <template v-if="laneReady">
            <afc-panel-unit-lane-body :name="name" />
            <afc-panel-unit-lane-actions :name="name" />
        </template>
        <afc-panel-unit-lane-empty v-else :name="name" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AfcPanelUnitLaneHeader from '@/components/panels/Afc/AfcPanelUnitLaneHeader.vue'
import AfcPanelUnitLaneBody from '@/components/panels/Afc/AfcPanelUnitLaneBody.vue'
import AfcPanelUnitLaneActions from '@/components/panels/Afc/AfcPanelUnitLaneActions.vue'
import AfcPanelUnitLaneEmpty from '@/components/panels/Afc/AfcPanelUnitLaneEmpty.vue'
import { useAfc } from '@/composables/useAfc'
import { useMainsailTheme } from '@/composables/useMainsailTheme'

const props = defineProps<{
    name: string
}>()

const { afcCurrentLane, afcErrorState, getAfcLaneObject } = useAfc()
const { isDark } = useMainsailTheme()

const lane = computed(() => getAfcLaneObject(props.name) as Record<string, any>)

const laneActive = computed(() => {
    const activeLaneName = (afcCurrentLane.value as { name?: string })?.name ?? ''

    return props.name === activeLaneName
})

const laneStatusClass = computed(() => ({
    'darken-3': isDark.value,
    'lighten-2': !isDark.value,
    'border-error': laneActive.value && afcErrorState.value,
    'border-success': laneActive.value && !afcErrorState.value,
}))

const laneReady = computed(() => lane.value.load && lane.value.prep)
</script>

<style scoped>
.afc-unit-lane {
    border-radius: 8px;
    box-sizing: border-box !important;
    border-width: 1px;
    border-style: solid;
    flex-basis: 0;
}

.v-application .border-error {
    border-color: rgb(var(--v-theme-error)) !important;
}

.v-application .border-success {
    border-color: rgb(var(--v-theme-primary)) !important;
}
</style>
