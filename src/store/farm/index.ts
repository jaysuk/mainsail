import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'
import { useFarmPrinterStore, getDefaultState as getFarmPrinterDefaultState } from '@/store/farm/printer'

// Vuex tracked registered remote printers implicitly via dynamic module
// registration (`this.hasModule(['farm', id])`); this registry replaces that
// with an explicit id set, since Pinia's dynamic-id stores are always
// instantiable on demand (calling useFarmPrinterStore(id) for an
// unregistered id would otherwise silently spin up a blank store instead of
// reporting "doesn't exist").
export const useFarmStore = defineStore('farm', () => {
    const registeredIds = reactive(new Set<string>())

    const countPrinters = computed(() => registeredIds.size)

    const getPrinters = computed(() => {
        const printers: Record<string, ReturnType<typeof useFarmPrinterStore>> = {}
        registeredIds.forEach((id) => {
            printers[id] = useFarmPrinterStore(id)
        })
        return printers
    })

    const existsPrinter = (namespace: string) => registeredIds.has(namespace)

    const getPrinterName = (namespace: string) => (existsPrinter(namespace) ? useFarmPrinterStore(namespace).getPrinterName : undefined)

    const getPrinterSocketState = (namespace: string) =>
        existsPrinter(namespace) ? useFarmPrinterStore(namespace).getPrinterSocketState : getFarmPrinterDefaultState().socket

    const registerPrinter = (payload: { id: string; hostname: string; port: number; path: string; name?: string | null; settings?: Record<string, unknown> }) => {
        if (registeredIds.has(payload.id)) return

        registeredIds.add(payload.id)
        const printerStore = useFarmPrinterStore(payload.id)

        printerStore.setSocketData({ ...payload, _namespace: payload.id })
        if ('settings' in payload && payload.settings) printerStore.setSettings(payload.settings)
        printerStore.connect()
    }

    const updatePrinter = (payload: { id: string; values: { hostname?: string | null; port?: number | null; path?: string | null } }) => {
        if (!registeredIds.has(payload.id)) return

        const printerStore = useFarmPrinterStore(payload.id)
        printerStore.setSocketData({
            hostname: payload.values.hostname ?? '',
            port: payload.values.port ?? 7125,
            path: payload.values.path ?? '',
            isConnecting: true,
        })
        printerStore.reconnect()
    }

    const unregisterPrinter = (id: string) => {
        if (!registeredIds.has(id)) return

        const printerStore = useFarmPrinterStore(id)
        printerStore.socket.instance?.close()
        registeredIds.delete(id)
        printerStore.$dispose()
    }

    return {
        countPrinters,
        getPrinters,
        existsPrinter,
        getPrinterName,
        getPrinterSocketState,
        registerPrinter,
        updatePrinter,
        unregisterPrinter,
    }
})
