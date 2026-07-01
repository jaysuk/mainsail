<template>
    <div>
        <v-tooltip location="right" :open-delay="500" :disabled="navigationStyle !== 'iconsOnly'">
            <template #activator="{ props: activatorProps }">
                <v-list-item
                    :to="to"
                    :href="href"
                    :target="target"
                    :class="itemClass"
                    :prepend-icon="icon"
                    :title="title"
                    v-bind="activatorProps" />
            </template>
            <span>{{ title }}</span>
        </v-tooltip>
        <v-divider v-if="borderBottom" class="my-1" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useGuiStore } from '@/store/gui'
import type { NaviPoint } from '@/composables/useNavigation'

const props = defineProps<{ item: NaviPoint }>()

const route = useRoute()
const guiStore = useGuiStore()

const navigationStyle = computed(() => guiStore.uiSettings.navigationStyle)
const icon = computed(() => props.item.icon)
const title = computed(() => props.item.title)
const to = computed(() => props.item.to ?? undefined)
const href = computed(() => props.item.href ?? undefined)
const target = computed(() => props.item.target ?? undefined)
const borderBottom = computed(() => props.item.to === '/allPrinters')

const isActive = computed<boolean>(() => {
    if (props.item.target === '_blank' || !props.item.to) return false

    return route.path === props.item.to
})

const itemClass = computed(() => ({
    'small-list-item': true,
    'active-nav-item': isActive.value,
}))
</script>

<style scoped>
.small-list-item {
    height: var(--sidebar-menu-item-height);
}

.active-nav-item {
    border-right: 4px solid var(--v-primary-base);
}

.menu-item-icon {
    opacity: 0.85;
}

.menu-item-title {
    line-height: 30px;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    opacity: 0.85;
}
</style>
