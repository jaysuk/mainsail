<template>
    <div>
        <template v-for="object in printing_objects" :key="object.name">
            <v-row class="py-3 d-flex" @click="mouseOverObject(object.name)" @mouseover="mouseOverObject(object.name)" @mouseleave="mouseOverObject('')">
                <v-col :class="'py-2 subtitle-2 text-truncate ' + (hoverName === object.name ? 'text-white' : 'text-disabled')">
                    {{ object.name }}
                </v-col>
                <v-col class="col-auto py-2">
                    <v-chip v-if="excluded_objects.includes(object.name)" pill size="small" class="text-disabled">
                        {{ t('Panels.StatusPanel.ExcludeObject.Excluded') }}
                    </v-chip>
                    <v-icon v-else class="text-disabled cursor-pointer" size="small" @click="openExcludeObjectDialog(object.name)">
                        {{ mdiCloseCircle }}
                    </v-icon>
                </v-col>
            </v-row>
            <v-divider />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiCloseCircle } from '@mdi/js'
import { usePrinterStore } from '@/store/printer'

withDefaults(
    defineProps<{
        hoverName?: string
    }>(),
    {
        hoverName: '',
    }
)

const emit = defineEmits<{
    'update:name': [name: string]
    'update:bool': [value: boolean]
    'update:hoverName': [name: string]
}>()

const { t } = useI18n()
const printerStore = usePrinterStore()

const printing_objects = computed<{ name: string }[]>(() => printerStore.exclude_object?.objects ?? [])

const excluded_objects = computed<string[]>(() => printerStore.exclude_object?.excluded_objects ?? [])

function openExcludeObjectDialog(name: string) {
    emit('update:name', name)
    emit('update:bool', true)
}

function mouseOverObject(name: string) {
    emit('update:hoverName', name)
}
</script>
