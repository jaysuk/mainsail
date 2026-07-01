import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type { HeightmapState } from '@/store/gui/heightmap/types'
import { deepMerge } from '@/store/helpers'
import { useGuiStore } from '@/store/gui'

export const getDefaultState = (): HeightmapState => ({
    activecolorscheme: 'portland',
    defaultOrientation: 'rightFront',
})

export const useGuiHeightmapStore = defineStore('guiHeightmap', () => {
    const state = reactive<HeightmapState>(getDefaultState())

    const getActiveColorSchemeList = computed<string[]>(() => {
        switch (state.activecolorscheme.toLowerCase()) {
            case 'hsv':
                return ['#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000']
            case 'spring':
                return ['#ff00ff', '#ffff00']
            case 'hot':
                return ['#000000', '#ff0000', '#ffff00', '#ffffff']
            case 'grayscale':
                return ['#ffffff', '#000000']
            default:
                // Portland colorscheme is being used as default.
                return [
                    '#313695',
                    '#4575b4',
                    '#74add1',
                    '#abd9e9',
                    '#e0f3f8',
                    '#ffffbf',
                    '#fee090',
                    '#fdae61',
                    '#f46d43',
                    '#d73027',
                    '#a50026',
                ]
        }
    })

    const setData = (payload: Partial<HeightmapState>) => deepMerge(state, payload)

    const saveSetting = (payload: { name: string; value: unknown }) => {
        useGuiStore().saveSetting({ name: 'heightmap.' + payload.name, value: payload.value })
    }

    return {
        ...toRefs(state),
        getActiveColorSchemeList,
        setData,
        saveSetting,
    }
})
