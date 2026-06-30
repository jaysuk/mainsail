import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import routes from '@/routes'

// TODO(phase-3): the `routes` export is the navigation schema (AppRoute[]) and
// carries UI metadata (icon/title/position/showInNavi/...). It is passed
// through as-is so existing consumers reading `$router.options.routes` keep
// working; Phase 3 should move that metadata into RouteRecordRaw `meta` and
// read it from the navigation store.
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: routes as unknown as RouteRecordRaw[],
})

export default router
