import { computed } from 'vue'
import { parseNumber } from '@/plugins/helpers'
import { usePrinterStore } from '@/store/printer'
import { useGuiStore } from '@/store/gui'

/** Replaces the Vue 2 `ExtruderMixin` class component. */
export function useExtruder() {
    const printerStore = usePrinterStore()
    const guiStore = useGuiStore()

    const extruders = computed(() => printerStore.getExtruders)
    const activeExtruder = computed<string>(() => printerStore.toolhead?.extruder)
    const activeExtruderSettings = computed(() => printerStore.configfile?.settings?.[activeExtruder.value])

    const filamentDiameter = computed(() => parseNumber(activeExtruderSettings.value?.filament_diameter, 1.75))
    const nozzleDiameter = computed(() => parseNumber(activeExtruderSettings.value?.nozzle_diameter, 0.4))

    const feedamount = computed(() => parseFloat(String(guiStore.control.extruder.feedamount)))
    const feedrate = computed(() => parseFloat(String(guiStore.control.extruder.feedrate)))

    const extrudeFactor = computed(() => printerStore.gcode_move?.extrude_factor ?? 1)
    const extrudePossible = computed<boolean>(() => printerStore.getExtrudePossible)
    const minExtrudeTemp = computed(() => parseNumber(activeExtruderSettings.value?.min_extrude_temp, 170))

    return {
        extruders,
        activeExtruder,
        activeExtruderSettings,
        filamentDiameter,
        nozzleDiameter,
        feedamount,
        feedrate,
        extrudeFactor,
        extrudePossible,
        minExtrudeTemp,
    }
}
