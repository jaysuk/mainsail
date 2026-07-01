<template>
    <v-card
        :class="'panel ' + cardClass + ' ' + (marginBottom ? 'mb-3 mb-md-6' : '') + ' ' + (!expand ? 'expanded' : '')"
        :loading="loading">
        <v-toolbar
            flat
            dense
            :color="toolbarColor"
            :class="getToolbarClass"
            :height="panelToolbarHeight"
            class="panel-toolbar"
            :style="additionalStyle">
            <slot name="buttons-left" />
            <v-toolbar-title class="d-flex align-center">
                <slot v-if="hasIconSlot" name="icon" />
                <v-icon v-if="icon !== null && !hasIconSlot" left>{{ icon }}</v-icon>
                <span v-if="title" class="subheading">{{ title }}</span>
            </v-toolbar-title>
            <slot name="buttons-title" />
            <v-spacer />
            <v-toolbar-items v-show="hasButtonsSlot || collapsible">
                <div v-if="expand || !hideButtonsOnCollapse" class="d-flex align-center">
                    <slot name="buttons" />
                </div>
                <v-btn v-if="collapsible" icon class="btn-collapsible" :ripple="true" @click="expand = !expand">
                    <v-icon :class="expand ? '' : 'icon-rotate-90'">{{ mdiChevronDown }}</v-icon>
                </v-btn>
            </v-toolbar-items>
        </v-toolbar>
        <v-expand-transition>
            <div v-show="expand || !collapsible">
                <slot />
            </div>
        </v-expand-transition>
    </v-card>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useTheme } from 'vuetify'
import { mdiChevronDown } from '@mdi/js'
import { panelToolbarHeight } from '@/store/variables'
import { useGuiStore } from '@/store/gui'
import { useBase } from '@/composables/useBase'

const props = withDefaults(
    defineProps<{
        icon?: string | null
        title: string
        collapsible?: boolean
        cardClass: string
        toolbarColor?: string
        toolbarClass?: string
        loading?: boolean
        marginBottom?: boolean
        hideButtonsOnCollapse?: boolean
    }>(),
    {
        icon: null,
        title: '',
        collapsible: false,
        toolbarColor: '',
        toolbarClass: '',
        loading: false,
        marginBottom: true,
        hideButtonsOnCollapse: false,
    }
)

const slots = useSlots()
const guiStore = useGuiStore()
const vuetifyTheme = useTheme()
const { viewport } = useBase()

const expand = computed<boolean>({
    get: () => guiStore.getPanelExpand(props.cardClass, viewport.value),
    set: (newVal) => guiStore.saveExpandPanel({ name: props.cardClass, value: newVal, viewport: viewport.value }),
})

const hasIconSlot = computed(() => !!slots.icon)
const hasButtonsSlot = computed(() => !!slots.buttons)

const getToolbarClass = computed(() => {
    let output = props.toolbarClass

    if (props.collapsible) output += ' collapsible'

    return output
})

const additionalStyle = computed(() => (vuetifyTheme.current.value.dark ? '' : 'border-bottom: 1px solid #A8A8A8'))
</script>

<style scoped>
.expanded header.v-toolbar {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
}

.btn-collapsible > * {
    will-change: transform;
    transition: transform 500ms;
}
.icon-rotate-90 {
    transform: rotate(90deg);
}

.panel-toolbar {
    overflow-y: hidden;
}

:deep(.panel-toolbar .v-btn) {
    height: 100% !important;
    max-height: none;
}
</style>

<style>
.v-card.panel .v-toolbar__content {
    padding-right: 0;
}
.v-card.panel .v-toolbar__content .subheading {
    user-select: none;
}
.panel-toolbar .v-btn.v-btn--icon {
    width: var(--panel-toolbar-icon-btn-width) !important;
}
</style>
