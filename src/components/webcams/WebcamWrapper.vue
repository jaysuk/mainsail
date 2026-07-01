<template>
    <div>
        <template v-if="webcam.service === 'grid'">
            <v-container v-if="webcams" fluid class="pb-4">
                <v-row dense>
                    <v-col v-for="gridWebcam in webcams" :key="gridWebcam.name" class="col-12 col-md-6">
                        <webcam-wrapper-item :webcam="gridWebcam" :printer-url="printerUrl" :show-fps="showFps" :page="page" />
                    </v-col>
                </v-row>
            </v-container>
        </template>
        <template v-else>
            <webcam-wrapper-item :webcam="webcam" :printer-url="printerUrl" :show-fps="showFps" :page="page" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WebcamWrapperItem from '@/components/webcams/WebcamWrapperItem.vue'
import { useGuiWebcamsStore } from '@/store/gui/webcams'
import type { GuiWebcamStateWebcam } from '@/store/gui/webcams/types'

withDefaults(
    defineProps<{
        webcam: GuiWebcamStateWebcam
        showFps?: boolean
        printerUrl?: string | null
        page?: string | null
    }>(),
    {
        showFps: true,
        printerUrl: null,
        page: null,
    }
)

const guiWebcamsStore = useGuiWebcamsStore()

const webcams = computed<GuiWebcamStateWebcam[]>(() => guiWebcamsStore.getWebcams)
</script>
