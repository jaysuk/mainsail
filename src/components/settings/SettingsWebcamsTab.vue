<template>
    <div>
        <v-card v-if="!boolForm" flat>
            <v-card-text>
                <h3 class="text-h5 mb-3">{{ t('Settings.WebcamsTab.Webcams') }}</h3>
                <webcam-list-entry v-for="(webcam, index) in webcams" :key="webcam.name" :webcam="webcam" :bool-border-top="index > 0" @edit-webcam="editWebcam" />
            </v-card-text>
            <v-card-actions>
                <v-btn v-if="existCrowsnestConf" variant="text" color="primary" @click="openCrowsnestConf">
                    {{ t('Settings.WebcamsTab.EditCrowsnestConf') }}
                </v-btn>
                <v-spacer />
                <v-btn variant="text" color="primary" @click="createWebcam">{{ t('Settings.WebcamsTab.AddWebcam') }}</v-btn>
            </v-card-actions>
        </v-card>
        <v-card v-else flat>
            <webcam-form :webcam="formWebcam" :type="typeForm" @close="closeForm" />
        </v-card>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FileStateFile } from '@/store/files/types'
import WebcamForm from '@/components/settings/Webcams/WebcamForm.vue'
import WebcamListEntry from '@/components/settings/Webcams/WebcamListEntry.vue'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'
import { useGuiWebcamsStore } from '@/store/gui/webcams'
import { useFilesStore } from '@/store/files'
import { useEditorStore } from '@/store/editor'

const DEFAULT_ASPECT_RATIO = '16:9'

const { t } = useI18n()
const guiWebcamsStore = useGuiWebcamsStore()
const filesStore = useFilesStore()
const editorStore = useEditorStore()

const boolForm = ref(false)
const typeForm = ref<'create' | 'edit'>('create')
const formWebcam = ref<GuiWebcamStateWebcam>({} as GuiWebcamStateWebcam)

const webcams = computed(() => guiWebcamsStore.webcams ?? [])

const configfiles = computed(() => filesStore.getDirectory('config')?.childrens ?? [])

const crowsnestConf = computed<FileStateFile | null>(() => configfiles.value.find((file: FileStateFile) => file.filename === 'crowsnest.conf') ?? null)

const existCrowsnestConf = computed<boolean>(() => configfiles.value.findIndex((file: FileStateFile) => file.filename === 'crowsnest.conf') !== -1)

function openCrowsnestConf() {
    editorStore.openFile({
        root: 'config',
        path: '/',
        filename: crowsnestConf.value?.filename ?? '',
        permissions: crowsnestConf.value?.permissions ?? '',
        size: crowsnestConf.value?.size ?? null,
    })
}

function createWebcam() {
    formWebcam.value = {
        name: '',
        enabled: true,
        icon: 'mdiWebcam',
        service: 'mjpegstreamer-adaptive',
        target_fps: 15,
        target_fps_idle: 15,
        stream_url: '/webcam/?action=stream',
        snapshot_url: '/webcam/?action=snapshot',
        rotation: 0,
        flip_horizontal: false,
        flip_vertical: false,
        aspect_ratio: DEFAULT_ASPECT_RATIO,
        extra_data: {},
    }

    typeForm.value = 'create'
    boolForm.value = true
}

function closeForm() {
    boolForm.value = false
}

function editWebcam(webcam: GuiWebcamStateWebcam) {
    formWebcam.value = { ...webcam }
    typeForm.value = 'edit'
    boolForm.value = true
}
</script>
