<template>
    <v-item-group class="d-inline-flex">
        <v-tooltip :disabled="!hasDescription" location="top">
            <template #activator="{ props: activatorProps }">
                <v-btn
                    size="small"
                    :color="color"
                    :class="paramArray.length ? 'macroWithParameters' : ''"
                    :loading="loadings.includes('macro_' + macro.name)"
                    :disabled="disabled"
                    class="flex-grow-1"
                    v-bind="activatorProps"
                    @click="doSendMacro(macro.name)">
                    <v-icon v-if="icon" size="small" left>{{ icon }}</v-icon>
                    {{ alias ? alias : macro.name.replace(/_/g, ' ') }}
                </v-btn>
            </template>
            <span>{{ klipperMacro?.description }}</span>
        </v-tooltip>
        <template v-if="paramArray.length">
            <v-menu v-if="!isMobile" location="bottom" :close-on-content-click="false">
                <template #activator="{ props: activatorProps }">
                    <v-btn
                        :disabled="disabled"
                        :color="color"
                        v-bind="activatorProps"
                        class="minwidth-0 px-1 btnMacroMenu"
                        size="small">
                        <v-icon>{{ mdiMenuDown }}</v-icon>
                    </v-btn>
                </template>
                <v-card :max-width="paramsOverlayWidth">
                    <v-card-text class="py-2">
                        <v-row class="my-2">
                            <v-col v-for="(name, key) in paramArray" :key="'param_' + key" :cols="paramCssCols">
                                <v-text-field
                                    v-model="params[name].value"
                                    :label="name"
                                    :placeholder="params[name].default?.toString()"
                                    :persistent-placeholder="true"
                                    hide-details
                                    variant="outlined"
                                    density="compact"
                                    clearable
                                    :clear-icon="mdiRefresh"
                                    @keyup.enter="sendWithParams"></v-text-field>
                            </v-col>
                        </v-row>
                        <v-row class="my-2">
                            <v-col class="py-0">
                                <v-btn color="primary" class="text-uppercase" block @click="sendWithParams">
                                    {{ t('Panels.MacrosPanel.Send') }}
                                </v-btn>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-menu>
            <template v-else>
                <v-btn :disabled="disabled" :color="color" class="minwidth-0 px-1 btnMacroMenu" size="small" @click="paramsDialog = true">
                    <v-icon>{{ mdiMenuDown }}</v-icon>
                </v-btn>
                <v-dialog v-model="paramsDialog">
                    <panel :title="macro.name" :card-class="`macro-params-mobile-${macro.name}`" :margin-bottom="false">
                        <template #buttons>
                            <v-btn icon tile @click="paramsDialog = false">
                                <v-icon>{{ mdiCloseThick }}</v-icon>
                            </v-btn>
                        </template>
                        <v-card-text>
                            <v-row>
                                <v-col v-for="(name, key) in paramArray" :key="'param_mobile_' + key" :cols="6">
                                    <v-text-field
                                        v-model="params[name].value"
                                        :label="name"
                                        :placeholder="params[name].default?.toString()"
                                        :persistent-placeholder="true"
                                        hide-details
                                        variant="outlined"
                                        density="compact"
                                        clearable
                                        :clear-icon="mdiRefresh"
                                        @keyup.enter="sendWithParams"></v-text-field>
                                </v-col>
                            </v-row>
                        </v-card-text>
                        <v-card-actions class="px-4 pb-4">
                            <v-btn color="primary" class="text-uppercase" block @click="sendWithParams">
                                {{ t('Panels.MacrosPanel.Send') }}
                            </v-btn>
                        </v-card-actions>
                    </panel>
                </v-dialog>
            </template>
        </template>
    </v-item-group>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiCloseThick, mdiMenuDown, mdiRefresh } from '@mdi/js'
import Panel from '@/components/ui/Panel.vue'
import type { GuiMacrosStateMacrogroupMacro } from '@/store/gui/macros/types'
import type { PrinterStateMacro } from '@/store/printer/types'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'
import { useBase } from '@/composables/useBase'

interface param {
    type: 'int' | 'double' | 'string' | null
    default: string | number | null
    value: string | number | null
}

const DEFAULT_DESC = 'G-Code macro'

const props = withDefaults(
    defineProps<{
        macro: GuiMacrosStateMacrogroupMacro | PrinterStateMacro
        color?: string
        alias?: string | null
        disabled?: boolean
        icon?: string | null
    }>(),
    {
        color: 'primary',
        alias: null,
        disabled: false,
        icon: null,
    }
)

const { t } = useI18n()
const printerStore = usePrinterStore()
const { isMobile, loadings } = useBase()

const paramArray = ref<string[]>([])
const params = ref<Record<string, param>>({})
const paramsDialog = ref(false)

const klipperMacro = computed(() => printerStore.getMacro(props.macro.name))

const isGcodeStyle = computed(() => props.macro.name.match(/[G|M]\d{1,3}/gm))

const paramCols = computed(() => {
    if (isMobile.value) return 1

    const cols = Math.ceil(paramArray.value.length / 5)

    if (cols > 4) return 4

    return cols
})

const paramCssCols = computed(() => 12 / paramCols.value)
const paramsOverlayWidth = computed(() => 200 * paramCols.value)

const hasDescription = computed<boolean>(() => !!(klipperMacro.value?.description && klipperMacro.value.description !== DEFAULT_DESC))

function refreshParams() {
    paramArray.value.splice(0, paramArray.value.length)
    params.value = {}

    if (klipperMacro.value?.params !== null && klipperMacro.value?.params !== undefined) {
        Object.keys(klipperMacro.value.params).forEach((name: string) => {
            if (!name.startsWith('_')) {
                paramArray.value.push(name)
                params.value[name] = {
                    type: klipperMacro.value!.params![name].type,
                    default: klipperMacro.value!.params![name].default,
                    value: '',
                }
            }
        })
    }
}

watch(klipperMacro, () => {
    refreshParams()
})

function doSendMacro(gcode: string) {
    useServerStore().addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode }, { loading: 'macro_' + gcode })
}

function sendWithParams() {
    const paramsList: string[] = []
    paramArray.value.forEach((paramname: string) => {
        let value = params.value[paramname].value?.toString().trim()

        if (params.value[paramname].value !== null && value !== '') {
            let tmp: string = paramname
            if (value?.includes(' ')) value = `"${value}"`

            tmp += isGcodeStyle.value ? value : `=${value}`

            paramsList.push(tmp)
        }
    })

    const gcode = props.macro.name + ' ' + paramsList.join(' ')
    doSendMacro(gcode)
}

onMounted(() => {
    refreshParams()
})
</script>

<style scoped>
.btnMacroMenu {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

.macroWithParameters {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}
</style>
