<template>
    <v-navigation-drawer :key="navigationStyle" v-model="naviDrawer" :rail="navigationStyle === 'iconsOnly'" :width="navigationWidth" :temporary="boolNaviTemp" :style="sidebarCssVars">
        <template #image>
            <v-img :src="sidebarBackground" height="100%" />
        </template>

        <OverlayScrollbarsComponent class="nav-scrollbar">
            <v-list class="pr-0 pt-0 ml-0">
                <v-list-item v-if="isMobile" to="/" :class="mobileLogoClass" :style="`height: ${topbarHeight}px`" :ripple="false">
                    <img v-if="sidebarLogo" :src="sidebarLogo" :style="logoCssVars" class="nav-logo" alt="Logo" />
                    <mainsail-logo v-else :color="logoColor" :style="logoCssVars" class="nav-logo" :ripple="false" />
                    <span v-if="navigationStyle !== 'iconsOnly'" class="text-h6 font-weight-regular text-truncate">
                        {{ printerName }}
                    </span>
                </v-list-item>
                <sidebar-item v-for="(category, index) in visibleNaviPoints" :key="index" :item="category" />
            </v-list>
        </OverlayScrollbarsComponent>
        <template #append>
            <v-list-item class="small-list-item mb-2">
                <template #prepend>
                    <div class="menu-item-icon">
                        <about-dialog />
                    </div>
                </template>
            </v-list-item>
        </template>
    </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import AboutDialog from '@/components/dialogs/AboutDialog.vue'
import { navigationWidth, topbarHeight } from '@/store/variables'
import MainsailLogo from '@/components/ui/MainsailLogo.vue'
import SidebarItem from '@/components/ui/SidebarItem.vue'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { useNavigation } from '@/composables/useNavigation'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { useBase } from '@/composables/useBase'
import { useRootStore } from '@/store'
import { useGuiStore } from '@/store/gui'
import { useFilesStore } from '@/store/files'
import { usePrinterStore } from '@/store/printer'

const { visibleNaviPoints } = useNavigation()
const { sidebarBgImage } = useMainsailTheme()
const { isMobile } = useBase()
const display = useDisplay()
const rootStore = useRootStore()
const guiStore = useGuiStore()
const filesStore = useFilesStore()
const printerStore = usePrinterStore()

const naviDrawer = computed({
    get: () => rootStore.naviDrawer,
    set: (newVal) => rootStore.setNaviDrawer(newVal),
})

const navigationStyle = computed(() => guiStore.uiSettings.navigationStyle)

const sidebarBackground = computed(() => filesStore.getCustomSidebarBackground() ?? sidebarBgImage.value)

const boolNaviTemp = computed(() => !isMobile.value && display.mdAndDown.value)

const sidebarCssVars = computed<Record<string, string>>(() => {
    if (!boolNaviTemp.value) return {} as Record<string, string>

    return {
        top: `${topbarHeight}px !important`,
        'padding-bottom': `${topbarHeight}px`,
    }
})

const sidebarLogo = computed(() => filesStore.getSidebarLogo())
const logoColor = computed(() => guiStore.uiSettings.logo)

const printerName = computed(() => {
    if (guiStore.general.printername.length) return guiStore.general.printername

    return printerStore.hostname
})

const logoCssVars = computed(() => {
    if (navigationStyle.value === 'iconsOnly') return {}

    return { 'margin-right': '16px' }
})

const mobileLogoClass = computed(() => ({
    'sidebar-logo': true,
    'no-text-decoration': true,
    'no-background': true,
    'no-border': true,
    'pa-0': navigationStyle.value === 'iconsOnly',
    'justify-center': navigationStyle.value === 'iconsOnly',
}))
</script>

<style scoped>
.no-text-decoration {
    text-decoration: none;
    background-color: transparent;
}

.no-background:before {
    background-color: rgba(255, 255, 255, 0) !important;
}

.no-border {
    border: 0 !important;
}

.nav-logo {
    height: 32px;
}

.menu-item-icon {
    opacity: 0.85;
}

.nav-scrollbar {
    height: 100%;
}
</style>
