# Mainsail Migration Plan — Vue 3 · Vuetify 4 · Pinia

**Branch:** `feat/vue3-vuetify4-migration`
**Status:** Plan only — no source changes yet.
**Author/date:** 2026-06-30

---

## 0. Audit summary (verified against the tree, not the brief)

| Layer | Current (real) | Target |
|---|---|---|
| Build tooling | **Already Vite 8** (`vite@^8.1.1`). No Webpack, no `vue.config.js`, no `@vue/cli-service`. | Keep Vite 8 |
| Vue core | `vue@2.7.10` + `@pedrolamas/plugin-vue2` | `vue@3.5` + `@vitejs/plugin-vue` |
| UI | `vuetify@2.7.2` + `VuetifyResolver` (unplugin-vue-components) | `vuetify@4.1.2` + `vite-plugin-vuetify` |
| State | `vuex@3` — **152 files**, root + 8 modules (`socket, server, printer, files, gui, farm, editor, gcodeviewer`), many deeply nested | `pinia@3` |
| Components | `vue-class-component` + `vue-property-decorator` in **250+ files** | `<script setup lang="ts">` |
| Router | `vue-router@3` | `vue-router@5.1` |
| i18n | `vue-i18n@8` | `vue-i18n@11` |
| Mixins | TS mixins in `src/components/mixins/*` (class-based) | Composables (`src/composables/`) |
| Scale | **343 `.vue` files**, 152 store files, ~16 mixins, custom directives | — |

> **Brief corrections folded in:** Phase 1's "purge Webpack/`vue.config.js`/`@vue/cli-service`" is a no-op — none exist. `vuetify@4` (4.1.2) and `vue-router@5` (5.1.0) **do** exist as stable releases (Vuetify 4 stable Feb 2026); the original concern that they were unreleased was based on a stale Jan-2026 knowledge cutoff and has been retracted.

### Verified npm versions (queried 2026-06-30)

```
vue            3.5.39      pinia            3.0.4
vuetify        4.1.2       vue-router       5.1.0
vue-i18n       11.4.6      vite-plugin-vuetify 2.1.3
```

### Dependency disposition

**Add:** `pinia@3`, `vue-router@5`, `vue-i18n@11`, `vuetify@4`, `vite-plugin-vuetify`, `@vitejs/plugin-vue`, `vue-tsc`, `@vue/compiler-sfc`.

**Remove:** `vue@2`, `vuex@3`, `vue-class-component`, `vue-property-decorator`, `vue-debounce-decorator`, `vue-template-compiler`, `@pedrolamas/plugin-vue2`, `vue-router@3`, `vue-i18n@8`, `vuetify@2`, the `VuetifyResolver` usage, and `oxc.decorator.legacy` from `vite.config.ts`.

**Upgrade (Vue 3 versions exist):**
- `vuedraggable` `2.24.3` → **`4.1.0`** (`vuedraggable@next`)
- `vue-toast-notification` `1.x` → **`3.1.3`**
- `vue-inline-svg` `2.x` → **`4.0.1`**
- `overlayscrollbars` `1.13` + `overlayscrollbars-vue` `0.2.2` → **`overlayscrollbars@2`** + **`overlayscrollbars-vue@0.5.10`** (new component-based API)
- `vue-echarts` `6.x` → **`8.0.1`**

**Replace (no Vue 3 release):**
- `vue-observe-visibility` (stuck at 1.0.0) → custom `v-observe-visibility` directive backed by `IntersectionObserver`, or a `useIntersectionObserver` composable.
- `vue-load-image` (stuck at 0.2.0) → native `<img loading="lazy">` + a small loading/error wrapper component.

**Unaffected (framework-agnostic):** `@jaames/iro`, `@codemirror/*`, `codemirror`, `echarts`, `axios`, `hls.js`, `jmuxer`, `semver`, `dompurify`, `uuid`, etc.

---

## 1. Execution principles

1. **Branch-isolated.** All work on `feat/vue3-vuetify4-migration`. `develop` stays green.
2. **In-place.** Files keep their paths to preserve `git mv`/blame history. New concept dirs only where none exist (`src/stores/`, `src/composables/`).
3. **No shims.** No `@vue/compat`. Native Vue 3 throughout.
4. **vue-tsc is the compass.** The toolchain is broken mid-migration; rely on `npx vue-tsc --noEmit` (scoped per directory) rather than runtime until late phases.
5. **Commit per safe sub-block**, not per phase — each commit should at least type-check the directory it touches. Never commit a state that regresses an already-migrated directory.
6. **Pinia streaming rule.** `printer`/`server`/`socket` state holds high-frequency Moonraker object-model updates. Initialize as a single deep `reactive`/`ref` and apply updates via targeted **in-place deep-merge** (replacing the Vuex `Vue.set` mutations) to avoid per-key proxy churn.

---

## 2. Phase plan

### PHASE 1 — Tooling & bootstrap (toolchain goes red, expected)

- Swap deps per §0 in `package.json`; `npm install`.
- `vite.config.ts`: replace `@pedrolamas/plugin-vue2` import with `@vitejs/plugin-vue`; replace `VuetifyResolver` with `vite-plugin-vuetify`; drop `oxc.decorator.legacy`; remove the `vue/dist/vue.runtime.*` aliases (Vue 3 resolves cleanly).
- `src/main.ts`: rewrite to `createApp(App)` + `app.use(pinia)` + `app.use(router)` + `app.use(i18n)` + `app.use(vuetify)`. Convert `Vue.directive`/`Vue.component`/`Vue.use(plugin)` global registrations to `app.directive`/`app.component`/`app.use`. Replace the `Vue.$socket` global with a Pinia-aware websocket plugin/composable.
- `src/plugins/vuetify.ts`, `router.ts`, `i18n.ts`: rewrite to the v4 / v5 / v11 `create*` factory style. Move theme dark/light handling off `vuetify.framework.theme.dark`.
- **Gate:** `vue-tsc --noEmit` on config + bootstrap files only. Commit.

### PHASE 2 — State engine (Vuex → Pinia) & network pipeline

- Port the 8 modules to `src/stores/` as `defineStore` setup stores, deepest-nested first (`printer/tempHistory`, `gui/*` leaves) up to roots.
- Replace `actions/mutations/getters/types` quad-files with: state refs, getters as `computed`, actions as functions. `Vue.set(state, k, v)` → direct assignment / deep-merge helper.
- Rewire `src/plugins/webSocketClient.ts` to call store actions directly; erase all `store.commit`/`store.dispatch` string syntax.
- Port `importConfigJson` + `socket/getWebsocketUrl` bootstrap path used in `main.ts`.
- **Gate:** `vue-tsc --noEmit` on `src/stores/**`. Commit per module group.

### PHASE 3 — Layout registry & component modernization

- Build **`useLayoutStore`** (Pinia): editable schema array `{ name, componentName, visible, order, breakpointSizes }` for each major panel (Temperature, Console, Macros, Webcam, Move/Toolhead, Status, etc.), persisted per-panel to `localStorage`. This generalizes the existing `src/components/settings/Dashboard/{Desktop,Tablet,Mobile,Widescreen}.vue` grid configs.
- Dashboard containers render via native `<component :is="panel.componentName" />`; panels become decoupled blocks reading params from stores — no hardcoded panel templates.
- Convert components class→`<script setup>` in dependency order: `components/ui` & `inputs` (leaf) → `panels` → `dialogs` → `pages`. Convert mixins to composables alongside.
- Vuetify 4 markup pass: `outlined|flat|text` → `variant="..."`; remove `v-list-item-content`/`v-list-item-title` wrappers; treat slot props as unwrapped raw values (no `.value` in template).
- **Gate:** `vue-tsc --noEmit` per directory block before each commit.

### PHASE 4 — Plugin framework & test kit

- `window.Mainsail` global gateway: `registerDashboardPanel`, `registerComponent`, store/object-model subscription hooks, event bus bridge (replacing `src/plugins/eventBus.ts`).
- Dynamic plugin loader resolving injected components into the `useLayoutStore` registry.
- Port `dwc-plugin-test-kit` patterns: Moonraker WebSocket mock fixtures + isolated playground harness asserting hook registration and reactive pipelines resolve without throwing. Wire into the existing `vitest` setup (`tests/**/*.spec.ts`).

### PHASE 5 — Global verification & bundling

- Full `npx vue-tsc --noEmit` clean.
- `npm run build` (Vite) → deployable bundle; smoke-test `npm run preview`.
- Run Cypress (`npm test`) and `vitest run`.

---

## 3. Risk register

| Risk | Mitigation |
|---|---|
| 250+ class components — largest effort | Dependency-ordered, leaf-first; composables replace mixins as you go |
| High-frequency printer state perf in Vue 3 proxies | Deep-merge into one reactive root; avoid fine-grained `ref` per key |
| `vue-observe-visibility` / `vue-load-image` have no Vue 3 build | Replace with IntersectionObserver directive / native lazy `<img>` |
| Vuetify 2→4 is a two-major jump (skips 3) | Markup audit is its own sweep in Phase 3; expect grid/list/theme API churn |
| Broken toolchain hides runtime regressions | `vue-tsc` gates per block; defer runtime validation to Phase 5 but smoke-build earlier if feasible |
| Global `Vue.$socket` / `Vue.prototype` patterns | Replace with composable + Pinia store injection; audit all `Vue.$`/`this.$` usages |

---

## 4. Open items to confirm before Phase 1 code lands

- Pinia option vs setup-store style — plan assumes **setup stores** (best fit for deep-merge streaming).
- New dirs `src/stores/` and `src/composables/` acceptable (vs. keeping `src/store/`)?
- Commit cadence: per sub-block (recommended) vs per phase.
