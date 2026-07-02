import { initableServerComponents } from '@/store/variables'
import { useSocketStore } from '@/store/socket'
import { useServerStore } from '@/store/server'
import { dispatchStoreAction } from '@/store/dispatch'
import type { RPCMethods, RPCParams, RPCResult } from '@/types/moonraker'

export class WebSocketClient {
    url = ''
    instance: WebSocket | null = null
    maxReconnects = 5
    reconnectInterval = 1000
    reconnects = 0
    keepAliveTimeout = 1000
    messageId: number = 0
    timerId: number | null = null
    waits: Wait[] = []
    heartbeatTimer: number | null = null

    constructor(options: WebSocketClientOptions = {}) {
        this.maxReconnects = options.maxReconnects || 5
        this.reconnectInterval = options.reconnectInterval || 1000
    }

    setUrl(url: string): void {
        this.url = url
    }

    handleMessage(data: SocketIncomingMessage): void {
        const wait = typeof data.id === 'number' ? this.getWaitById(data.id) : null

        // reject promise if it exists
        if (data.error && wait?.reject) {
            wait.reject(data.error)
            this.removeWaitById(wait.id)
            return
        }

        // report error messages
        if (data.error?.message) {
            // only report errors, if not disconnected and no init component
            if (data.error?.message !== 'Klippy Disconnected') {
                window.console.error(`Response Error: ${data.error.message} (${wait?.action ?? 'no action'})`)
            }

            if (wait) {
                const socketStore = useSocketStore()
                const modulename = wait.action?.split('/')[1] ?? null

                if (
                    modulename &&
                    wait.action?.startsWith('server/') &&
                    initableServerComponents.includes(modulename) &&
                    socketStore.initializationList.length
                ) {
                    const component = wait.action.replace('server/', '').split('/')[0]
                    window.console.error(`init server component ${component} failed`)
                    useServerStore().addFailedInitComponent(component)
                    socketStore.removeInitComponent(`server/${component}/`)
                }

                this.removeWaitById(wait.id)
            }

            return
        }

        // pass it to the socket store message router, if no wait exists
        if (!wait) {
            useSocketStore().onMessage(data)
            return
        }

        // resolve promise if it exists
        if (wait.resolve) wait.resolve(data.result ?? {})

        // pass result to the registered store action
        if (wait.action) {
            let result = data.result
            if (result === 'ok') result = { result }
            if (typeof result === 'string') result = { result }

            const preload: Record<string, unknown> = {}
            if (wait.actionPayload) Object.assign(preload, wait.actionPayload)
            Object.assign(preload, { requestParams: wait.params })
            Object.assign(preload, result as Record<string, unknown>)
            dispatchStoreAction(wait.action, preload)
        }

        this.removeWaitById(wait.id)
    }

    async connect() {
        useSocketStore().setData({
            isConnecting: true,
        })

        this.instance?.close()
        this.instance = new WebSocket(this.url)

        this.instance.onopen = () => {
            this.reconnects = 0
            useSocketStore().onOpen()
        }

        this.instance.onclose = (e) => {
            if (e.wasClean || this.reconnects >= this.maxReconnects) {
                useSocketStore().onClose(e)
                return
            }

            this.reconnects++
            setTimeout(() => {
                this.connect()
            }, this.reconnectInterval)
        }

        this.instance.onerror = () => {
            this.instance?.close()
        }

        this.instance.onmessage = (msg) => {
            // websocket is alive
            this.heartbeat()

            const data = JSON.parse(msg.data)
            if (Array.isArray(data)) {
                for (const message of data) {
                    this.handleMessage(message)
                }

                return
            }

            this.handleMessage(data)
        }
    }

    close(): void {
        this.instance?.close()
    }

    getWaitById(id: number): Wait | null {
        return this.waits.find((wait: Wait) => wait.id === id) ?? null
    }

    removeWaitById(id: number | null): void {
        const index = this.waits.findIndex((wait: Wait) => wait.id === id)
        if (index !== -1) {
            const wait = this.waits[index]
            if (wait.loading) useSocketStore().removeLoading(wait.loading)
            this.waits.splice(index, 1)
        }
    }

    emit(method: string, params: Params, options: emitOptions = {}): void {
        if (this.instance?.readyState !== WebSocket.OPEN) return

        const id = this.messageId++
        this.waits.push({
            id: id,
            params: params,
            action: options.action ?? null,
            actionPayload: options.actionPayload ?? {},
            loading: options.loading ?? null,
        })

        if (options.loading) useSocketStore().addLoading(options.loading)

        this.instance?.send(
            JSON.stringify({
                jsonrpc: '2.0',
                method,
                params,
                id,
            })
        )
    }

    emitAndWait<M extends RPCMethods>(
        method: M,
        params?: RPCParams<M>,
        options: emitOptions = {}
    ): Promise<RPCResult<M>> {
        return new Promise<RPCResult<M>>((resolve, reject) => {
            if (this.instance?.readyState !== WebSocket.OPEN) reject()

            const id = this.messageId++
            this.waits.push({
                id: id,
                params: params,
                action: options.action ?? null,
                actionPayload: options.actionPayload ?? {},
                loading: options.loading ?? null,
                resolve: resolve as (value: unknown) => void,
                reject,
            })

            if (options.loading) useSocketStore().addLoading(options.loading)

            this.instance?.send(
                JSON.stringify({
                    jsonrpc: '2.0',
                    method,
                    params,
                    id,
                })
            )
        })
    }

    emitBatch(messages: BatchMessage[]): void {
        if (messages.length === 0) return
        if (this.instance?.readyState !== WebSocket.OPEN) return

        const body = []
        for (const { method, params, emitOptions = {} } of messages) {
            const id = this.messageId++
            this.waits.push({
                id: id,
                params: params,
                action: emitOptions.action ?? null,
                actionPayload: emitOptions.actionPayload ?? {},
                loading: emitOptions.loading ?? null,
            })

            if (emitOptions.loading) useSocketStore().addLoading(emitOptions.loading)
            body.push({
                jsonrpc: '2.0',
                method,
                params,
                id,
            })
        }

        this.instance.send(JSON.stringify(body))
    }

    heartbeat(): void {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)

        this.heartbeatTimer = window.setTimeout(() => {
            if (this.instance?.readyState !== WebSocket.OPEN) return

            this.close()
            useSocketStore().onClose()
        }, 10000)
    }
}

// Singleton instance. Replaces the Vue 2 `Vue.prototype.$socket` plugin; stores
// and components import this directly. The URL is set from config.json during
// app bootstrap (see main.ts) before `connect()` is called.
export const webSocketClient = new WebSocketClient()

export interface WebSocketClientOptions {
    maxReconnects?: number
    reconnectInterval?: number
}

export interface BatchMessage {
    method: string
    params: Params
    emitOptions: emitOptions
}

interface SocketError {
    code?: number
    message?: string
    [key: string]: unknown
}

interface SocketIncomingMessage {
    id?: number
    result?: unknown
    error?: SocketError
    method?: string
    params?: unknown[]
    [key: string]: unknown
}

export interface Wait {
    id: number
    params: unknown
    action?: string | null
    actionPayload?: Params
    loading?: string | null
    resolve?: (value: unknown) => void
    reject?: (reason?: unknown) => void
}

type Params = object

interface emitOptions {
    action?: string | null
    actionPayload?: Params
    loading?: string | null
}
