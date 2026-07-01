<template>
    <v-dialog :model-value="application !== ''" persistent max-width="800" class="mx-0">
        <v-card :loading="!complete">
            <template #loader>
                <v-progress-linear color="primary" indeterminate />
            </template>
            <v-toolbar flat density="compact">
                <v-toolbar-title>
                    <span class="subheading">
                        <v-icon start>{{ mdiUpdate }}</v-icon>
                        <template v-if="application.substr(0, 8) === 'recover_' && !complete">
                            {{ t('App.UpdateDialog.Recovering', { software: application.substr(8) }) }}
                        </template>
                        <template v-else-if="application.substr(0, 8) === 'recover_'">
                            {{ t('App.UpdateDialog.RecoveringDone', { software: application.substr(8) }) }}
                        </template>
                        <template v-else-if="!complete">
                            {{ t('App.UpdateDialog.Updating', { software: application }) }}
                        </template>
                        <template v-else>
                            {{ t('App.UpdateDialog.UpdatingDone', { software: application }) }}
                        </template>
                    </span>
                </v-toolbar-title>
            </v-toolbar>
            <v-card-text class="px-3">
                <v-row>
                    <v-col class="py-6 px-0">
                        <OverlayScrollbarsComponent ref="updaterLogScroll" class="updaterLogScroll">
                            <table class="updaterLog">
                                <tbody v-if="sortedMessages.length">
                                    <tr v-for="(item, index) in sortedMessages" :key="index">
                                        <td class="log-cell title-cell py-2">
                                            {{ formatTime(item.date) }}
                                        </td>
                                        <td class="log-cell content-cell pl-0 py-2" colspan="2" style="width: 100%">
                                            <span v-if="item.message" class="message" v-html="item.message" />
                                        </td>
                                    </tr>
                                </tbody>
                                <tbody v-else>
                                    <tr>
                                        <td class="py-2">{{ t('App.UpdateDialog.Empty') }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </OverlayScrollbarsComponent>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col class="text-center pt-5">
                        <v-btn variant="text" :disabled="!complete" color="primary" @click="close">
                            {{ t('Buttons.Close') }}
                        </v-btn>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-vue'
import type { ServerUpdateManagerStateMessages } from '@/store/server/updateManager/types'
import { mdiUpdate } from '@mdi/js'
import { useServerUpdateManagerStore } from '@/store/server/updateManager'
import { webSocketClient } from '@/plugins/webSocketClient'

const { t } = useI18n()
const updateManagerStore = useServerUpdateManagerStore()

const updaterLogScroll = ref<OverlayScrollbarsComponentRef | null>(null)

const application = computed(() => updateManagerStore.updateResponse.application ?? '')

const messages = computed<ServerUpdateManagerStateMessages[]>(() => updateManagerStore.updateResponse.messages ?? [])

const sortedMessages = computed(() => [...messages.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))

const complete = computed(() => updateManagerStore.updateResponse.complete ?? true)

function formatTime(date: Date) {
    const hours = date.getHours() < 10 ? '0' + date.getHours().toString() : date.getHours()
    const minutes = date.getMinutes() < 10 ? '0' + date.getMinutes().toString() : date.getMinutes()
    const seconds = date.getSeconds() < 10 ? '0' + date.getSeconds().toString() : date.getSeconds()

    return hours + ':' + minutes + ':' + seconds
}

function close() {
    if (application.value !== null && complete.value && ['client', 'mainsail', 'full'].includes(application.value.toLowerCase())) {
        window.location.reload()
        return
    }

    updateManagerStore.resetUpdateResponse()
    webSocketClient.emit('machine.update.status', { refresh: false }, { action: 'server/updateManager/onUpdateStatus' })
}

watch(messages, () => {
    setTimeout(() => {
        const viewport = updaterLogScroll.value?.osInstance()?.elements().viewport
        if (!viewport) return

        viewport.scrollTop = viewport.scrollHeight
    }, 50)
})
</script>

<style scoped>
.updaterLogScroll {
    height: 350px;
    max-height: 350px;
    overflow-x: hidden;
}

.updaterLog .title-cell {
    white-space: nowrap;
    vertical-align: top;
}
</style>
