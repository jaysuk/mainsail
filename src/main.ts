import 'regenerator-runtime' // async polyfill used by the gcodeviewer
import 'resize-observer-polyfill' // polyfill needed by the responsive class detection
import { createApp, defineAsyncComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import vuetify from '@/plugins/vuetify'
import i18n, { setAndLoadLocale } from '@/plugins/i18n'
import router from '@/plugins/router'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useSocketStore } from '@/store/socket'
import { useRootStore } from '@/store'
import { installMainsailApi } from '@/plugins/mainsail'
import { loadPlugins } from '@/plugins/mainsail/pluginLoader'
import { installVendorGlobals, registerVuetifyGlobals } from '@/plugins/mainsail/vendor'

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

import { defaultMode } from './store/variables'

const pinia = createPinia()
// initLoad() calls into Pinia stores before the app (and app.use(pinia)) is
// created, so the Pinia instance must be made active explicitly first.
setActivePinia(pinia)

// window.Mainsail must exist before any plugin module loads (its install()
// call is the whole point of loading it), and doesn't depend on the app/
// router/vuetify being mounted yet - install it as early as possible.
installMainsailApi()
// Likewise: a plugin's own compiled `import { ref } from 'vue'` needs this
// global populated before its module code can even finish evaluating, so it
// runs immediately alongside installMainsailApi(), not deferred until later
// in boot.
installVendorGlobals()

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

        const pluginUrls = Array.isArray(file.plugins) ? (file.plugins as string[]) : []
        if (pluginUrls.length) await loadPlugins(pluginUrls)
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
    // Registers a curated set of Vuetify components/directives as real global components on this
    // app instance, so externally-loaded plugins' <v-btn>/<v-dialog>/etc. template tags (written
    // with no explicit import, same as any normal Vue SFC) resolve to real Vuetify chrome instead
    // of silently falling back to native, unstyled elements - see vendor.ts's doc comment.
    registerVuetifyGlobals(app)
    app.use(ToastPlugin, { duration: 3000 })

    app.directive('longpress', longpress)
    app.directive('responsive-class', responsiveClass)

    // echarts (+ vue-echarts) is only needed on the handful of pages/panels
    // that render a chart (temp graphs, history stats, heightmap). Registering
    // it via a static top-level import pulled ~600KB gzip 200KB into the
    // eager entry bundle, parsed on every single page load regardless of
    // whether the user ever sees a chart. defineAsyncComponent keeps the
    // global `<e-chart>` tag working everywhere but defers the actual
    // download/parse until the first template that renders one.
    app.component(
        'EChart',
        defineAsyncComponent(async () => {
            const [{ default: ECharts }, { use }, { SVGRenderer }, { BarChart, LineChart, PieChart }, { DatasetComponent, GridComponent, LegendComponent, TooltipComponent }] =
                await Promise.all([import('vue-echarts'), import('echarts/core'), import('echarts/renderers'), import('echarts/charts'), import('echarts/components')])

            use([SVGRenderer, LineChart, BarChart, LegendComponent, PieChart, DatasetComponent, GridComponent, TooltipComponent])

            return ECharts
        })
    )

    app.mount('#app')

    // Bridge the websocket client to the Pinia socket store and connect.
    const socketStore = useSocketStore()
    webSocketClient.setUrl(socketStore.getWebsocketUrl)
    if (useRootStore().instancesDB === 'moonraker') webSocketClient.connect()
})
