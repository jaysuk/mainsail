<template>
    <v-dialog v-model="showDialog" width="400" :fullscreen="isMobile">
        <panel card-class="confirm-top-corner-menu-dialog" :icon="iconToUse" :title="title" :margin-bottom="false">
            <template #buttons>
                <v-btn icon="" variant="text" @click="close">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>{{ text }}</v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="close">{{ cancelButtonComputed }}</v-btn>
                <v-btn variant="text" :color="actionButtonColor" @click="action">{{ actionButtonText }}</v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Panel from '@/components/ui/Panel.vue'
import { mdiAlert, mdiCloseThick } from '@mdi/js'
import { useBase } from '@/composables/useBase'

const props = withDefaults(
    defineProps<{
        title: string
        text: string
        actionButtonText: string
        cancelButtonText?: string
        actionButtonColor?: string
        icon?: string | null
    }>(),
    {
        cancelButtonText: '',
        actionButtonColor: 'error',
        icon: null,
    }
)

const emit = defineEmits<{
    action: []
}>()

const showDialog = defineModel<boolean>({ required: true })

const { t } = useI18n()
const { isMobile } = useBase()

const iconToUse = computed(() => props.icon ?? mdiAlert)

const cancelButtonComputed = computed<string>(() => props.cancelButtonText || t('Buttons.Cancel'))

function action() {
    emit('action')
    showDialog.value = false
}

function close() {
    showDialog.value = false
}
</script>
