<template>
    <v-container class="px-0 py-2">
        <v-row>
            <v-col class="pb-3">
                <v-list-subheader class="_miscellaneous-sensor-subheader">
                    <v-icon size="small" class="mr-2">{{ unitToSymbol(unit) }}</v-icon>
                    <span>{{ convertName(name) }}</span>
                    <v-spacer />
                    <span>{{ output }}</span>
                </v-list-subheader>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { convertName, unitToSymbol } from '@/plugins/helpers'

const props = withDefaults(
    defineProps<{
        name: string
        value: number
        unit?: string
    }>(),
    { unit: '' }
)

const output = computed(() => {
    const value = isNaN(props.value) ? '--' : props.value

    // sensors without a real unit are reported with unit: '' (never null,
    // despite the historical null-check here -- that branch was dead code
    // and every unit-less sensor rendered "value undefined"/"value " instead
    // of just the value)
    if (props.unit === '') return props.value

    return `${value} ${props.unit}`
})
</script>

<style scoped>
._miscellaneous-sensor-subheader {
    height: auto;
}
</style>
