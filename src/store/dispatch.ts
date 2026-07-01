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

import { useServerStore } from '@/store/server'
import { useServerPowerStore } from '@/store/server/power'
import { useServerSensorStore } from '@/store/server/sensor'
import { useServerAnnouncementsStore } from '@/store/server/announcements'
import { useServerJobQueueStore } from '@/store/server/jobQueue'
import { useServerUpdateManagerStore } from '@/store/server/updateManager'
import { useServerHistoryStore } from '@/store/server/history'
import { useServerTimelapseStore } from '@/store/server/timelapse'
import { useServerSpoolmanStore } from '@/store/server/spoolman'

type ActionPayload = Record<string, unknown>

export function dispatchStoreAction(path: string, payload: ActionPayload): void {
    switch (path) {
        // server
        case 'server/initServerInfo':
            return useServerStore().initServerInfo(payload)
        case 'server/initServerConfig':
            return useServerStore().initServerConfig(payload as never)
        case 'server/initSystemInfo':
            return useServerStore().initSystemInfo(payload as never)
        case 'server/initProcStats':
            return useServerStore().initProcStats(payload as never)
        case 'server/checkDatabases':
            return useServerStore().checkDatabases(payload as never)
        case 'server/checkKlippyConnected':
            return useServerStore().checkKlippyConnected(payload as never)
        case 'server/checkKlippyState':
            return useServerStore().checkKlippyState(payload as never)
        case 'server/getGcodeStore':
            return useServerStore().getGcodeStore(payload as never)

        // server/power
        case 'server/power/getDevices':
            return useServerPowerStore().getDevicesResponse(payload)
        case 'server/power/getStatus':
            return useServerPowerStore().getStatus(payload)
        case 'server/power/responseToggle':
            return useServerPowerStore().responseToggle(payload)

        // server/sensor
        case 'server/sensor/getSensors':
            return useServerSensorStore().getSensorsResponse(payload as never)

        // server/announcements
        case 'server/announcements/getList':
            return useServerAnnouncementsStore().getList(payload as never)

        // server/jobQueue
        case 'server/jobQueue/getStatus':
            return useServerJobQueueStore().getStatus(payload)
        case 'server/jobQueue/start':
            return useServerJobQueueStore().start()

        // server/updateManager
        case 'server/updateManager/onUpdateStatus':
            return useServerUpdateManagerStore().onUpdateStatus(payload as never)

        // server/history
        case 'server/history/getHistory':
            return useServerHistoryStore().getHistory(payload)
        case 'server/history/getTotals':
            return useServerHistoryStore().getTotals(payload as never)
        case 'server/history/initHistoryNotes':
            return useServerHistoryStore().initHistoryNotes(payload as never)

        // server/timelapse
        case 'server/timelapse/initSettings':
            return useServerTimelapseStore().initSettings(payload)
        case 'server/timelapse/initLastFrameinfo':
            return useServerTimelapseStore().initLastFrameinfo(payload as never)

        // server/spoolman
        case 'server/spoolman/getActiveSpoolId':
            return useServerSpoolmanStore().getActiveSpoolId(payload as never)
        case 'server/spoolman/getActiveSpool':
            return useServerSpoolmanStore().getActiveSpool(payload)
        case 'server/spoolman/getHealth':
            return useServerSpoolmanStore().getHealth(payload)
        case 'server/spoolman/getInfo':
            return useServerSpoolmanStore().getInfo(payload)
        case 'server/spoolman/getVendors':
            return useServerSpoolmanStore().getVendors(payload)
        case 'server/spoolman/getSpools':
            return useServerSpoolmanStore().getSpools(payload)

        // TODO(phase-2): add cases as printer, files and gui stores are ported.
        default:
            window.console.debug(`[ws] no Pinia handler mapped for RPC-result action "${path}"`, payload)
    }
}
