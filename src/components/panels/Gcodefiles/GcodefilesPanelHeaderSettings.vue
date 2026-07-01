<template>
    <v-menu location="bottom end" :close-on-content-click="false" :title="t('Files.SetupCurrentList')">
        <template #activator="{ props: activatorProps }">
            <v-btn class="px-2 minwidth-0 ml-3" v-bind="activatorProps">
                <v-icon>{{ mdiCog }}</v-icon>
            </v-btn>
        </template>
        <v-list>
            <v-list-item class="minHeight36">
                <v-row>
                    <v-col class="pr-0">{{ t('Files.HiddenFiles') }}</v-col>
                    <v-col class="col-auto pl-0">
                        <v-icon :color="showHiddenFiles ? 'primary' : 'grey-lighten-1'" @click.stop="showHiddenFiles = !showHiddenFiles">
                            {{ showHiddenFiles ? mdiCheckboxMarked : mdiCheckboxBlankOutline }}
                        </v-icon>
                    </v-col>
                </v-row>
            </v-list-item>
            <v-list-item class="minHeight36">
                <v-row>
                    <v-col class="pr-0">{{ t('Files.PrintedFiles') }}</v-col>
                    <v-col class="col-auto pl-0">
                        <v-icon :color="showPrintedFiles ? 'primary' : 'grey-lighten-1'" @click.stop="showPrintedFiles = !showPrintedFiles">
                            {{ showPrintedFiles ? mdiCheckboxMarked : mdiCheckboxBlankOutline }}
                        </v-icon>
                    </v-col>
                </v-row>
            </v-list-item>
            <v-divider />
            <draggable v-model="configurableHeaders" item-key="value" handle=".handle" class="v-list-item-group" ghost-class="ghost" group="gcodeFilesColumnOrder" :force-fallback="true">
                <template #item="{ element: header }">
                    <v-list-item class="minHeight36">
                        <v-row>
                            <v-col class="col-auto pr-0">
                                <v-icon class="handle">{{ mdiDragVertical }}</v-icon>
                            </v-col>
                            <v-col>{{ header.text }}</v-col>
                            <v-col class="col-auto pl-0">
                                <v-icon :color="header.visible ? 'primary' : 'grey-lighten-1'" @click.stop="changeMetadataVisible(header.value, !header.visible)">
                                    {{ header.visible ? mdiCheckboxMarked : mdiCheckboxBlankOutline }}
                                </v-icon>
                            </v-col>
                        </v-row>
                    </v-list-item>
                </template>
            </draggable>
        </v-list>
    </v-menu>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { mdiCheckboxBlankOutline, mdiCheckboxMarked, mdiCog, mdiDragVertical } from '@mdi/js'
import draggable from 'vuedraggable'
import { useGcodefiles } from '@/composables/useGcodefiles'
import { useGuiStore } from '@/store/gui'

const { t } = useI18n()
const { showHiddenFiles, showPrintedFiles, configurableHeaders } = useGcodefiles()
const guiStore = useGuiStore()

function changeMetadataVisible(name: string, value: boolean) {
    guiStore.setGcodefilesMetadata({ name: name, value: value })
}
</script>

<style scoped>
.handle {
    cursor: move;
}
</style>
