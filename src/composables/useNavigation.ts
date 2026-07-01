import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiLinkVariant, mdiViewDashboardOutline } from '@mdi/js'
import routes, { type AppRoute } from '@/routes'
import type { PrinterStateKlipperConfig } from '@/store/printer/types'
import type { GuiNavigationStateEntry } from '@/store/gui/navigation/types'
import { useFarmStore } from '@/store/farm'
import { useFilesStore } from '@/store/files'
import { useGuiNavigationStore } from '@/store/gui/navigation'
import { useGuiWebcamsStore } from '@/store/gui/webcams'
import { useServerStore } from '@/store/server'
import { usePrinterStore } from '@/store/printer'
import { useBase } from '@/composables/useBase'

export interface NaviPoint {
    type: 'link' | 'route'
    title: string
    orgTitle?: string
    to?: string
    href?: string
    target?: string
    icon: string
    position: number
    visible: boolean
}

/**
 * Replaces the Vue 2 `NavigationMixin` class component.
 *
 * Note: dropped the original `boolNaviWebcam` getter -- it read
 * `gui.uiSettings.boolWebcamNavi`, a field that doesn't exist anywhere in
 * GuiState (confirmed: not in getDefaultState, not written by any action,
 * not read anywhere else). Dead code from the original app.
 */
export function useNavigation() {
    const { t } = useI18n()
    const { klippyIsConnected } = useBase()
    const farmStore = useFarmStore()
    const filesStore = useFilesStore()
    const guiNavigationStore = useGuiNavigationStore()
    const guiWebcamsStore = useGuiWebcamsStore()
    const serverStore = useServerStore()
    const printerStore = usePrinterStore()

    const customNaviLinks = ref<NaviPoint[]>([])

    const countPrinters = computed(() => farmStore.countPrinters)
    const uiSettings = computed<GuiNavigationStateEntry[]>(() => guiNavigationStore.entries)
    const klippy_state = computed(() => serverStore.klippy_state)
    const moonrakerComponents = computed(() => serverStore.components)
    const registeredDirectories = computed(() => serverStore.registered_directories)
    const klipperConfigfileSettings = computed<PrinterStateKlipperConfig>(() => printerStore.configfile?.settings ?? {})
    const sidebarNaviFile = computed(() => filesStore.getCustomNaviPoints())
    const webcamCount = computed(() => guiWebcamsStore.getWebcams.length)

    const getUiSettings = (entry: GuiNavigationStateEntry): [number, boolean] => {
        const index = uiSettings.value.findIndex((point) => point.title === entry.title && point.type === entry.type)

        if (index === -1) return [entry.position, entry.visible]

        return [uiSettings.value[index].position, uiSettings.value[index].visible]
    }

    const showInNavi = (route: AppRoute): boolean => {
        if (['shutdown', 'error', 'disconnected'].includes(klippy_state.value) && !route.alwaysShow) return false
        else if (route.title === 'Webcam' && webcamCount.value === 0) return false
        else if (route.moonrakerComponent && !moonrakerComponents.value.includes(route.moonrakerComponent)) return false
        else if (route.registeredDirectory && !registeredDirectories.value.includes(route.registeredDirectory)) return false
        else if (route.klipperComponent && !(route.klipperComponent in klipperConfigfileSettings.value)) return false
        else if (route.klipperIsConnected && !klippyIsConnected.value) return false

        return true
    }

    const routesNaviPoints = computed<NaviPoint[]>(() => {
        const points: NaviPoint[] = []

        if (countPrinters.value) {
            points.push({
                title: t('App.Printers'),
                icon: mdiViewDashboardOutline,
                to: '/allPrinters',
                position: 0,
                visible: true,
            } as NaviPoint)
        }

        routes
            .filter((element) => element.showInNavi && showInNavi(element))
            .forEach((element) => {
                const [position, visible] = getUiSettings({
                    type: 'route',
                    title: element.title ?? 'unknown',
                    visible: true,
                    position: element.position ?? 999,
                })

                points.push({
                    type: 'route',
                    title: t(`Router.${element.title}`),
                    orgTitle: element.title ?? undefined,
                    icon: element.icon,
                    to: element.path,
                    position,
                    visible,
                } as NaviPoint)
            })

        if (customNaviLinks.value.length) {
            customNaviLinks.value.forEach((element) => {
                const [position, visible] = getUiSettings({
                    type: 'link',
                    title: element.title ?? 'unknown',
                    visible: element.visible ?? true,
                    position: element.position ?? 999,
                })

                points.push({
                    type: 'link',
                    title: element.title,
                    icon: element.icon,
                    href: element.href,
                    target: element.target,
                    position,
                    visible,
                })
            })
        }

        return points
    })

    const naviPoints = computed(() => [...routesNaviPoints.value].sort((a, b) => a.position - b.position))
    const visibleNaviPoints = computed(() => naviPoints.value.filter((entry) => entry.visible))

    watch(
        sidebarNaviFile,
        async (newVal) => {
            customNaviLinks.value = []

            if (!newVal) return

            const content = await fetch(newVal)
                .then((res) => res.json())
                .catch((err) => {
                    window.console.error('Unable to parse .theme/navi.json.')
                    throw err
                })

            content.forEach((item: NaviPoint) => {
                customNaviLinks.value.push({
                    title: item.title ?? 'Unknown',
                    icon: item.icon ?? mdiLinkVariant,
                    href: item.href ?? '#',
                    target: item.target ?? undefined,
                    position: item.position ?? 999,
                } as NaviPoint)
            })
        },
        { immediate: true }
    )

    return {
        countPrinters,
        routesNaviPoints,
        naviPoints,
        visibleNaviPoints,
        uiSettings,
        klippy_state,
        moonrakerComponents,
        registeredDirectories,
        klipperConfigfileSettings,
        sidebarNaviFile,
        webcamCount,
        showInNavi,
        getUiSettings,
    }
}
