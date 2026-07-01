<template>
    <v-textarea
        ref="gcodeCommandField"
        v-model="gcode"
        :label="t('Panels.MiniconsolePanel.SendCode')"
        variant="solo"
        class="gcode-command-field"
        autocomplete="off"
        no-resize
        auto-grow
        :rows="rows"
        hide-details
        density="compact"
        :prepend-icon="isTouchDevice ? mdiChevronDoubleRight : ''"
        :append-icon="mdiSend"
        @keydown.enter.prevent.stop="doSend"
        @keydown.up="onKeyUp"
        @keydown.down="onKeyDown"
        @keydown.tab="onAutocomplete"
        @click:prepend="onAutocomplete"
        @click:append="doSend" />
</template>
<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiSend, mdiChevronDoubleRight } from '@mdi/js'
import { strLongestEqual } from '@/plugins/helpers'
import { useBase } from '@/composables/useBase'
import { useConsole } from '@/composables/useConsole'
import { usePrinterStore } from '@/store/printer'
import { useServerStore } from '@/store/server'
import { useGuiGcodehistoryStore } from '@/store/gui/gcodehistory'

const { t } = useI18n()
const { isTouchDevice } = useBase()
const { lastCommands, helplist } = useConsole()

// Vuetify 4's VTextarea doesn't expose the Vue 2-era `$refs.input` shape;
// the underlying native <textarea> is queried from the component's root
// element instead.
const gcodeCommandField = ref<{ $el: HTMLElement; focus: () => void } | null>(null)

const gcode = ref('')
const lastCommandNumber = ref<number | null>(null)

const rows = computed<number>(() => gcode.value?.split('\n').length ?? 1)

function getTextareaEl(): HTMLTextAreaElement | null {
    return gcodeCommandField.value?.$el.querySelector('textarea') ?? null
}

function getCurrentLine(): number {
    const textarea = getTextareaEl()
    if (!textarea) return 1

    const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart ?? 0)
    return textBeforeCursor.split('\n').length
}

function setGcode(value: string): void {
    gcode.value = value

    nextTick(() => {
        gcodeCommandField.value?.focus()
    })
}

function onKeyUp(event: KeyboardEvent): void {
    const currentLine = getCurrentLine()
    if (rows.value > 1 && currentLine > 1) return

    event.preventDefault()
    if (lastCommandNumber.value === null && lastCommands.value.length) {
        lastCommandNumber.value = lastCommands.value.length - 1
        gcode.value = lastCommands.value[lastCommandNumber.value]
    } else if (lastCommandNumber.value && lastCommandNumber.value > 0) {
        lastCommandNumber.value--
        gcode.value = lastCommands.value[lastCommandNumber.value]
    }
}

function onKeyDown(event: KeyboardEvent): void {
    const currentLine = getCurrentLine()
    if (rows.value > currentLine) return

    event.preventDefault()

    if (lastCommandNumber.value === null) return

    if (lastCommandNumber.value < lastCommands.value.length - 1) {
        lastCommandNumber.value++
        gcode.value = lastCommands.value[lastCommandNumber.value]
    } else if (lastCommandNumber.value === lastCommands.value.length - 1) {
        lastCommandNumber.value = null
        gcode.value = ''
    }
}

function doSend(cmd: KeyboardEvent | MouseEvent) {
    if (cmd.shiftKey) {
        gcode.value += '\n'
        return
    }

    if (gcode.value === '') return

    usePrinterStore().sendGcode(gcode.value)
    useGuiGcodehistoryStore().addToHistory(gcode.value)
    gcode.value = ''
    lastCommandNumber.value = null
}

function updateGcode(text: string, start: number, end: number) {
    gcode.value = gcode.value.substring(0, start + 1) + text + gcode.value.substring(end)
}

function onAutocomplete(e: Event): void {
    e.preventDefault()

    if (!gcode.value.length) return

    const textarea = getTextareaEl()
    const currentPosition = textarea?.selectionStart ?? 0
    const beforeCursor = gcode.value.substring(0, currentPosition)
    const lastNewlineIndex = beforeCursor.lastIndexOf('\n')
    const currentLine = beforeCursor.substring(lastNewlineIndex + 1)

    const currentLineUpperCase = currentLine.toUpperCase()
    const commands = helplist.value.filter((element) => element.command.startsWith(currentLineUpperCase))

    if (commands.length === 0) return

    if (commands?.length === 1) {
        updateGcode(commands[0].command, lastNewlineIndex, currentPosition)
        return
    }

    const longestCommon = commands.reduce((acc, val) => strLongestEqual(acc, val.command), commands[0].command)

    let output = ''
    commands.forEach((command) => (output += `<a class="command font-weight-bold">${command.command}</a>: ${command.help}<br />`))

    useServerStore().addEvent({ message: output, type: 'autocomplete' })

    updateGcode(longestCommon, lastNewlineIndex, currentPosition)
}

defineExpose({ setGcode })
</script>

<style scoped>
.gcode-command-field {
    font-family: 'Roboto Mono', monospace;
}
</style>
