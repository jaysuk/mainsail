<template>
    <v-dialog v-model="isOpen" transition="dialog-bottom-transition" max-width="600" :fullscreen="isMobile">
        <template #activator="{ props: activatorProps }">
            <v-btn v-if="inToolbar" icon tile v-bind="activatorProps">
                <v-icon size="small">{{ mdiHelp }}</v-icon>
            </v-btn>
            <v-btn v-else class="gcode-command-btn px-2 minwidth-0" color="lightgray" :size="isMini ? 'small' : undefined" v-bind="activatorProps">
                <v-icon>{{ mdiHelp }}</v-icon>
            </v-btn>
        </template>
        <template #default>
            <panel :title="t('Console.CommandList')" :icon="mdiHelp" card-class="command-help-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="isOpen = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-title>
                    <v-row>
                        <v-col>
                            <v-text-field v-model="cmdListSearch" :label="t('Console.Search')" variant="outlined" hide-details clearable density="compact" />
                        </v-col>
                    </v-row>
                </v-card-title>
                <v-divider />
                <OverlayScrollbarsComponent class="command-help-content" :class="isMobile ? 'mobileHeight' : 'height300'" :options="{}">
                    <v-card-text class="pt-0">
                        <v-list>
                            <command-help-modal-entry
                                v-for="command of helplistFiltered"
                                :key="command"
                                :command="command"
                                @click-on-command="onCommand" />
                        </v-list>
                    </v-card-text>
                </OverlayScrollbarsComponent>
            </panel>
        </template>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiHelp, mdiCloseThick } from '@mdi/js'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import Panel from '@/components/ui/Panel.vue'
import CommandHelpModalEntry from '@/components/console/CommandHelpModalEntry.vue'
import { useBase } from '@/composables/useBase'
import { usePrinterStore } from '@/store/printer'

withDefaults(
    defineProps<{
        isMini?: boolean
        inToolbar?: boolean
    }>(),
    {
        isMini: false,
        inToolbar: false,
    }
)

const emit = defineEmits<{ onCommand: [gcode: string] }>()

const { t } = useI18n()
const { isMobile } = useBase()
const printerStore = usePrinterStore()

const cmdListSearch = ref('')
const isOpen = ref(false)

const helplist = computed<string[]>(() => Object.keys(printerStore.gcode?.commands ?? {}))

const helplistFiltered = computed<string[]>(() =>
    helplist.value.filter((cmd) => cmd.includes(cmdListSearch.value.toUpperCase())).sort((a, b) => a.localeCompare(b))
)

function onCommand(gcode: string): void {
    emit('onCommand', gcode)
    isOpen.value = false
}

watch(isOpen, (val) => {
    if (val) return

    cmdListSearch.value = ''
})
</script>

<style scoped>
.command-help-content {
    overflow-x: hidden;

    &.height300 {
        height: 300px;
    }

    &.mobileHeight {
        height: calc(var(--app-height) - 48px - 73px);
    }
}
</style>
