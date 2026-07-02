/**
 * Two separate vendor-sharing mechanisms live here, for two different problems:
 *
 * 1. `installVendorGlobals()` exposes Mainsail's own Vue module instance as a stable `window`
 *    global, so externally hosted plugins (loaded via pluginLoader.ts's dynamic `import(url)`) can
 *    share it instead of bundling their own separate copy. A plugin bundling its own copy of `vue`
 *    isn't just wasteful - it actively breaks anything relying on Vue's app-instance context
 *    (provide/inject), since two separate Vue module instances don't share reactivity or
 *    component-tree context even when rendered into the same DOM. Browsers also have no import map
 *    here, so a plugin's compiled `import { ref } from 'vue'` can't resolve a bare specifier at all
 *    without something to point at. A plugin's build resolves `vue` to a small local shim (see that
 *    plugin's own build config) that reads off this global instead.
 *
 *    A plain `window` global (rather than trying to get Rollup/Vite to emit a real, stably-named
 *    ESM re-export chunk plugins could `import` by URL) is the robust choice here: an attempt at
 *    the URL-based approach hit Rollup/Rolldown tree-shaking away the re-export from a standalone
 *    entry point with no consumers in Mainsail's own build graph, since nothing in Mainsail's own
 *    app imports from it - only an external, dynamically-loaded-at-runtime plugin does, which the
 *    bundler's static analysis has no way to see coming.
 *
 * 2. `registerVuetifyGlobals(app)` globally registers a curated set of Vuetify components/
 *    directives on the app instance itself - matching how DuetWebControl's own host app does it
 *    (`createVuetify({components, directives})`), rather than requiring every plugin's own build to
 *    configure component resolution. This is necessary because Mainsail's own `vuetify.ts` calls
 *    `createVuetify()` without a `components`/`directives` option (it relies entirely on
 *    `vite-plugin-vuetify`'s per-file autoImport instead - see vite.config.ts), so nothing is
 *    globally registered on the app; an externally-loaded plugin's `<v-btn>`/`<v-dialog>`/etc. tags
 *    (written, like any normal Vue SFC, with no explicit import - Vue's compiler turns an
 *    unresolved template tag into a runtime `resolveComponent("v-btn")` call, which looks up the
 *    app's global component registry) silently fall back to native, unstyled elements instead of
 *    erroring, which is why this gap is easy to miss until a plugin's UI renders as plain text with
 *    no button/dialog chrome. A window-global + build-time-alias approach (mirroring #1 above)
 *    would NOT fix this: these plugin SFCs never import from `vuetify/components` in the first
 *    place, so there's nothing for an alias to intercept - the tag only ever resolves through Vue's
 *    own global-registry fallback, which is exactly what `app.component()` populates.
 *
 *    The list below is a CURATED subset, not Vuetify's entire ~100+ component catalog -
 *    deliberately, not by oversight. `vuetify/components`/`vuetify/directives` are full, non-tree-
 *    shaken barrel files; `import * as everything` from them captures the whole namespace as a
 *    value, which defeats Rollup's tree-shaking entirely (nothing can prove any given export is
 *    unused when the whole object is retained) - measured to add ~235KB minified / ~68KB gzip to
 *    the chunk every user downloads on every page load, plugins or not. Named imports of just the
 *    components actually needed let Rollup tree-shake the rest away - and since most of these names
 *    are already pulled in by Mainsail's own UI via the normal autoImport path anyway, the marginal
 *    cost of adding them here is close to zero (measured ~23KB minified / ~6KB gzip). If a plugin's
 *    `<v-whatever>` tag renders as plain unstyled text/native elements instead of real Vuetify
 *    chrome (a soft, visible-in-devtools failure - the same `resolveComponent` warning Vue already
 *    logs for any unresolved tag - not a build error), the fix is adding that one name to the lists
 *    below, not reverting to the full barrel.
 *
 * Both are installed from main.ts: `installVendorGlobals()` right at the very start (before
 * `installMainsailApi()`'s caller even creates the app - a plugin's own compiled `import { ref }
 * from 'vue'` needs this populated before its module code can finish evaluating), and
 * `registerVuetifyGlobals(app)` right after `app.use(vuetify)`, once the app instance exists.
 * Registering the components doesn't need to happen before a plugin's `install(api)` runs (that
 * only registers callbacks/component references for later) - only before the plugin's component
 * actually renders, which happens on user navigation, well after `app.mount()`.
 */
import * as Vue from 'vue'
import type { App } from 'vue'
import {
    VAlert,
    VAppBar,
    VAutocomplete,
    VAvatar,
    VBadge,
    VBottomSheet,
    VBreadcrumbs,
    VBtn,
    VBtnToggle,
    VCard,
    VCardActions,
    VCardSubtitle,
    VCardText,
    VCardTitle,
    VCheckbox,
    VChip,
    VChipGroup,
    VCol,
    VColorPicker,
    VCombobox,
    VContainer,
    VDataTable,
    VDialog,
    VDivider,
    VExpansionPanel,
    VExpansionPanelText,
    VExpansionPanelTitle,
    VExpansionPanels,
    VFileInput,
    VForm,
    VIcon,
    VList,
    VListGroup,
    VListItem,
    VListItemSubtitle,
    VListItemTitle,
    VListSubheader,
    VMenu,
    VNavigationDrawer,
    VOverlay,
    VPagination,
    VProgressCircular,
    VProgressLinear,
    VRadio,
    VRadioGroup,
    VRating,
    VRow,
    VSelect,
    VSheet,
    VSkeletonLoader,
    VSlideGroup,
    VSlider,
    VSnackbar,
    VSpacer,
    VSwitch,
    VTab,
    VTable,
    VTabs,
    VTextarea,
    VTextField,
    VToolbar,
    VTooltip,
    VWindow,
    VWindowItem,
} from 'vuetify/components'
import { ClickOutside, Intersect, Mutate, Resize, Ripple, Scroll, Touch } from 'vuetify/directives'

declare global {
    interface Window {
        __mainsailVendor?: {
            vue: typeof Vue
        }
    }
}

export function installVendorGlobals(): void {
    if (typeof window === 'undefined') return

    window.__mainsailVendor = {
        vue: Vue,
    }
}

const vuetifyComponents: Record<string, unknown> = {
    VAlert,
    VAppBar,
    VAutocomplete,
    VAvatar,
    VBadge,
    VBottomSheet,
    VBreadcrumbs,
    VBtn,
    VBtnToggle,
    VCard,
    VCardActions,
    VCardSubtitle,
    VCardText,
    VCardTitle,
    VCheckbox,
    VChip,
    VChipGroup,
    VCol,
    VColorPicker,
    VCombobox,
    VContainer,
    VDataTable,
    VDialog,
    VDivider,
    VExpansionPanel,
    VExpansionPanelText,
    VExpansionPanelTitle,
    VExpansionPanels,
    VFileInput,
    VForm,
    VIcon,
    VList,
    VListGroup,
    VListItem,
    VListItemSubtitle,
    VListItemTitle,
    VListSubheader,
    VMenu,
    VNavigationDrawer,
    VOverlay,
    VPagination,
    VProgressCircular,
    VProgressLinear,
    VRadio,
    VRadioGroup,
    VRating,
    VRow,
    VSelect,
    VSheet,
    VSkeletonLoader,
    VSlideGroup,
    VSlider,
    VSnackbar,
    VSpacer,
    VSwitch,
    VTab,
    VTable,
    VTabs,
    VTextarea,
    VTextField,
    VToolbar,
    VTooltip,
    VWindow,
    VWindowItem,
}

// Vuetify's own directive names (PascalCase exports) map to kebab-case template usage
// (`v-click-outside`, `v-ripple`, ...) - the same convention `createVuetify({directives})` uses
// internally when it registers the full set.
const vuetifyDirectives: Record<string, unknown> = {
    'click-outside': ClickOutside,
    intersect: Intersect,
    mutate: Mutate,
    resize: Resize,
    ripple: Ripple,
    scroll: Scroll,
    touch: Touch,
}

export function registerVuetifyGlobals(app: App): void {
    for (const [name, component] of Object.entries(vuetifyComponents)) {
        app.component(name, component as Parameters<App['component']>[1])
    }

    for (const [name, directive] of Object.entries(vuetifyDirectives)) {
        app.directive(name, directive as Parameters<App['directive']>[1])
    }
}
