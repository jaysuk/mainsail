import 'regenerator-runtime' // async polyfill used by the gcodeviewer
import 'resize-observer-polyfill' // polyfill needed by the responsive class detection
import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import vuetify from '@/plugins/vuetify'
import i18n, { setAndLoadLocale } from '@/plugins/i18n'
import router from '@/plugins/router'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'
import { useRootStore } from '@/store'

// Toast notifications
import ToastPlugin from 'vue-toast-notification'
import 'vue-toast-notification/dist/theme-sugar.css'

// OverlayScrollbars v2 styles. The Vue 2 `OverlayScrollbarsPlugin` no longer
// exists in overlayscrollbars-vue@0.5 — usage is migrated to the
// <OverlayScrollbarsComponent> component per-panel in Phase 3.
import 'overlayscrollbars/overlayscrollbars.css'

// Directives
import longpress from '@/directives/longpress'
import responsiveClass from '@/directives/responsive-class'

// Echarts
import ECharts from 'vue-echarts'
import { use } from 'echarts/core'

// import ECharts modules manually to reduce bundle size
import { SVGRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { DatasetComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'

import { defaultMode } from './store/variables'

use([SVGRenderer, LineChart, BarChart, LegendComponent, PieChart, DatasetComponent, GridComponent, TooltipComponent])

const pinia = createPinia()
// initLoad() calls into Pinia stores before the app (and app.use(pinia)) is
// created, so the Pinia instance must be made active explicitly first.
setActivePinia(pinia)

const initLoad = async (): Promise<void> => {
    try {
        // get base url. by default, it is '/'
        const base = import.meta.env.BASE_URL ?? '/'

        //load config.json
        const res = await fetch(`${base}config.json`)
        const file = (await res.json()) as Record<string, unknown>

        window.console.debug('Loaded config.json')

        await useRootStore().importConfigJson(file)

        const locale = (file.defaultLocale ?? 'en') as string
        await setAndLoadLocale(locale)

        // Handle mode before mount for consistency in the connecting dialog
        const mode = file.defaultMode ?? defaultMode
        vuetify.theme.global.name.value = mode === 'light' ? 'light' : 'dark'
    } catch (e) {
        window.console.error('Failed to load config.json')
        window.console.error(e)
    }
}

initLoad().then(() => {
    const app = createApp(App)

    app.use(pinia)
    app.use(router)
    app.use(i18n)
    app.use(vuetify)
    app.use(ToastPlugin, { duration: 3000 })

    app.directive('longpress', longpress)
    app.directive('responsive-class', responsiveClass)

    app.component('EChart', ECharts)

    // TODO(phase-3): replace the vue-observe-visibility directive and the
    // overlayscrollbars-vue plugin registrations removed in Phase 1.

    app.mount('#app')

    // Bridge the websocket client to the Pinia socket store and connect.
    const socketStore = useSocketStore()
    webSocketClient.setUrl(socketStore.getWebsocketUrl)
    if (useRootStore().instancesDB === 'moonraker') webSocketClient.connect()
})
