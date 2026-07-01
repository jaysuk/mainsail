import { computed } from 'vue'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { useServerSpoolmanStore } from '@/store/server/spoolman'
import { useGuiStore } from '@/store/gui'
import type { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'

/** Replaces the Vue 2 `AfcMixin` class component. */
export function useAfc() {
    const printerStore = usePrinterStore()
    const serverStore = useServerStore()
    const spoolmanStore = useServerSpoolmanStore()
    const guiStore = useGuiStore()

    const getPrinterObject = (key: string) => (printerStore as Record<string, unknown>)[key] ?? null

    const getPrinterSettings = (key: string) => {
        const settings = printerStore.configfile?.settings ?? {}
        return settings[key.toLowerCase()] ?? null
    }

    const getAfcLaneObject = (lane: string) => {
        const key_stepper = `AFC_stepper ${lane}`
        const key_lane = `AFC_lane ${lane}`
        return getPrinterObject(key_stepper) ?? getPrinterObject(key_lane) ?? {}
    }

    const getAfcLaneSettings = (lane: string) => {
        const key_stepper = `AFC_stepper ${lane}`
        const key_lane = `AFC_lane ${lane}`
        return getPrinterSettings(key_stepper) ?? getPrinterSettings(key_lane) ?? {}
    }

    const getAfcLaneFilament = (laneName: string) => {
        const lane = getAfcLaneObject(laneName) as { spool_id?: number; color?: string; material?: string; weight?: number }
        const spoolId = lane?.spool_id ?? 0
        const spools = spoolmanStore.spools || []
        const spool = spools.find((spool: ServerSpoolmanStateSpool) => spool.id === spoolId) || null

        return {
            color: lane?.color ?? '#000000',
            name: spool?.filament?.name ?? '--',
            type: lane?.material ?? '--',
            weight: lane?.weight ?? 0,
        }
    }

    const getAfcExtruderObject = (extruder: string) => {
        const key_extruder = `AFC_extruder ${extruder}`
        return getPrinterObject(key_extruder) ?? {}
    }

    const getAfcExtruderSettings = (extruder: string) => {
        const key = `AFC_extruder ${extruder}`
        return getPrinterSettings(key) ?? {}
    }

    const getAfcBufferObject = (buffer: string) => {
        const key_buffer = `AFC_buffer ${buffer}`
        return getPrinterObject(key_buffer)
    }

    const getAfcHubObject = (hub: string) => {
        const key = `AFC_hub ${hub}`
        return getPrinterObject(key) ?? {}
    }

    const afcExists = computed(() => 'AFC' in printerStore)
    const afc = computed(() => (printerStore.AFC ?? {}) as Record<string, unknown>)

    const afcExtruders = computed<string[]>(() => (afc.value.extruders as string[]) ?? [])
    const afcHubs = computed<string[]>(() => (afc.value.hubs as string[]) ?? [])
    const afcUnits = computed<string[]>(() => (afc.value.units as string[]) ?? [])
    const afcLanes = computed<string[]>(() => (afc.value.lanes as string[]) ?? [])

    const afcLoadedSpools = computed(() => {
        if (afcLanes.value.length === 0) return []

        const spoolIds: { lane: string; spoolId: number }[] = []
        afcLanes.value.forEach((name) => {
            const lane = getAfcLaneObject(name) as { spool_id?: number }
            if (!lane || !lane.spool_id) return

            spoolIds.push({ lane: name, spoolId: lane.spool_id })
        })

        return spoolIds
    })

    const afcErrorState = computed(() => afc.value.error_state ?? false)

    const afcCurrentLane = computed(() => {
        const current = (afc.value.current_load ?? afc.value.current_lane ?? null) as string | null
        if (current === null) return null

        return getAfcLaneObject(current)
    })

    const afcCurrentBuffer = computed(() => {
        const name = (afcCurrentLane.value as { buffer?: string } | null)?.buffer ?? null
        if (name === null) return null

        return getAfcBufferObject(name)
    })

    const afcCurrentState = computed(() => afc.value.current_state ?? '')

    const afcMapList = computed<string[]>(() => {
        const lanes = (afc.value.lanes as string[]) ?? []
        const seen = new Set<string>()

        for (const laneName of lanes) {
            const lane = getAfcLaneObject(laneName) as { map?: string | string[] }
            if (!lane?.map) continue

            const tools = Array.isArray(lane.map) ? lane.map : [lane.map]
            for (const tool of tools) {
                if (tool) seen.add(tool)
            }
        }

        return [...seen].sort((a, b) => a.localeCompare(b))
    })

    const afcExistsSpoolman = computed(() => serverStore.components.includes('spoolman'))
    const afcShowFilamentName = computed<boolean>(() => guiStore.view.afc?.showFilamentName ?? false)
    const afcShowLaneInfinite = computed<boolean>(() => guiStore.view.afc?.showLaneInfinite ?? true)
    const afcShowUnitIcons = computed<boolean>(() => guiStore.view.afc?.showUnitIcons ?? true)
    const afcHiddenExtruders = computed<string[]>(() => guiStore.view.afc?.hiddenExtruders ?? [])
    const afcHiddenUnits = computed<string[]>(() => guiStore.view.afc?.hiddenUnits ?? [])
    const afcCurrentToolchange = computed(() => afc.value.current_toolchange ?? undefined)

    return {
        afcExists,
        afc,
        afcExtruders,
        afcHubs,
        afcUnits,
        afcLanes,
        afcLoadedSpools,
        afcErrorState,
        afcCurrentLane,
        afcCurrentBuffer,
        afcCurrentState,
        afcMapList,
        afcExistsSpoolman,
        afcShowFilamentName,
        afcShowLaneInfinite,
        afcShowUnitIcons,
        afcHiddenExtruders,
        afcHiddenUnits,
        afcCurrentToolchange,
        getPrinterObject,
        getPrinterSettings,
        getAfcLaneObject,
        getAfcLaneSettings,
        getAfcLaneFilament,
        getAfcExtruderObject,
        getAfcExtruderSettings,
        getAfcBufferObject,
        getAfcHubObject,
    }
}
