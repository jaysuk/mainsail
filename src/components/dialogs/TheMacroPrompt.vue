<template>
    <v-dialog :model-value="showDialog" width="400" persistent :fullscreen="isMobile">
        <panel :title="headline" :icon="mdiInformation" card-class="macro_prompt-dialog" :margin-bottom="false" style="overflow: hidden" :height="isMobile ? 0 : 548">
            <template #buttons>
                <v-btn icon="" variant="text" @click="closePrompt">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>
                <template v-for="(event, index) in activePromptContent" :key="'prompt_' + index">
                    <macro-prompt-text v-if="event.type === 'text'" :event="event" />
                    <macro-prompt-button-group v-if="event.type === 'button_group'" :group-index="index" :children="event.children ?? []" />
                    <macro-prompt-button-group v-if="event.type === 'button'" :group-index="index" :children="[event]" />
                </template>
            </v-card-text>
            <v-card-actions v-if="footerButtons.length">
                <v-spacer />
                <macro-prompt-footer-button v-for="(button, index) in footerButtons" :key="'prompt_footer_' + index" :event="button" />
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Panel from '@/components/ui/Panel.vue'
import { mdiCloseThick, mdiInformation } from '@mdi/js'
import type { ServerStateEvent, ServerStateEventPrompt } from '@/store/server/types'
import MacroPromptFooterButton from '@/components/dialogs/MacroPromptFooterButton.vue'
import MacroPromptText from '@/components/dialogs/MacroPromptText.vue'
import MacroPromptButtonGroup from '@/components/dialogs/MacroPromptButtonGroup.vue'
import { useBase } from '@/composables/useBase'
import { useServerStore } from '@/store/server'
import { webSocketClient } from '@/plugins/webSocketClient'

const { isMobile } = useBase()
const serverStore = useServerStore()

let internalCloseCommand: number | null = null
let checkpointEvent: ServerStateEvent | null = null
let currentPrompt: ServerStateEventPrompt[] = []
// regex that extracts the type and message, omitting the wrapping double quotes of the message (if any)
const promptMessageExp = /^\/\/ action:prompt_(?<type>[^\s]+) *(?<msg>.*)$/

const events = computed(() => serverStore.events)

const macroPromptEvents = computed(() => {
    const events_: ServerStateEvent[] = events.value
    const promptEvents: ServerStateEventPrompt[] = []
    // process events from most recent (end of array) to oldest (beginning of array) event until we reach
    // the events we have already processed
    for (let i = events_.length - 1; i >= 0; i--) {
        const event = events_[i]
        // if we've reached the checkpoint event (i.e. the point where we know there are no earlier prompts to process)
        if (event === checkpointEvent) {
            // break the loop
            break
        }

        // not a prompt action, skip it
        if (event.type !== 'action' || !event.message?.startsWith('// action:prompt_')) {
            continue
        }

        const match = event.message.match(promptMessageExp)
        const type = match?.groups?.type ?? ''

        // stop processing and clear events once we find an end action
        if (type === 'end') {
            currentPrompt = []
            break
        }

        const message = (match?.groups?.msg || '').trim()

        // prepend the event to prompt events found in this chunk
        promptEvents.unshift({
            date: event.date,
            type,
            message,
        })

        // stop processing events once we find a begin action
        if (type === 'begin') {
            currentPrompt = []
            break
        }
    }

    // save our checkpoint event...we'll never have to look at messages prior to the checkpoint again
    checkpointEvent = events_[events_.length - 1]

    // if we found new prompt events in this chunk, let's append them
    if (promptEvents.length > 0) {
        currentPrompt = [...currentPrompt, ...promptEvents]
    }

    return currentPrompt
})

const lastPromptShowPos = computed(() => macroPromptEvents.value.findLastIndex((event: ServerStateEventPrompt) => event.type === 'show'))

const lastPromptBeginPos = computed(() => {
    if (lastPromptShowPos.value === -1) return -1

    return macroPromptEvents.value.findLastIndex((event: ServerStateEventPrompt) => event.type === 'begin', lastPromptShowPos.value)
})

const lastPromptClosePos = computed(() => macroPromptEvents.value.findLastIndex((event: ServerStateEventPrompt) => event.type === 'end'))

const showDialog = computed(() => {
    if (lastPromptBeginPos.value === -1) return false

    const lastBeginEvent = macroPromptEvents.value[lastPromptBeginPos.value] ?? null
    if (internalCloseCommand !== null && internalCloseCommand == (lastBeginEvent?.date?.getTime() ?? null)) return false

    return lastPromptBeginPos.value > lastPromptClosePos.value && activePromptContent.value.length > 0
})

const activePrompt = computed(() => {
    if (lastPromptShowPos.value === -1) return []

    return macroPromptEvents.value.slice(lastPromptBeginPos.value, lastPromptShowPos.value)
})

const activePromptContent = computed<ServerStateEventPrompt[]>(() => {
    const allowedTypes = ['button', 'text', 'button_group_start', 'button_group_end']

    const output = activePrompt.value.filter((event: ServerStateEventPrompt) => allowedTypes.includes(event.type))

    while (output.findIndex((event: ServerStateEventPrompt) => event.type === 'button_group_start') !== -1 && output.findIndex((event: ServerStateEventPrompt) => event.type === 'button_group_end') !== -1) {
        const start = output.findIndex((event: ServerStateEventPrompt) => event.type === 'button_group_start')
        const end = output.findIndex((event: ServerStateEventPrompt) => event.type === 'button_group_end')

        const buttons = output.slice(start + 1, end)

        output[start] = {
            date: buttons[0].date,
            type: 'button_group',
            message: '',
            children: buttons.filter((event: ServerStateEventPrompt) => event.type === 'button'),
        }

        output.splice(start + 1, buttons.length + 1)
    }

    return output
})

const headline = computed(() => {
    if (!showDialog.value || lastPromptBeginPos.value === -1) return ''

    return macroPromptEvents.value[lastPromptBeginPos.value]?.message ?? ''
})

const footerButtons = computed(() => {
    if (!showDialog.value || lastPromptBeginPos.value === -1) return []

    return activePrompt.value.filter((event: ServerStateEventPrompt) => event.type === 'footer_button')
})

function closePrompt() {
    // close prompt immediately, because klipper could be busy
    internalCloseCommand = macroPromptEvents.value[lastPromptBeginPos.value]?.date?.getTime() ?? null

    const gcode = `RESPOND type="command" msg="action:prompt_end"`
    serverStore.addEvent({ message: gcode, type: 'command' })
    webSocketClient.emit('printer.gcode.script', { script: gcode })
}
</script>
