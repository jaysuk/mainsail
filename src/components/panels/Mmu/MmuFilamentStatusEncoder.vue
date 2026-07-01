<template>
    <g>
        <circle cx="258" cy="140" r="8" stroke-width="1" :class="encoderClass" />
        <path d="M257 135 L261 140 L257 145" stroke-width="2" fill="none" />
        <text x="278" y="145" :class="textClass">{{ t('Panels.MmuPanel.Encoder') }}</text>
        <text x="345" y="145" :class="textClass" font-size="11px">{{ encoderPosText }}</text>
        <transition name="fade">
            <text v-if="homedToEncoder" x="219.5" y="145" font-weight="bold">H</text>
        </transition>
    </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMmu, FILAMENT_POS_START_BOWDEN } from '@/composables/useMmu'

const { t } = useI18n()
const { mmuEncoder, mmuFilamentPos, configGateHomingEndstop } = useMmu()

const encoderClass = computed(() => (mmuEncoder.value?.enabled ? 'sensor-normal' : 'sensor-disabled'))

const textClass = computed(() => ({
    'text-disabled': !mmuEncoder.value?.enabled,
}))

const encoderPos = computed(() => Math.round(mmuEncoder.value?.encoder_pos ?? 0))

const encoderPosText = computed(() => (encoderPos.value < 10000 ? `${encoderPos.value} mm` : `${encoderPos.value}`))

const homedToEncoder = computed<boolean>(() => configGateHomingEndstop.value === 'encoder' && mmuFilamentPos.value === FILAMENT_POS_START_BOWDEN)
</script>

<style scoped>
text {
    fill: currentColor;
}

.text-disabled {
    opacity: 0.5;
}

.sensor-disabled {
    stroke: var(--disabled-stroke);
    stroke-dasharray: 2, 1;
    fill: var(--zone-background-dark-theme);
}

html.theme--light .sensor-disabled {
    fill: var(--zone-background-light-theme);
}

.sensor-normal {
    fill: var(--zone-background-dark-theme);
}

html.theme--light .sensor-normal {
    fill: var(--zone-background-light-theme);
}
</style>
