<template>
    <v-row :density="dense ? 'compact' : 'default'">
        <v-col :class="firstColClasses">
            <v-row class="d-flex flex-row">
                <v-col v-if="loading" class="col-auto d-flex justify-center align-center pr-0">
                    <v-progress-circular indeterminate color="primary" :size="24" />
                </v-col>
                <v-col v-else-if="icon" class="col-auto d-flex justify-center align-center pr-0">
                    <v-icon>{{ icon }}</v-icon>
                </v-col>
                <v-col class="col d-flex justify-center flex-column">
                    <span class="settings-row-title">{{ title }}</span>
                    <span v-if="subTitle" class="settings-row-subtitle">{{ subTitle }}</span>
                </v-col>
            </v-row>
        </v-col>
        <v-col :class="secondColClasses">
            <slot />
        </v-col>
    </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
    defineProps<{
        loading?: boolean
        icon?: string
        title: string
        subTitle?: string
        dynamicSlotWidth?: boolean
        mobileSecondRow?: boolean
        dense?: boolean
    }>(),
    {
        loading: false,
        icon: '',
        subTitle: undefined,
        dynamicSlotWidth: false,
        mobileSecondRow: false,
        dense: false,
    }
)

const firstColClasses = computed(() => {
    const dense = props.dense ? ' py-1' : ''
    const defaultClasses = ' d-flex justify-center' + dense

    if (props.dynamicSlotWidth) return 'col' + defaultClasses
    else if (props.mobileSecondRow) return 'col-12 col-md-6' + defaultClasses

    return 'col-6' + defaultClasses
})

const secondColClasses = computed(() => {
    const dense = props.dense ? ' py-1' : ' settings-row-slot'
    const defaultClasses = ' d-flex justify-end align-center' + dense

    if (props.dynamicSlotWidth) return 'col-auto' + defaultClasses
    else if (props.mobileSecondRow) return 'col-12 col-md-6 pt-0 pt-md-3' + defaultClasses

    return 'col-6' + defaultClasses
})
</script>

<style scoped>
.settings-row-title {
    display: block;
    width: 100%;
    font-weight: bold;
}

.settings-row-subtitle {
    display: block;
    font-size: 0.8em;
    line-height: 1.3;
    margin-top: 3px;
}

.settings-row-slot {
    min-height: 64px;
}
</style>
