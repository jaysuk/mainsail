<template>
    <div class="mb-3">
        <v-row v-for="(row, index) in rows" :key="'row_' + index" class="mt-0">
            <v-col>
                <v-item-group class="_btn-group py-0 px-3">
                    <extruder-control-panel-tools-item v-for="macro in row" :key="macro" :name="macro" />
                </v-item-group>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ExtruderControlPanelToolsItem from '@/components/panels/Extruder/ExtruderControlPanelToolsItem.vue'
import { useControl } from '@/composables/useControl'

const { toolchangeMacros } = useControl()

const rows = computed(() => {
    const len = toolchangeMacros.value.length
    const cols = Math.ceil(len / Math.ceil(len / 6))
    const output = []

    for (let i = 0; i < toolchangeMacros.value.length; i += cols) {
        output.push(toolchangeMacros.value.slice(i, i + cols))
    }

    return output
})
</script>

<style scoped>
._btn-group {
    border-radius: 4px;
    display: inline-flex;
    flex-wrap: nowrap;
    max-width: 100%;
    min-width: 100%;

    .v-btn {
        border-radius: 0;
        border-color: rgba(255, 255, 255, 0.12);
        border-style: solid;
        border-width: thin;
        box-shadow: none;
        height: 28px;
        opacity: 0.8;
        min-width: auto !important;
    }

    .v-btn:first-child {
        border-top-left-radius: inherit;
        border-bottom-left-radius: inherit;
    }

    .v-btn:last-child {
        border-top-right-radius: inherit;
        border-bottom-right-radius: inherit;
    }

    .v-btn:not(:first-child) {
        border-left-width: 0;
    }
}

html.theme--light ._btn-group .v-btn {
    border-color: rgba(0, 0, 0, 0.12);
}
</style>
