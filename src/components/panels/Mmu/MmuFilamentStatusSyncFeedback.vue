<template>
    <g v-if="hasSyncFeedback">
        <use
            xlink:href="#sync-feedback-buffer-piston"
            :style="{
                transform: `translate(232px, ${syncFeedbackPistonPos}px)`,
                transition: 'transform 250ms ease',
            }" />
        <use xlink:href="#sync-feedback-buffer-box" transform="translate(232, 212)" />
        <g v-if="syncFeedbackActive">
            <transition name="fade">
                <g v-if="syncFeedbackState === 'neutral'" key="neutral">
                    <text x="298" y="240">Neutral</text>
                    <use xlink:href="#sync-feedback" transform="translate(296, 247.5) scale(1.0,-1.0) rotate(90)" />
                </g>
                <g v-else-if="syncFeedbackState === 'tension'" key="tension">
                    <text x="298" y="240">Tension</text>
                    <use xlink:href="#sync-feedback" transform="translate(272, 199) scale(1.2)" />
                    <use xlink:href="#sync-feedback" transform="translate(272, 271) scale(1.2,-1.2)" />
                </g>
                <g v-else-if="syncFeedbackState === 'compressed'" key="compression">
                    <text x="298" y="240">Compression</text>
                    <use xlink:href="#sync-feedback" transform="translate(272, 235) scale(1.2)" />
                    <use xlink:href="#sync-feedback" transform="translate(272, 235) scale(1.2,-1.2)" />
                </g>
            </transition>
        </g>
    </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMmu, FILAMENT_POS_END_BOWDEN } from '@/composables/useMmu'

const { mmu, mmuFilamentPos, hasSyncFeedback } = useMmu()

const syncFeedbackActive = computed<boolean>(() => {
    const enabled = mmu.value?.sync_feedback_enabled ?? false
    const loaded = mmuFilamentPos.value >= FILAMENT_POS_END_BOWDEN
    return hasSyncFeedback.value && enabled && loaded
})

const syncFeedbackBiasModelled = computed(() => mmu.value?.sync_feedback_bias_modelled ?? 0.0)

const syncFeedbackPistonPos = computed<number>(() => syncFeedbackBiasModelled.value * 12 + 234)

const syncFeedbackState = computed(() => mmu.value?.sync_feedback_state ?? '')
</script>

<style scoped>
text {
    fill: currentColor;
}
</style>
