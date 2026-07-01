<template>
    <div class="mmu-unit-footer zindex-4 d-flex flex-row align-center px-2 pb-1">
        <v-icon v-if="showFooter && showLogos" class="mr-4 flex-grow-0 flex-shrink-0 opacity-70" :class="logoClasses" :size="logoHeight">
            {{ logo }}
        </v-icon>
        <div v-if="showFooter" class="flex-grow-1 flex-shrink-1 min-width-0 text-caption">
            <div v-if="showName" class="text-truncate">{{ unitDisplayName }}</div>
            <mmu-unit-footer-climate v-if="showDetails && showClimate" :mmu-machine-unit="mmuMachineUnit" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MmuMachineUnit } from '@/composables/useMmu'
import { useMmu } from '@/composables/useMmu'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import MmuUnitFooterClimate from '@/components/panels/Mmu/MmuUnitFooterClimate.vue'
import { mmuIcon3MS, mmuIconAngryBeaver, mmuIconBoxTurtle, mmuIconEmu, mmuIconErcf, mmuIconHappyHare, mmuIconKms, mmuIconMmx, mmuIconNightOwl, mmuIconQuattroBox, mmuIconTradrack, mmuIconVvd, mmuThemeIcons } from '@/plugins/mmuIcons'
import { useGuiStore } from '@/store/gui'

const squareLogoVendors = ['3MS', 'AngryBeaver', 'EMU', 'ERCF', 'KMS']

const props = withDefaults(
    defineProps<{
        unitIndex: number
        mmuMachineUnit: MmuMachineUnit | undefined
        showDetails?: boolean
        showFooter?: boolean
    }>(),
    {
        showDetails: true,
        showFooter: true,
    }
)

const { spoolWidth } = useMmu()
const { isDark } = useMainsailTheme()
const guiStore = useGuiStore()

const unitDisplayName = computed<string>(() => {
    const name = props.mmuMachineUnit?.name

    return `#${props.unitIndex + 1} ${name}`
})

const showLogos = computed<boolean>(() => guiStore.view.mmu.showLogos ?? true)

const showName = computed<boolean>(() => guiStore.view.mmu.showName ?? true)

const showClimate = computed<boolean>(() => guiStore.view.mmu.showClimate ?? true)

const mmuVendor = computed(() => props.mmuMachineUnit?.vendor ?? 'Unknown')

const logoHeight = computed(() => {
    if (squareLogoVendors.includes(mmuVendor.value)) return spoolWidth.value - 16

    return spoolWidth.value - 8
})

const logoClasses = computed(() => {
    if (squareLogoVendors.includes(mmuVendor.value)) return ['my-1']

    return []
})

function getBaseIcon(vendor: string) {
    switch (vendor) {
        case '3MS':
            return mmuIcon3MS

        case 'AngryBeaver':
            return mmuIconAngryBeaver

        case 'BoxTurtle':
            return mmuIconBoxTurtle

        case 'EMU':
            return mmuIconEmu

        case 'ERCF':
            return mmuIconErcf

        case 'KMS':
            return mmuIconKms

        case 'MMX':
            return mmuIconMmx

        case 'NightOwl':
            return mmuIconNightOwl

        case 'QuattroBox':
            return mmuIconQuattroBox

        case 'Tradrack':
            return mmuIconTradrack

        case 'VVD':
            return mmuIconVvd

        default:
            return mmuIconHappyHare
    }
}

const logo = computed(() => {
    const baseIcon = getBaseIcon(mmuVendor.value)
    const themeVariants = mmuThemeIcons[mmuVendor.value]

    if (!themeVariants) return baseIcon

    const themeIcon = isDark.value ? themeVariants.dark : themeVariants.light

    return themeIcon ?? baseIcon
})
</script>

<style scoped>
.mmu-unit-footer {
    background: #2c2c2c;
    border-radius: 0 0 8px 8px;
}

html.theme--light .mmu-unit-footer {
    background: #f0f0f0;
}

.opacity-70 {
    opacity: 0.7;
}

.zindex-4 {
    z-index: 4;
}
</style>
