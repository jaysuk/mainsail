<template>
    <v-menu
        v-model="boolMenu"
        location="bottom end"
        :close-on-click="true"
        :close-on-content-click="false"
        origin="center center"
        transition="slide-y-transition"
        :min-width="isMobile ? '100%' : undefined">
        <template #activator="{ props: activatorProps }">
            <v-btn icon tile class="minwidth-0" v-bind="activatorProps">
                <v-badge :content="notifications.length <= 9 ? notifications.length : '9+'" :model-value="notifications.length > 0" :color="colorBadge" overlap>
                    <v-icon>{{ boolMenu ? mdiBell : mdiBellOutline }}</v-icon>
                </v-badge>
            </v-btn>
        </template>
        <v-card flat :min-width="300" :max-width="isMobile ? undefined : 400">
            <template v-if="notifications.length">
                <OverlayScrollbarsComponent class="announcement-menu__scrollbar" :options="{}">
                    <v-card-text>
                        <template v-for="(entry, index) in notifications" :key="entry.id">
                            <notification-menu-entry :entry="entry" :class="index < notifications.length - 1 ? '' : 'mb-0'" :parent-state="boolMenu" />
                        </template>
                    </v-card-text>
                </OverlayScrollbarsComponent>
                <template v-if="notifications.length > 1">
                    <v-divider />
                    <v-card-actions>
                        <v-spacer />
                        <v-btn variant="text" color="primary" class="mr-2" @click="dismissAll">
                            <v-icon start>{{ mdiCloseBoxMultipleOutline }}</v-icon>
                            {{ t('App.Notifications.DismissAll') }}
                        </v-btn>
                    </v-card-actions>
                </template>
            </template>
            <v-card-text v-else class="text-center">
                <span class="text-disabled">{{ t('App.Notifications.NoNotification') }}</span>
            </v-card-text>
        </v-card>
    </v-menu>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import NotificationMenuEntry from '@/components/notifications/NotificationMenuEntry.vue'
import { mdiBell, mdiBellOutline, mdiCloseBoxMultipleOutline } from '@mdi/js'
import { useBase } from '@/composables/useBase'
import { useGuiNotificationsStore } from '@/store/gui/notifications'
import type { GuiNotificationStateEntry } from '@/store/gui/notifications/types'

const { t } = useI18n()
const { isMobile } = useBase()
const guiNotificationsStore = useGuiNotificationsStore()

const boolMenu = ref(false)

const notifications = computed<GuiNotificationStateEntry[]>(() => guiNotificationsStore.getNotifications ?? [])

const existsCriticalAnnouncements = computed(() => notifications.value.filter((entry) => entry.priority === 'critical').length > 0)

const existsHighAnnouncements = computed(() => notifications.value.filter((entry) => entry.priority === 'high').length > 0)

const colorBadge = computed(() => {
    if (existsCriticalAnnouncements.value) return 'error'
    if (existsHighAnnouncements.value) return 'warning'

    return 'primary'
})

function dismissAll() {
    notifications.value.forEach(async (entry: GuiNotificationStateEntry) => {
        if (entry.id.startsWith('announcement')) {
            guiNotificationsStore.close({ id: entry.id })
        }

        guiNotificationsStore.dismiss({ id: entry.id, type: 'reboot', time: null })
    })
}
</script>

<style scoped>
.announcement-menu__scrollbar {
    max-height: 500px;
}
</style>
