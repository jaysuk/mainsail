import { computed } from 'vue'
import { usePrinterStore } from '@/store/printer'

/** Replaces the Vue 2 `BedmeshMixin` class component. */
export function useBedmesh() {
    const printerStore = usePrinterStore()

    const bed_mesh = computed(() => printerStore.bed_mesh ?? {})
    const profiles = computed(() => bed_mesh.value.profiles ?? {})
    const mesh_min = computed<number[]>(() => bed_mesh.value.mesh_min ?? [0, 0])
    const mesh_max = computed<number[]>(() => bed_mesh.value.mesh_max ?? [0, 0])
    const probed_matrix = computed<number[][]>(() => bed_mesh.value.probed_matrix ?? [])

    const points = computed<number[]>(() => {
        const output: number[] = []

        for (let i = 0; i < probed_matrix.value.length; i++) {
            for (let j = 0; j < probed_matrix.value[i].length; j++) {
                output.push(probed_matrix.value[i][j])
            }
        }

        return output
    })

    const min = computed(() => Math.min(...points.value))
    const max = computed(() => Math.max(...points.value))
    const variance = computed(() => Math.abs(min.value - max.value).toFixed(3))

    const is_active = computed(() => {
        if (bed_mesh.value.profile_name !== '') return true

        return mesh_min.value[0] !== 0 || mesh_min.value[1] !== 0 || mesh_max.value[0] !== 0 || mesh_max.value[1] !== 0
    })

    const name = computed(() => (bed_mesh.value.profile_name !== '' ? bed_mesh.value.profile_name : 'Unknown'))

    return { bed_mesh, profiles, mesh_min, mesh_max, min, max, variance, is_active, name, probed_matrix, points }
}
