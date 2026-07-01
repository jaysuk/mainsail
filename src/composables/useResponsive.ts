import { reactive, onMounted, onBeforeUnmount, nextTick, type Ref } from 'vue'
import throttle from 'lodash.throttle'

export type ResponsiveElement = {
    is: Record<string, boolean>
}

/**
 * Replaces the Vue 2 `ResponsiveMixin` class component. Observes the given
 * template ref's size and evaluates `breakpoints` predicates against its
 * `DOMRect` on resize, mirroring the original `this.$el`-based mixin (which
 * only worked because a mixin's root element *is* the host component's
 * template root -- callers must now pass that root's template ref
 * explicitly).
 */
export function useResponsive(elRef: Ref<HTMLElement | null | undefined>, breakpoints?: Record<string, (el: DOMRect) => boolean>) {
    const el: ResponsiveElement = reactive({ is: {} })
    let observer: ResizeObserver | undefined

    const onResize = (entries: ResizeObserverEntry[]) => {
        if (entries[0].contentRect.height === 0 && entries[0].contentRect.width === 0) {
            return
        }

        const cr = entries[0].contentRect
        if (!breakpoints) return

        for (const breakpoint in breakpoints) {
            el.is[breakpoint] = breakpoints[breakpoint](cr)
        }
    }

    onMounted(() => {
        if (breakpoints) {
            nextTick(() => {
                observer = new ResizeObserver(throttle(onResize, 50))
                if (elRef.value instanceof Element) {
                    observer.observe(elRef.value)
                }
            })
        }
    })

    onBeforeUnmount(() => {
        if (elRef.value instanceof Element) {
            observer?.unobserve(elRef.value)
        }
    })

    return { el }
}
