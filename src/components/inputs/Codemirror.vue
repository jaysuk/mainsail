<template>
    <div class="vue-codemirror">
        <div ref="editor"></div>
    </div>
</template>

<script setup lang="ts">
// Inspired by this repo: https://github.com/surmon-china/vue-codemirror

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { basicSetup } from 'codemirror'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState, Prec } from '@codemirror/state'
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode'
import { HighlightStyle, indentUnit, StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import { klipper_config } from '@/plugins/StreamParserKlipperConfig'
import { gcode as gcodeLanguage } from '@/plugins/StreamParserGcode'
import { KlipperDocsTooltip } from '@/plugins/KlipperDocsTooltip'
import { insertTab, indentLess } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { css } from '@codemirror/lang-css'
import { yaml, yamlLanguage } from '@codemirror/lang-yaml'
import { tags } from '@lezer/highlight'
import { useBase } from '@/composables/useBase'
import { useMainsailTheme } from '@/composables/useMainsailTheme'
import { useGuiStore } from '@/store/gui'

const yamlDarkHighlightStyle = HighlightStyle.define(
    [
        {
            tag: tags.definition(tags.propertyName),
            color: '#dcdcaa',
        },
    ],
    { scope: yamlLanguage, themeType: 'dark' }
)

const yamlLightHighlightStyle = HighlightStyle.define(
    [
        {
            tag: tags.definition(tags.propertyName),
            color: '#795e26',
        },
    ],
    { scope: yamlLanguage, themeType: 'light' }
)

const props = withDefaults(
    defineProps<{
        code?: string
        name?: string
        fileExtension?: string
    }>(),
    {
        code: '',
        name: 'codemirror',
        fileExtension: '',
    }
)

const emit = defineEmits<{
    ready: [view: EditorView]
    lineChange: [line: number]
}>()

const modelValue = defineModel<string>({ default: '' })

const { klipperConfigReference } = useBase()
const { themeMode } = useMainsailTheme()
const guiStore = useGuiStore()

const editor = ref<HTMLElement | null>(null)
const content = ref('')
let observer: IntersectionObserver | null = null

let codemirror: EditorView | null = null
let cminstance: EditorView | null = null

const tabSize = computed(() => guiStore.editor.tabSize || 2)
const klipperDocsTooltips = computed(() => guiStore.editor.klipperDocsTooltips ?? true)
const vscodeTheme = computed(() => (themeMode.value === 'dark' ? vscodeDark : vscodeLight))

const cmExtensions = computed(() => {
    const extensions = [
        EditorView.theme({}, { dark: themeMode.value === 'dark' }),
        basicSetup,
        vscodeTheme.value,
        indentUnit.of(' '.repeat(tabSize.value)),
        keymap.of([
            { key: 'Tab', run: insertTab },
            { key: 'Shift-Tab', run: indentLess },
        ]),
        EditorView.updateListener.of((update) => {
            if (update.selectionSet) {
                const line = cminstance?.state?.doc.lineAt(cminstance?.state?.selection.main.head).number
                if (line !== undefined) emit('lineChange', line)
            }
            content.value = update.state?.doc.toString()
            modelValue.value = content.value
        }),
    ]

    if (klipperDocsTooltips.value && props.fileExtension === 'cfg') {
        extensions.push(KlipperDocsTooltip(klipperConfigReference.value))
    }

    if (['cfg', 'conf'].includes(props.fileExtension)) extensions.push(StreamLanguage.define(klipper_config))
    else if (['gcode'].includes(props.fileExtension)) extensions.push(StreamLanguage.define(gcodeLanguage))
    else if (['json'].includes(props.fileExtension)) extensions.push(json())
    else if (['yaml', 'yml'].includes(props.fileExtension)) {
        extensions.push(yaml(), Prec.highest(syntaxHighlighting(yamlDarkHighlightStyle)), Prec.highest(syntaxHighlighting(yamlLightHighlightStyle)))
    } else if (['css', 'scss', 'sass'].includes(props.fileExtension)) extensions.push(css())

    return extensions
})

function setCmValue(value: string) {
    cminstance?.setState(EditorState.create({ doc: value, extensions: cmExtensions.value }))
}

function gotoLine(line: number) {
    const l = cminstance?.state?.doc.line(line)
    if (!l) return

    cminstance?.dispatch({
        selection: { head: l.from, anchor: l.to },
        scrollIntoView: true,
    })
}

function initialize() {
    if (!editor.value) return

    codemirror = new EditorView({
        parent: editor.value,
    })
    cminstance = codemirror

    nextTick(() => {
        setCmValue(props.code || modelValue.value || content.value)

        emit('ready', codemirror as EditorView)
    })
}

watch(modelValue, (newVal) => {
    const cm_value = cminstance?.state?.doc.toString()
    if (newVal !== undefined && newVal !== cm_value) {
        setCmValue(newVal)
    }
})

onMounted(() => {
    initialize()

    observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) cminstance?.focus()
    })
    observer.observe(editor.value as HTMLElement)
})

onBeforeUnmount(() => {
    observer?.disconnect()
    cminstance?.destroy()
})

defineExpose({ gotoLine })
</script>
