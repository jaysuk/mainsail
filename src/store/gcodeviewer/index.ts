import { defineStore } from 'pinia'
import { reactive, toRefs, markRaw } from 'vue'
import type { GcodeviewerState, GCodeViewerInstance } from '@/store/gcodeviewer/types'
import { resetState } from '@/store/helpers'

export const getDefaultState = (): GcodeviewerState => ({
    viewerBackup: null,
    canvasBackup: null,
    loadedFileBackup: null,
})

export const useGcodeviewerStore = defineStore('gcodeviewer', () => {
    const state = reactive<GcodeviewerState>(getDefaultState())

    const reset = () => resetState(state, getDefaultState)

    const setViewerBackup = (backup: GCodeViewerInstance | null) => {
        // the viewer object is large and quite slow to proxy, so keep it raw
        state.viewerBackup = backup ? markRaw(backup) : null
    }

    const setCanvasBackup = (backup: HTMLCanvasElement | null) => {
        state.canvasBackup = backup
    }

    const setLoadedFileBackup = (backup: string | null) => {
        state.loadedFileBackup = backup
    }

    return {
        ...toRefs(state),
        reset,
        setViewerBackup,
        setCanvasBackup,
        setLoadedFileBackup,
    }
})
