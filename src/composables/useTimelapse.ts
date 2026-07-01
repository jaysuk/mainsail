import { computed } from 'vue'
import { useServerTimelapseStore } from '@/store/server/timelapse'

/** Replaces the Vue 2 `TimelapseMixin` class component. */
export function useTimelapse() {
    const timelapseStore = useServerTimelapseStore()

    const variable_fps = computed<boolean>({
        get: () => timelapseStore.settings?.variable_fps ?? false,
        set: (newVal) => timelapseStore.saveSetting({ variable_fps: newVal }),
    })

    const variable_fps_min = computed<number>({
        get: () => timelapseStore.settings?.variable_fps_min ?? 5,
        set: (newVal) => timelapseStore.saveSetting({ variable_fps_min: newVal }),
    })

    const variable_fps_max = computed<number>({
        get: () => timelapseStore.settings?.variable_fps_max ?? 60,
        set: (newVal) => timelapseStore.saveSetting({ variable_fps_max: newVal }),
    })

    const targetlength = computed<number>({
        get: () => timelapseStore.settings?.targetlength ?? 10,
        set: (newVal) => timelapseStore.saveSetting({ targetlength: newVal }),
    })

    const output_framerate = computed<number>({
        get: () => timelapseStore.settings?.output_framerate ?? 30,
        set: (newVal) => timelapseStore.saveSetting({ output_framerate: newVal }),
    })

    const duplicatelastframe = computed<number>({
        get: () => timelapseStore.settings?.duplicatelastframe ?? 0,
        set: (newVal) => timelapseStore.saveSetting({ duplicatelastframe: newVal }),
    })

    const framesCount = computed(() => timelapseStore.lastFrame?.count ?? 0)

    const variableTargetFps = computed(() => {
        let targetFps = Math.floor(framesCount.value / targetlength.value)
        targetFps = Math.max(targetFps, variable_fps_min.value)
        targetFps = Math.min(targetFps, variable_fps_max.value)

        return targetFps
    })

    const estimatedVideoLength = computed(() => {
        let seconds = Math.round((framesCount.value + duplicatelastframe.value) / output_framerate.value)

        if (variable_fps.value) {
            seconds = Math.round((framesCount.value + duplicatelastframe.value) / variableTargetFps.value)
            if (seconds < targetlength.value) seconds = targetlength.value
        }

        return seconds > 60 ? Math.floor(seconds / 60) + 'm ' + (seconds - Math.floor(seconds / 60) * 60) + 's' : seconds + 's'
    })

    return {
        variable_fps,
        variable_fps_min,
        variable_fps_max,
        targetlength,
        output_framerate,
        duplicatelastframe,
        framesCount,
        estimatedVideoLength,
        variableTargetFps,
    }
}
