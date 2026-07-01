<template>
    <panel card-class="heightmap-map-panel" :title="t('Heightmap.Heightmap')" :icon="mdiGrid">
        <template #buttons>
            <v-btn
                icon
                tile
                class="d-none d-sm-flex"
                :disabled="printerIsPrinting"
                :color="homedAxes.includes('xyz') ? 'primary' : 'warning'"
                :loading="loadings.includes('homeAll')"
                :title="t('Heightmap.TitleHomeAll')"
                :ripple="true"
                @click="homePrinter">
                <v-icon>{{ mdiHome }}</v-icon>
            </v-btn>
            <v-btn v-if="is_active" variant="text" tile class="d-none d-sm-flex" :loading="loadings.includes('bedMeshClear')" :title="t('Heightmap.TitleClear')" @click="clearBedMesh">
                {{ t('Heightmap.Clear') }}
            </v-btn>
            <v-btn variant="text" tile class="d-none d-sm-flex" :loading="loadings.includes('bedMeshCalibrate')" :disabled="printerIsPrinting" :title="t('Heightmap.TitleCalibrate')" @click="calibrateDialog = true">
                {{ t('Heightmap.Calibrate') }}
            </v-btn>
        </template>
        <v-card-text class="d-sm-none text-center pb-0">
            <v-item-group tile class="v-btn-toggle" name="controllers">
                <v-btn
                    variant="text"
                    size="small"
                    class="px-2 minwidth-0"
                    :disabled="printerIsPrinting"
                    :color="homedAxes.includes('xyz') ? 'primary' : 'warning'"
                    :loading="loadings.includes('homeAll')"
                    :title="t('Heightmap.TitleHomeAll')"
                    @click="homePrinter">
                    <v-icon :color="homedAxes.includes('xyz') ? 'primary' : 'warning'" size="small">
                        {{ mdiHome }}
                    </v-icon>
                </v-btn>
                <v-btn v-if="bed_mesh" variant="text" size="small" class="px-2 minwidth-0" color="primary" :loading="loadings.includes('bedMeshClear')" :title="t('Heightmap.TitleClear')" @click="clearBedMesh">
                    {{ t('Heightmap.Clear') }}
                </v-btn>
                <v-btn
                    variant="text"
                    size="small"
                    class="px-2 minwidth-0"
                    color="primary"
                    :loading="loadings.includes('bedMeshCalibrate')"
                    :disabled="printerIsPrinting"
                    :title="t('Heightmap.TitleCalibrate')"
                    @click="calibrateDialog = true">
                    {{ t('Heightmap.Calibrate') }}
                </v-btn>
            </v-item-group>
        </v-card-text>
        <template v-if="!is_active">
            <v-card-text class="text-center py-3 font-italic">
                {{ t('Heightmap.NoBedMeshHasBeenLoadedYet') }}
            </v-card-text>
        </template>
        <template v-else>
            <v-card-text class="py-0 px-0">
                <v-row>
                    <v-col class="">
                        <heightmap-chart :show-probed="showProbed" :show-mesh="showMesh" :show-flat="showFlat" :wireframe="wireframe" :scale-gradient="scaleGradient" :scale-z-max="scaleZMax" />
                    </v-col>
                </v-row>
                <v-row>
                    <v-col class="col-12 col-sm-auto pt-0 pb-0 pl-lg-6 d-flex justify-center justify-sm-start">
                        <v-switch v-model="scaleGradient" :label="t('Heightmap.ScaleGradient')" class="mt-0 ml-5" />
                    </v-col>
                    <v-col class="d-flex justify-center pt-0 pb-6 pb-lg-3">
                        <v-checkbox v-model="showProbed" :label="t('Heightmap.Probed')" hide-details class="mx-3 mt-0" />
                        <v-checkbox v-model="showMesh" :label="t('Heightmap.Mesh')" hide-details class="mx-3 mt-0" />
                        <v-checkbox v-model="showFlat" :label="t('Heightmap.Flat')" hide-details class="mx-3 mt-0" />
                        <v-checkbox v-model="wireframe" :label="t('Heightmap.Wireframe')" hide-details class="mx-3 mt-0" />
                    </v-col>
                </v-row>
            </v-card-text>
            <v-divider />
            <v-card-text class="pt-0 pb-3">
                <v-row>
                    <v-col>
                        <v-slider v-model="scaleZMax" :label="t('Heightmap.ScaleZMax')" :min="heightmapRangeLimit[0]" :max="heightmapRangeLimit[1]" :step="0.1" ticks="always" class="mt-4" hide-details />
                    </v-col>
                </v-row>
            </v-card-text>
        </template>
        <heightmap-calibrate-mesh-dialog v-model="calibrateDialog" />
    </panel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiGrid, mdiHome } from '@mdi/js'
import Panel from '@/components/ui/Panel.vue'
import HeightmapCalibrateMeshDialog from '@/components/dialogs/HeightmapCalibrateMeshDialog.vue'
import HeightmapChart from '@/components/charts/HeightmapChart.vue'
import { useBase } from '@/composables/useBase'
import { useControl } from '@/composables/useControl'
import { useBedmesh } from '@/composables/useBedmesh'
import { useGuiStore } from '@/store/gui'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const { printerIsPrinting, loadings } = useBase()
const { homedAxes } = useControl()
const { bed_mesh, is_active, min, max } = useBedmesh()
const guiStore = useGuiStore()

const calibrateDialog = ref(false)

const showProbed = computed<boolean>({
    get: () => guiStore.view.heightmap.probed ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.heightmap.probed', value: newVal }),
})

const showMesh = computed<boolean>({
    get: () => guiStore.view.heightmap.mesh ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.heightmap.mesh', value: newVal }),
})

const showFlat = computed<boolean>({
    get: () => guiStore.view.heightmap.flat ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.heightmap.flat', value: newVal }),
})

const wireframe = computed<boolean>({
    get: () => guiStore.view.heightmap.wireframe ?? true,
    set: (newVal) => guiStore.saveSetting({ name: 'view.heightmap.wireframe', value: newVal }),
})

const scaleGradient = computed<boolean>({
    get: () => guiStore.view.heightmap.scaleGradient ?? false,
    set: (newVal) => guiStore.saveSetting({ name: 'view.heightmap.scaleGradient', value: newVal }),
})

const scaleZMax = computed<number>({
    get: () => guiStore.view.heightmap.scaleZMax ?? 0.5,
    set: (newVal) => guiStore.saveSetting({ name: 'view.heightmap.scaleZMax', value: newVal }),
})

const heightmapRangeLimit = computed<number[]>(() => {
    const minRange = Math.round(Math.max(Math.abs(min.value), Math.abs(max.value)) * 10) / 10
    const maxRange = Math.max(minRange, 1)

    return [minRange, maxRange]
})

function homePrinter(): void {
    const gcode = 'G28'

    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode }, { loading: 'homeAll' })
}

function clearBedMesh(): void {
    const gcode = 'BED_MESH_CLEAR'

    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode }, { loading: 'bedMeshClear' })
}
</script>
