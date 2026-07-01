import { defineAsyncComponent } from 'vue'

/**
 * Load code mirror into a chunk
 */
export default defineAsyncComponent(() => import('@/components/inputs/Codemirror.vue'))
