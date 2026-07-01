import { computed } from 'vue'
import { usePrinterStore } from '@/store/printer'

/** Replaces the Vue 2 `MiscellaneousMixin` class component. */
export function useMiscellaneous() {
    const printerStore = usePrinterStore()

    const lights = computed(() => {
        const lights: { type: string; name: string }[] = []
        const supportedObjects = ['dotstar', 'led', 'neopixel', 'pca9533', 'pca9632']

        Object.keys(printerStore).forEach((key) => {
            const type = key.substring(0, key.indexOf(' '))
            const name = key.substring(key.indexOf(' ') + 1)
            if (!supportedObjects.includes(type) || name.startsWith('_')) return

            lights.push({ type, name })
        })

        return lights
    })

    return { lights }
}
