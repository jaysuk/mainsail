// Transitional RPC-result dispatcher.
//
// In Vuex, `webSocketClient.emit(method, params, { action: 'server/history/getList' })`
// stored a namespaced action *string* that the socket client dispatched the RPC
// result into. Pinia has no string-path dispatch, so this module maps those
// legacy action paths to concrete store calls.
//
// It is grown one entry per ported store batch. Once the component/emit call
// sites are migrated in Phase 3 to pass a callback instead of an action string,
// this resolver shrinks and is ultimately removed.
//
// The high-frequency streaming path (`notify_status_update` -> printer) does NOT
// go through here — it is routed directly by the socket store's `onMessage`.

type ActionPayload = Record<string, unknown>

export function dispatchStoreAction(path: string, payload: ActionPayload): void {
    switch (path) {
        // TODO(phase-2): add cases as server/printer/files/gui stores are ported,
        // e.g. case 'printer/getData': return usePrinterStore().getData(payload)
        default:
            window.console.debug(`[ws] no Pinia handler mapped for RPC-result action "${path}"`, payload)
    }
}
