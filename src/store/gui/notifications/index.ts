import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import { detect } from 'detect-browser'
import semver from 'semver'
import { sha256 } from 'js-sha256'
import type {
    GuiNotificationState,
    GuiNotificationStateDismissEntry,
    GuiNotificationStateEntry,
} from '@/store/gui/notifications/types'
import type { ServerAnnouncementsStateEntry } from '@/store/server/announcements/types'
import type { PrinterStateKlipperConfigWarning } from '@/store/printer/types'
import i18n from '@/plugins/i18n'
import { minBrowserVersions } from '@/store/variables'
import { resetState, deepMerge } from '@/store/helpers'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useServerStore } from '@/store/server'
import { useServerAnnouncementsStore } from '@/store/server/announcements'
import { usePrinterStore } from '@/store/printer'
import { useGuiMaintenanceStore } from '@/store/gui/maintenance'
import { useRootStore } from '@/store'

const t = i18n.global.t

export const getDefaultState = (): GuiNotificationState => ({
    dismiss: [],
})

export const useGuiNotificationsStore = defineStore('guiNotifications', () => {
    const state = reactive<GuiNotificationState>(getDefaultState())

    const reset = () => resetState(state, getDefaultState)

    const setData = (payload: Partial<GuiNotificationState>) => deepMerge(state, payload)

    const upload = () => {
        webSocketClient.emit('server.database.post_item', {
            namespace: 'mainsail',
            key: 'notifications.dismiss',
            value: state.dismiss,
        })
    }

    const getDismiss = computed<GuiNotificationStateDismissEntry[]>(() => {
        const currentTime = new Date()
        const systemBootAt = useServerStore().system_boot_at ?? new Date()

        return state.dismiss.filter((dismiss) => {
            if (dismiss.type === 'reboot') return systemBootAt.getTime() < dismiss.date
            if (dismiss.type === 'time') return currentTime.getTime() < dismiss.date

            return true
        })
    })

    const getDismissByCategory = (category: string) => getDismiss.value.filter((dismiss) => dismiss.category === category)

    const storeDismiss = (payload: { entry_id: string; category: string; type: string; time: number | null }) => {
        let date = new Date().getTime()
        if (payload.type === 'time') {
            date = new Date().getTime() + (payload.time ?? 0) * 1000
        }

        const newDismiss: GuiNotificationStateDismissEntry = {
            id: payload.entry_id,
            category: payload.category,
            type: payload.type,
            date,
        }

        const existingIndex = state.dismiss.findIndex(
            (dismiss) =>
                dismiss.id === newDismiss.id && dismiss.category === newDismiss.category && dismiss.type === newDismiss.type
        )
        if (existingIndex !== -1) state.dismiss.splice(existingIndex)

        state.dismiss.push(newDismiss)
        upload()
    }

    const close = (payload: { id: string }) => {
        const posFirstSlash = payload.id.indexOf('/')
        if (posFirstSlash === -1) return

        const category = payload.id.slice(0, posFirstSlash)
        const id = payload.id.slice(posFirstSlash + 1)

        if (category === 'announcement') {
            useServerAnnouncementsStore().close({ entry_id: id })
            return
        }

        storeDismiss({ entry_id: id, category, type: 'ever', time: null })
    }

    const dismiss = (payload: { id: string; type: string; time: number | null }) => {
        const posFirstSlash = payload.id.indexOf('/')
        if (posFirstSlash === -1) return

        const category = payload.id.slice(0, posFirstSlash)
        const id = payload.id.slice(posFirstSlash + 1)

        if (category === 'announcement') {
            useServerAnnouncementsStore().dismiss({ entry_id: id, time: payload.time })
            return
        }

        storeDismiss({ entry_id: id, category, type: payload.type, time: payload.time })
    }

    const getNotificationsAnnouncements = computed<GuiNotificationStateEntry[]>(() => {
        const notifications: GuiNotificationStateEntry[] = []

        const announcements = useServerAnnouncementsStore().getAnnouncements
        announcements.forEach((entry: ServerAnnouncementsStateEntry) => {
            notifications.push({
                id: 'announcement/' + entry.entry_id,
                priority: entry.priority,
                title: entry.title,
                description: entry.description,
                date: entry.date,
                dismissed: entry.dismissed,
                url: entry.url,
            } as GuiNotificationStateEntry)
        })

        return notifications
    })

    const getNotificationsFlags = computed<GuiNotificationStateEntry[]>(() => {
        const notifications: GuiNotificationStateEntry[] = []

        let flags = useServerStore().getThrottledStateFlags
        if (flags.length) {
            const date = useServerStore().system_boot_at ?? new Date()

            const flagDismisses = getDismissByCategory('flag').map((d) => d.id)
            flags = flags.filter((flag: string) => !flagDismisses.includes(flag))

            flags.forEach((flag: string) => {
                notifications.push({
                    id: 'flag/' + flag,
                    priority: flag.startsWith('Previously') ? 'high' : 'critical',
                    title: t(`App.ThrottledStates.Title${flag}`),
                    description: t(`App.ThrottledStates.Description${flag}`),
                    date,
                    dismissed: false,
                } as GuiNotificationStateEntry)
            })
        }

        return notifications
    })

    const getNotificationsDependencies = computed<GuiNotificationStateEntry[]>(() => {
        const notifications: GuiNotificationStateEntry[] = []

        const dependencies = useRootStore().getDependencies
        if (dependencies.length) {
            const date = useServerStore().system_boot_at ?? new Date()

            const flagDismisses = getDismissByCategory('dependency').map((d) => d.id)

            dependencies
                .filter((dependency) => !flagDismisses.includes(`${dependency.serviceName}/${dependency.neededVersion}`))
                .forEach((dependency) => {
                    notifications.push({
                        id: `dependency/${dependency.serviceName}/${dependency.neededVersion}`,
                        priority: 'high',
                        title: t('App.Notifications.DependencyName', { name: dependency.serviceName }),
                        description: t('App.Notifications.DependencyDescription', {
                            name: dependency.serviceName,
                            installedVersion: dependency.installedVersion,
                            neededVersion: dependency.neededVersion,
                        }),
                        date,
                        dismissed: false,
                    } as GuiNotificationStateEntry)
                })
        }

        return notifications
    })

    const getNotificationsMoonrakerWarnings = computed<GuiNotificationStateEntry[]>(() => {
        const notifications: GuiNotificationStateEntry[] = []

        let warnings = useServerStore().warnings ?? []
        if (warnings.length) {
            const date = useServerStore().system_boot_at ?? new Date()

            const warningsDismisses = getDismissByCategory('moonrakerWarning').map((d) => d.id)
            warnings = warnings.filter((warning: string) => !warningsDismisses.includes(sha256(warning)))

            warnings.forEach((warning: string) => {
                let description = warning

                if (warning.startsWith('Unparsed config option')) {
                    const warningRegExp = RegExp(/'(?<option>.+): (?<value>.+)'.+\[(?<section>.+)\]/)
                    const output = warningRegExp.exec(warning)?.groups ?? { option: '', section: '', value: '' }
                    description = t('App.Notifications.MoonrakerWarnings.UnparsedConfigOption', output)
                } else if (warning.startsWith('Unparsed config section')) {
                    const warningRegExp = RegExp(/\[(?<section>.+)\]/)
                    const output = warningRegExp.exec(warning)?.groups ?? { section: '' }
                    description = t('App.Notifications.MoonrakerWarnings.UnparsedConfigSection', output)
                }

                notifications.push({
                    id: `moonrakerWarning/${sha256(warning)}`,
                    priority: 'high',
                    title: t('App.Notifications.MoonrakerWarnings.MoonrakerWarning'),
                    description: description,
                    date,
                    dismissed: false,
                } as GuiNotificationStateEntry)
            })
        }

        return notifications
    })

    const getNotificationsMoonrakerFailedComponents = computed<GuiNotificationStateEntry[]>(() => {
        const notifications: GuiNotificationStateEntry[] = []

        let failedCompontents = useServerStore().failed_components ?? []
        if (failedCompontents.length) {
            const date = useServerStore().system_boot_at ?? new Date()

            const flagDismisses = getDismissByCategory('moonrakerFailedComponent').map((d) => d.id)
            failedCompontents = failedCompontents.filter((component: string) => !flagDismisses.includes(component))

            failedCompontents.forEach((component: string) => {
                notifications.push({
                    id: `moonrakerFailedComponent/${component}`,
                    priority: 'high',
                    title: t('App.Notifications.MoonrakerWarnings.MoonrakerComponent', { component }),
                    description: t('App.Notifications.MoonrakerWarnings.MoonrakerFailedComponentDescription', {
                        component,
                    }),
                    date,
                    dismissed: false,
                } as GuiNotificationStateEntry)
            })
        }

        return notifications
    })

    const getNotificationsMoonrakerFailedInitComponents = computed<GuiNotificationStateEntry[]>(() => {
        const notifications: GuiNotificationStateEntry[] = []

        let failedInitCompontents = useServerStore().failed_init_components ?? []
        if (failedInitCompontents.length) {
            const date = useServerStore().system_boot_at ?? new Date()

            const flagDismisses = getDismissByCategory('moonrakerFailedInitComponent').map((d) => d.id)
            failedInitCompontents = failedInitCompontents.filter((component: string) => !flagDismisses.includes(component))

            failedInitCompontents.forEach((component: string) => {
                notifications.push({
                    id: `moonrakerFailedInitComponent/${component}`,
                    priority: 'high',
                    title: t('App.Notifications.MoonrakerWarnings.MoonrakerInitComponent', { component }),
                    description: t('App.Notifications.MoonrakerWarnings.MoonrakerFailedInitComponentDescription', {
                        component,
                    }),
                    date,
                    dismissed: false,
                } as GuiNotificationStateEntry)
            })
        }

        return notifications
    })

    const getNotificationsKlipperWarnings = computed<GuiNotificationStateEntry[]>(() => {
        const notifications: GuiNotificationStateEntry[] = []

        let warnings = (usePrinterStore().configfile?.warnings ?? []) as PrinterStateKlipperConfigWarning[]
        if (warnings.length) {
            const date = useServerStore().system_boot_at ?? new Date()

            const warningsDismisses = getDismissByCategory('klipperWarning').map((d) => d.id)
            warnings = warnings.filter((warning) => !warningsDismisses.includes(sha256(warning.message)))

            warnings.forEach((warning) => {
                let title = t('App.Notifications.KlipperWarnings.KlipperWarning')
                let description = warning.message

                if (warning.type === 'deprecated_value') {
                    title = t('App.Notifications.KlipperWarnings.DeprecatedValueHeadline')
                    description = t('App.Notifications.KlipperWarnings.DeprecatedValue', warning as unknown as Record<string, unknown>)
                } else if (warning.type === 'deprecated_option') {
                    title = t('App.Notifications.KlipperWarnings.DeprecatedOptionHeadline')
                    description = t('App.Notifications.KlipperWarnings.DeprecatedOption', warning as unknown as Record<string, unknown>)
                } else if (warning.type === 'runtime_warning') {
                    title = t('App.Notifications.KlipperWarnings.KlipperRuntimeWarning')
                }

                let url = 'https://docs.mainsail.xyz/faq/klipper_warnings/' + warning.type
                if (warning.type === 'deprecated_option' && warning.option.startsWith('default_parameter'))
                    url += '#default_parameter'
                else if (warning.type === 'deprecated_option') url += '#' + warning.option
                else if (warning.type === 'deprecated_value') url += '#' + warning.value

                notifications.push({
                    id: `klipperWarning/${sha256(warning.message)}`,
                    priority: 'high',
                    title: title,
                    description: description,
                    date,
                    url,
                    dismissed: false,
                } as GuiNotificationStateEntry)
            })
        }

        return notifications
    })

    const getNotificationsBrowserWarnings = computed<GuiNotificationStateEntry[]>(() => {
        const notifications: GuiNotificationStateEntry[] = []

        const browser = detect()
        const date = useServerStore().system_boot_at ?? new Date()

        if (browser === null) return notifications

        window.console.debug(`Browser: ${browser.name} ${browser.version}, OS: ${browser.os}`)

        const minBrowserVersion = minBrowserVersions.find((entry) => entry.name.toLowerCase() === browser.name.toLowerCase())

        if (minBrowserVersion === undefined) return notifications

        if (
            semver.valid(browser.version) &&
            semver.valid(minBrowserVersion.version) &&
            semver.gt(minBrowserVersion.version, browser.version ?? '0.0.0')
        ) {
            notifications.push({
                id: `browserWarning/${minBrowserVersion.name}/${minBrowserVersion.version}`,
                priority: 'critical',
                title: t('App.Notifications.BrowserWarnings.Headline'),
                description: t('App.Notifications.BrowserWarnings.Description', {
                    name: minBrowserVersion.name,
                    version: browser.version,
                    minVersion: minBrowserVersion.version,
                }),
                date,
                dismissed: false,
            } as GuiNotificationStateEntry)
        }

        return notifications
    })

    const getNotificationsOverdueMaintenance = computed<GuiNotificationStateEntry[]>(() => {
        const notifications: GuiNotificationStateEntry[] = []
        let entries = useGuiMaintenanceStore().getOverdueEntries
        if (entries.length === 0) return []

        const date = useServerStore().system_boot_at ?? new Date()

        const remindersDismisses = getDismissByCategory('maintenance').map((d) => d.id)
        entries = entries.filter((entry) => !remindersDismisses.includes(entry.id as string))

        entries.forEach((entry) => {
            notifications.push({
                id: `maintenance/${entry.id}`,
                priority: 'high',
                title: t('App.Notifications.MaintenanceReminder'),
                description: t('App.Notifications.MaintenanceReminderText', { name: entry.name }),
                date,
                dismissed: false,
            } as GuiNotificationStateEntry)
        })

        return notifications
    })

    const getNotificationsOverheatDrivers = computed<GuiNotificationStateEntry[]>(() => {
        const notifications: GuiNotificationStateEntry[] = []
        const printerStore = usePrinterStore()
        const date = useServerStore().system_boot_at ?? new Date()

        Object.keys(printerStore)
            .filter((key) => key.startsWith('tmc'))
            .forEach((key) => {
                const printerObject = printerStore[key] as { drv_status?: { ot?: number; otpw?: number } }
                const name = key.split(' ')[1]

                if ((printerObject.drv_status?.ot ?? null) === 1) {
                    notifications.push({
                        id: `tmcwarning/${key}-ot`,
                        priority: 'critical',
                        title: t('App.Notifications.TmcOtFlag'),
                        description: t('App.Notifications.TmcOtFlagText', { name }),
                        date,
                        dismissed: false,
                        url: 'https://www.klipper3d.org/TMC_Drivers.html#tmc-reports-error-ot1overtemperror',
                    } as GuiNotificationStateEntry)
                }

                if ((printerObject.drv_status?.otpw ?? null) === 1) {
                    notifications.push({
                        id: `tmcwarning/${key}-otpw`,
                        priority: 'high',
                        title: t('App.Notifications.TmcOtpwFlag'),
                        description: t('App.Notifications.TmcOtpwFlagText', { name }),
                        date,
                        dismissed: false,
                        url: 'https://www.klipper3d.org/TMC_Drivers.html#tmc-reports-error-ot1overtemperror',
                    } as GuiNotificationStateEntry)
                }
            })

        const tmcwarningsDismisses = getDismissByCategory('tmcwarning').map((d) => `tmcwarning/${d.id}`)

        return notifications.filter((entry) => !tmcwarningsDismisses.includes(entry.id))
    })

    const getNotifications = computed<GuiNotificationStateEntry[]>(() => {
        let notifications: GuiNotificationStateEntry[] = []

        notifications = notifications.concat(getNotificationsAnnouncements.value)
        notifications = notifications.concat(getNotificationsFlags.value)
        notifications = notifications.concat(getNotificationsDependencies.value)
        notifications = notifications.concat(getNotificationsMoonrakerWarnings.value)
        notifications = notifications.concat(getNotificationsMoonrakerFailedComponents.value)
        notifications = notifications.concat(getNotificationsMoonrakerFailedInitComponents.value)
        notifications = notifications.concat(getNotificationsKlipperWarnings.value)
        notifications = notifications.concat(getNotificationsOverdueMaintenance.value)
        notifications = notifications.concat(getNotificationsBrowserWarnings.value)
        notifications = notifications.concat(getNotificationsOverheatDrivers.value)

        const mapType = { normal: 2, high: 1, critical: 0 }

        return notifications.sort((a, b) => {
            if (mapType[a.priority] < mapType[b.priority]) return -1
            if (mapType[a.priority] > mapType[b.priority]) return 1

            return b.date.getTime() - a.date.getTime()
        })
    })

    return {
        ...toRefs(state),
        reset,
        setData,
        upload,
        getDismiss,
        getDismissByCategory,
        storeDismiss,
        close,
        dismiss,
        getNotifications,
        getNotificationsAnnouncements,
        getNotificationsFlags,
        getNotificationsDependencies,
        getNotificationsMoonrakerWarnings,
        getNotificationsMoonrakerFailedComponents,
        getNotificationsMoonrakerFailedInitComponents,
        getNotificationsKlipperWarnings,
        getNotificationsBrowserWarnings,
        getNotificationsOverdueMaintenance,
        getNotificationsOverheatDrivers,
    }
})
