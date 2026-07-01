import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    mdiArrowCollapseVertical,
    mdiCodeTags,
    mdiConsoleLine,
    mdiDipSwitch,
    mdiEngine,
    mdiGamepad,
    mdiInformation,
    mdiLedStrip,
    mdiPrinter3dNozzle,
    mdiThermometerLines,
    mdiWebcam,
    mdiAdjust,
    mdiMulticast,
} from '@mdi/js'
import { capitalize } from '@/plugins/helpers'
import { afcIconLogo } from '@/plugins/afcIcons'
import { useGuiMacrosStore } from '@/store/gui/macros'
import { useGuiWebcamsStore } from '@/store/gui/webcams'

/** Replaces the Vue 2 `DashboardMixin` class component. */
export function useDashboard() {
    const { t } = useI18n()
    const macrosStore = useGuiMacrosStore()
    const webcamsStore = useGuiWebcamsStore()

    const macrogroups = computed(() => macrosStore.getAllMacrogroups ?? [])
    const webcams = computed(() => webcamsStore.getWebcams ?? [])

    const getPanelName = (name: string): string => {
        if (name.startsWith('macrogroup_')) {
            const groupId = name.split('_')[1] ?? ''
            const group = macrogroups.value.find((group) => group.id === groupId)

            return group ? group.name : 'Macrogroup'
        }

        if (name.includes('-')) {
            let panelName = ''
            const subStrings = name.split('-')
            subStrings.forEach((subStr) => {
                panelName += capitalize(subStr)
            })
            return t(`Panels.${panelName}Panel.Headline`)
        }

        return t(`Panels.${capitalize(name)}Panel.Headline`)
    }

    const convertPanelnameToIcon = (name: string): string => {
        if (name.startsWith('macrogroup_')) return mdiCodeTags

        switch (name) {
            case 'webcam':
                return mdiWebcam
            case 'zoffset':
                return mdiArrowCollapseVertical
            case 'toolhead-control':
                return mdiGamepad
            case 'macros':
                return mdiCodeTags
            case 'miscellaneous':
                return mdiDipSwitch
            case 'led-effects':
                return mdiLedStrip
            case 'temperature':
                return mdiThermometerLines
            case 'miniconsole':
                return mdiConsoleLine
            case 'machine-settings':
                return mdiEngine
            case 'extruder-control':
                return mdiPrinter3dNozzle
            case 'spoolman':
                return mdiAdjust
            case 'mmu':
                return mdiMulticast
            case 'afc':
                return afcIconLogo

            default:
                return mdiInformation
        }
    }

    return { macrogroups, webcams, getPanelName, convertPanelnameToIcon }
}
