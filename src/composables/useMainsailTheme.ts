import { computed } from 'vue'
import { useTheme } from 'vuetify'
import { useGuiStore } from '@/store/gui'
import { useFilesStore } from '@/store/files'

/**
 * Replaces the Vue 2 `ThemeMixin` class component. Named distinctly from
 * Vuetify's own `useTheme()` composable (used internally here for dark-mode
 * state) to avoid a naming collision at call sites.
 */
export function useMainsailTheme() {
    const vuetifyTheme = useTheme()
    const guiStore = useGuiStore()
    const filesStore = useFilesStore()

    const isDark = computed(() => vuetifyTheme.global.current.value.dark)

    const fgColor = (alpha = 1, dark: boolean = isDark.value): string => {
        const base = dark ? 255 : 0
        return `rgba(${base}, ${base}, ${base}, ${alpha})`
    }

    const bgColor = (alpha = 1) => fgColor(alpha, !isDark.value)

    const themeName = computed(() => guiStore.theme)
    const theme = computed(() => guiStore.getTheme)
    const themeMode = computed(() => guiStore.uiSettings.mode ?? 'dark')

    const fgColorHi = computed(() => fgColor(0.8))
    const fgColorMid = computed(() => fgColor(0.5))
    const fgColorLow = computed(() => fgColor(0.2))
    const fgColorFaint = computed(() => fgColor(0.1))

    const machineButtonCol = computed(() => (isDark.value ? 'grey darken-3' : 'grey lighten-1'))

    const draggableBgStyle = computed(() => {
        const col = isDark.value ? '#282828' : '#e7e7e7'
        return `background-color: ${col}`
    })

    const progressBarColor = computed(() => (isDark.value ? 'white' : 'primary'))

    const sidebarBgImage = computed(() => {
        if (theme.value.sidebarBackground?.show) {
            if (theme.value.sidebarBackground?.light && themeMode.value === 'light')
                return `/img/themes/sidebarBackground-${themeName.value}-light.png`

            return `/img/themes/sidebarBackground-${themeName.value}.png`
        }

        return isDark.value ? '/img/sidebar-background.svg' : '/img/sidebar-background-light.svg'
    })

    const sidebarLogo = computed<string>(() => {
        const url = filesStore.getSidebarLogo()
        if (url !== '' || themeName.value === 'mainsail') return url

        if (!(theme.value.logo?.show ?? false)) return ''

        if (theme.value.logo?.light && themeMode.value === 'light') return `/img/themes/sidebarLogo-${themeName.value}-light.svg`

        return `/img/themes/sidebarLogo-${themeName.value}.svg`
    })

    const mainBgImage = computed(() => {
        const url = filesStore.getMainBackground()
        if (url || themeName.value === 'mainsail') return url

        if (!theme.value.mainBackground?.show) return null

        if (theme.value.mainBackground?.light && themeMode.value === 'light') return `/img/themes/mainBackground-${themeName.value}-light.png`

        return `/img/themes/mainBackground-${themeName.value}.png`
    })

    const themeCss = computed(() => {
        if (!(theme.value.css ?? false)) return null

        return `/css/themes/${themeName.value}.css`
    })

    return {
        fgColor,
        bgColor,
        themeName,
        theme,
        themeMode,
        fgColorHi,
        fgColorMid,
        fgColorLow,
        fgColorFaint,
        machineButtonCol,
        draggableBgStyle,
        progressBarColor,
        sidebarBgImage,
        sidebarLogo,
        mainBgImage,
        themeCss,
    }
}
