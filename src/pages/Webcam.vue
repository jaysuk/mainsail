<template>
    <div>
        <v-row>
            <v-col col-12>
                <webcam-panel current-page="page" />
            </v-col>
        </v-row>
    </div>
</template>
<script setup lang="ts">
import WebcamPanel from '@/components/panels/WebcamPanel.vue'
</script>
