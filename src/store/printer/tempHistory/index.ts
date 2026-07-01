import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import type {
    PrinterTempHistoryState,
    PrinterTempHistoryStateSerie,
    PrinterTempHistoryStateSourceEntry,
} from '@/store/printer/tempHistory/types'
import {
    colorArray,
    colorChamber,
    colorHeaterBed,
    datasetInterval,
    datasetTypes,
    datasetTypesInPercents,
} from '@/store/variables'
import { resetState } from '@/store/helpers'
import { useSocketStore } from '@/store/socket'
import { useServerStore } from '@/store/server'
import { useGuiStore } from '@/store/gui'
import { usePrinterStore } from '@/store/printer'

export const getDefaultState = (): PrinterTempHistoryState => ({
    source: [],
    series: [],
    timeLastUpdate: null,
    updateSourceInterval: null,
})

export const usePrinterTempHistoryStore = defineStore('printerTempHistory', () => {
    const state = reactive<PrinterTempHistoryState>(getDefaultState())

    // --- getters ---
    const getSeries = (name: string) => state.series.find((element) => element.name === name)

    const getDatasetColor = (name: string) => {
        const dataset = getSeries(`${name}-temperature`)
        return dataset?.lineStyle?.color ?? null
    }

    const getSerieNames = (name: string) => {
        const output: string[] = []
        const seriesKeys = state.series
            .map((serie) => serie.name)
            .filter((serieName) => serieName.startsWith(`${name}-`))

        seriesKeys.forEach((seriesKey) => {
            output.push(seriesKey.slice(name.length + 1))
        })

        return output
    }

    const getHostMcuSensors = computed<string[]>(() => {
        const printerStore = usePrinterStore()
        const settings = printerStore.configfile?.settings ?? {}
        const available_heaters = printerStore.heaters?.available_heaters ?? []
        const available_sensors = printerStore.heaters?.available_sensors ?? []

        return available_sensors.filter((fullName: string) => {
            if (available_heaters.includes(fullName)) return false
            if (fullName.startsWith('temperature_fan')) return false

            const settingsObject = settings[fullName.toLowerCase()]
            if (!settingsObject) return false

            const sensor_type = settingsObject.sensor_type ?? ''

            return ['temperature_mcu', 'temperature_host'].includes(sensor_type)
        })
    })

    const getSelectedLegends = computed<Record<string, boolean>>(() => {
        const selected: Record<string, boolean> = {}
        const printerStore = usePrinterStore()
        const guiStore = useGuiStore()
        const available_sensors = printerStore.heaters?.available_sensors ?? []
        const available_monitors = printerStore.heaters?.available_monitors ?? []
        const viewSettings = guiStore.view?.tempchart?.datasetSettings ?? {}

        Object.keys(viewSettings).forEach((key) => {
            if (!available_sensors.includes(key) && !available_monitors.includes(key)) return

            Object.keys(viewSettings[key]).forEach((attrKey) => {
                if (!datasetTypes.includes(attrKey)) return

                const serieName = `${key}-${attrKey}`
                if (state.series.findIndex((serie) => serie.name === serieName) === -1) return

                selected[serieName] = viewSettings[key][attrKey] as boolean
            })
        })

        state.series.forEach((serie) => {
            if (Object.keys(selected).includes(serie.name)) return

            const datasetType = serie.name.slice(serie.name.lastIndexOf('-') + 1)
            selected[serie.name] = !datasetTypesInPercents.includes(datasetType)
        })

        const hideMcuHostSensors = guiStore.view?.tempchart?.hideMcuHostSensors ?? false
        if (hideMcuHostSensors) {
            const mcuHostSensors = getHostMcuSensors.value ?? []

            Object.keys(selected)
                .filter((seriesName) => {
                    const datasetName = seriesName.slice(0, seriesName.lastIndexOf('-'))
                    return mcuHostSensors.includes(datasetName)
                })
                .forEach((seriesName) => {
                    selected[seriesName] = false
                })
        }

        const hideMonitors = guiStore.view?.tempchart?.hideMonitors ?? false
        if (hideMonitors) {
            const monitors = printerStore.heaters?.available_monitors ?? []

            Object.keys(selected)
                .filter((seriesName) => {
                    const datasetName = seriesName.slice(0, seriesName.lastIndexOf('-'))
                    return monitors.includes(datasetName)
                })
                .forEach((seriesName) => {
                    selected[seriesName] = false
                })
        }

        return selected
    })

    const getBoolDisplayPwmAxis = computed<boolean>(() => {
        const legends = getSelectedLegends.value
        return (
            Object.keys(legends).find((key) => {
                return legends[key] === true && (key.endsWith('-power') || key.endsWith('-speed'))
            }) !== undefined
        )
    })

    const getAvg = (name: string, serieName: string) => {
        const key = serieName && serieName !== 'temperature' ? name + '-' + serieName : name
        const maxTime = new Date().getTime() - 1000 * 60
        let value = 0
        let counter = 0

        state.source
            .filter((data) => data.date.getTime() > maxTime)
            .forEach((item: PrinterTempHistoryStateSourceEntry) => {
                const val = item[key]
                if (typeof val === 'number') {
                    value += val
                    counter++
                }
            })

        if (counter && datasetTypesInPercents.includes(serieName)) return (value / counter) * 100
        else if (counter) return value / counter

        return 0
    }

    const getAvgPower = (name: string) => getAvg(name, 'power')
    const getAvgSpeed = (name: string) => getAvg(name, 'speed')

    const getTemperatureStoreSize = computed<number>(() => {
        const dataStoreSize = useServerStore().getConfig('data_store', 'temperature_store_size')
        return (dataStoreSize as number) ?? 1200
    })

    // --- internal state setters (former mutations) ---
    const setInitSource = (payload: PrinterTempHistoryStateSourceEntry[]) => {
        state.source = payload
    }

    const setInitSeries = (payload: PrinterTempHistoryStateSerie[]) => {
        state.series = payload
    }

    const addToSource = (payload: { data: PrinterTempHistoryStateSourceEntry; maxHistory: number }) => {
        state.source.push(payload.data)
        while (state.source.length > payload.maxHistory) state.source.splice(0, 1)
    }

    const setUpdateSourceInterval = (interval: number) => {
        state.updateSourceInterval = interval
    }

    const setColor = (payload: { name: string; value: string }) => {
        state.series
            .filter((serie) => payload.name === serie.name || serie.name.startsWith(payload.name + '-'))
            .forEach((serie) => {
                serie.color = payload.value
                serie.lineStyle.color = payload.value
                serie.emphasis.lineStyle.color = payload.value

                if (serie.name.endsWith('-target')) {
                    if (serie.areaStyle) serie.areaStyle.color = payload.value
                    if (serie.emphasis?.areaStyle) serie.emphasis.areaStyle.color = payload.value
                }
            })
    }

    // --- actions ---
    const reset = () => {
        if (state.updateSourceInterval !== null) clearInterval(state.updateSourceInterval)
        resetState(state, getDefaultState)
    }

    const updateSource = () => {
        const printerStore = usePrinterStore()
        const allSensors = getServerAvailableSensors()
        const allMonitors = getServerAvailableMonitors()
        const items = allSensors.concat(allMonitors)

        if (items.length) {
            const now = new Date()

            if (state.source.length) {
                const lastEntry = state.source[state.source.length - 1]
                const secondsBefore = lastEntry.date.getSeconds()
                const secondsAfter = now.getSeconds()
                const diff = now.getTime() - lastEntry.date.getTime()

                if (secondsBefore === secondsAfter && diff < 1000) return
            }

            const data: PrinterTempHistoryStateSourceEntry = { date: now }

            items.forEach((name: string) => {
                if (!(name in printerStore)) return
                const printerObject = { ...(printerStore[name] as Record<string, number | null>) }

                datasetTypes.forEach((attrKey) => {
                    if (!(attrKey in printerObject)) return

                    let value = printerObject[attrKey]
                    if (value !== null) value = Math.round(value * 10) / 10
                    if (datasetTypesInPercents.includes(attrKey)) value = Math.round((printerObject[attrKey] ?? 0) * 1000) / 1000

                    data[`${name}-${attrKey}`] = value
                })
            })

            addToSource({ data, maxHistory: getTemperatureStoreSize.value })
        }
    }

    // small helpers to avoid re-deriving printer availability lists twice
    const getServerAvailableSensors = () => usePrinterStore().getAvailableSensors ?? []
    const getServerAvailableMonitors = () => usePrinterStore().getAvailableMonitors ?? []

    const init = (payload?: Record<string, Record<string, (number | null)[]>> & { requestParams?: unknown }) => {
        window.console.debug('init printer/tempHistory')
        reset()

        const now = new Date()
        const allHeaters = usePrinterStore().getAvailableHeaters ?? []
        const allSensors = getServerAvailableSensors()
        const allMonitors = getServerAvailableMonitors()
        const maxHistory = getTemperatureStoreSize.value

        if (payload !== undefined) {
            if ('requestParams' in payload) delete payload.requestParams

            const objectKeys = Object.keys(payload)
            const importData: Record<string, Record<string, Array<number | null>>> = {}

            objectKeys.forEach((key: string) => {
                let nameOnly = key
                if (nameOnly.indexOf(' ') !== -1) {
                    nameOnly = nameOnly.substring(nameOnly.indexOf(' ') + 1)
                }

                if (!(allSensors.includes(key) || allMonitors.includes(key)) || nameOnly.startsWith('_')) {
                    delete payload[key]
                    return
                }

                const datasetValues = payload[key]
                datasetTypes.forEach((datasetKey) => {
                    if (datasetKey + 's' in datasetValues) {
                        const length = maxHistory - datasetValues[datasetKey + 's'].length
                        datasetValues[datasetKey + 's'] = [
                            ...Array.from({ length }, () => null),
                            ...datasetValues[datasetKey + 's'],
                        ]
                    }
                })

                importData[key] = { ...datasetValues }
            })

            const allEntries = allSensors.concat(allMonitors)
            allEntries.forEach((key: string) => {
                if (key in payload) return

                let nameOnly = key
                let sensorType = key
                const indexOfFirstSpace = key.indexOf(' ')
                if (indexOfFirstSpace !== -1) {
                    nameOnly = key.substring(indexOfFirstSpace + 1)
                    sensorType = key.substring(0, indexOfFirstSpace)
                }

                if (nameOnly.startsWith('_')) return

                const addValues: {
                    temperatures: (number | null)[]
                    targets?: (number | null)[]
                    powers?: (number | null)[]
                    speeds?: (number | null)[]
                } = {
                    temperatures: Array(maxHistory).fill(null),
                }

                if (allHeaters.includes(key)) {
                    addValues.targets = Array(maxHistory).fill(null)
                    addValues.powers = Array(maxHistory).fill(null)
                } else if (['temperature_fan'].includes(sensorType)) {
                    addValues.targets = Array(maxHistory).fill(null)
                    addValues.speeds = Array(maxHistory).fill(null)
                }

                importData[key] = { ...addValues }
            })

            const tempDataset: PrinterTempHistoryStateSourceEntry[] = []
            for (let i = 0; i < maxHistory; i++) {
                const tmpDataset: PrinterTempHistoryStateSourceEntry = {
                    date: new Date(now.getTime() - 1000 * (maxHistory - i)),
                }

                Object.keys(importData).forEach((objectName) => {
                    datasetTypes.forEach((attrKey) => {
                        const importDatasetName = `${attrKey}s`

                        if (importDatasetName in importData[objectName])
                            tmpDataset[`${objectName}-${attrKey}`] = importData[objectName][importDatasetName][i]
                    })
                })

                tempDataset.push(tmpDataset)
            }

            setInitSource(tempDataset)

            const tempDatasetKeys = Object.keys(tempDataset[0]).filter((tmp) => tmp !== 'date')
            const masterDatasetKeys = tempDatasetKeys
                .filter((name) => name.endsWith('-temperature'))
                .map((name) => name.slice(0, name.length - 12))
                .sort()
            const series: PrinterTempHistoryStateSerie[] = []
            let colorNumber = 0

            masterDatasetKeys.forEach((name: string) => {
                let color = useGuiStore().getDatasetValue({ name: name, type: 'color' })

                if (!color) {
                    if (name === 'heater_bed') color = colorHeaterBed
                    if (name.endsWith(' chamber')) color = colorChamber

                    if (!color) {
                        color = colorArray[colorNumber]
                        colorNumber++

                        if (color === undefined) {
                            color = '#' + Math.floor(0xffffff * Math.random()).toString(16)
                        }
                    }
                }

                const serie: PrinterTempHistoryStateSerie = {
                    id: series.length + 1,
                    color: color,
                    type: 'line',
                    name: `${name}-temperature`,
                    encode: { x: 'date', y: `${name}-temperature` },
                    animation: false,
                    yAxisIndex: 0,
                    lineStyle: {
                        color: color,
                        width: 2,
                        opacity: 0.9,
                    },
                    showSymbol: false,
                    emphasis: {
                        lineStyle: {
                            color: color,
                            width: 2,
                            opacity: 0.9,
                        },
                    },
                }

                series.push(serie)

                datasetTypes.forEach((attrKey) => {
                    if (attrKey === 'temperature') return

                    const subName = name + '-' + attrKey
                    if (!tempDatasetKeys.includes(subName)) return

                    const subSerie: PrinterTempHistoryStateSerie = JSON.parse(JSON.stringify(serie))
                    subSerie.id = series.length + 1
                    subSerie.name = subName
                    subSerie.encode.y = subName

                    if (attrKey === 'target') {
                        subSerie.lineStyle.width = 0
                        subSerie.emphasis.lineStyle.width = 0

                        subSerie.areaStyle = { color: color, opacity: 0.1 }
                        subSerie.emphasis.areaStyle = { color: color, opacity: 0.1 }
                    }

                    if (datasetTypesInPercents.includes(attrKey)) {
                        subSerie.yAxisIndex = 1

                        subSerie.lineStyle.width = 1.5
                        subSerie.lineStyle.opacity = 0.75
                        subSerie.lineStyle.type = 'dotted'
                        subSerie.emphasis.lineStyle.width = 1.5
                        subSerie.emphasis.lineStyle.opacity = 0.75
                        subSerie.emphasis.lineStyle.type = 'dotted'
                    }

                    series.push(subSerie)
                })
            })

            setInitSeries(series)

            const updateSourceInterval = window.setInterval(() => {
                updateSource()
            }, datasetInterval)

            setUpdateSourceInterval(updateSourceInterval)
        }

        useSocketStore().removeInitModule('printer/initTempHistory')
    }

    return {
        ...toRefs(state),
        getDatasetColor,
        getSeries,
        getSerieNames,
        getBoolDisplayPwmAxis,
        getAvg,
        getAvgPower,
        getAvgSpeed,
        getHostMcuSensors,
        getSelectedLegends,
        getTemperatureStoreSize,
        reset,
        init,
        updateSource,
        setColor,
    }
})
