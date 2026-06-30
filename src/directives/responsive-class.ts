import throttle from 'lodash.throttle'
import type { Directive } from 'vue'

type ResponsiveConditions = Record<string, (cr: DOMRectReadOnly) => boolean>

const responsiveClass: Directive<HTMLElement, ResponsiveConditions> = {
    mounted(el, conds) {
        const handleResize = throttle((entries: ResizeObserverEntry[]) => {
            const cr = entries[0].contentRect
            for (const breakpoint in conds.value) {
                el.classList.toggle(breakpoint, conds.value[breakpoint](cr))
            }
        }, 50)

        const observer = new ResizeObserver(handleResize)
        observer.observe(el)
    },
}

export default responsiveClass
