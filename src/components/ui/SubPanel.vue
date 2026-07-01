<template>
    <div>
        <div class="px-3 d-flex align-center">
            <v-btn class="px-0 btn-collapsible" plain small :ripple="false" @click="expand = !expand">
                <v-icon small :class="!expand ? 'icon-rotate-n90' : ''">
                    {{ expand ? iconExpanded : iconCollapsed }}
                </v-icon>
                <span class="pl-1">{{ title }}</span>
            </v-btn>
            <v-divider class="ml-3"></v-divider>
        </div>
        <v-expand-transition>
            <div v-show="expand">
                <slot></slot>
            </div>
        </v-expand-transition>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mdiChevronDown } from '@mdi/js'
import { useGuiStore } from '@/store/gui'
import { useBase } from '@/composables/useBase'

const props = withDefaults(
    defineProps<{
        iconExpanded?: string | null
        iconCollapsed?: string | null
        title: string
        subPanelClass: string
    }>(),
    {
        iconExpanded: mdiChevronDown,
        iconCollapsed: mdiChevronDown,
        title: '',
    }
)

const guiStore = useGuiStore()
const { viewport } = useBase()

const expand = computed<boolean>({
    get: () => guiStore.getPanelExpand(props.subPanelClass, viewport.value),
    set: (newVal) => guiStore.saveExpandPanel({ name: props.subPanelClass, value: newVal, viewport: viewport.value }),
})
</script>

<style scoped>
.btn-collapsible > * {
    will-change: transform;
    transition: transform 500ms;
}

.icon-rotate-n90 {
    transform: rotate(-90deg);
}
</style>
