import { computed } from 'vue'
import { useGuiStore } from '@/store/gui'
import { useServerStore } from '@/store/server'

/** Replaces the Vue 2 `ServiceMixins` class component. */
export function useServices() {
    const guiStore = useGuiStore()
    const serverStore = useServerStore()

    const hideOtherInstances = computed(() => guiStore.uiSettings.hideOtherInstances ?? false)
    const instance_ids = computed(() => serverStore.system_info?.instance_ids ?? { klipper: '', moonraker: '' })
    const klipperInstance = computed(() => instance_ids.value.klipper ?? '')
    const moonrakerInstance = computed(() => instance_ids.value.moonraker ?? '')

    return { hideOtherInstances, instance_ids, klipperInstance, moonrakerInstance }
}
