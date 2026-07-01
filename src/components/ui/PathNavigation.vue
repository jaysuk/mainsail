<template>
    <span>
        <span v-for="({ directoryName, location }, index) in pathSegments" :key="location" class="navigation-container">
            <template v-if="index !== 0">
                <span class="navigation-divider text--disabled">{{ segmentSeparator }}</span>
            </template>
            <template v-if="index !== pathSegments.length - 1">
                <span
                    class="cursor-pointer navigation-segment"
                    tabindex="0"
                    role="button"
                    @click="onSegmentClick({ location })"
                    @keyup.enter="onSegmentClick({ location })">
                    <template v-if="directoryName">{{ directoryName }}</template>
                    <template v-else>{{ baseDirectoryLabel }}</template>
                </span>
            </template>
            <template v-else>
                <span>
                    <template v-if="directoryName">{{ directoryName }}</template>
                    <template v-else>{{ baseDirectoryLabel }}</template>
                </span>
            </template>
        </span>
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface pathSegment {
    directoryName: string
    location: string
}

const props = withDefaults(
    defineProps<{
        /** Current path to be displayed in the breadcrumbs. */
        path?: string
        /**
         * Display label for the first directory in the path passed in absolute format
         * (a path starting with `/` character). Useful for local paths, where
         * the navigator deals with routes in some context (eg. all paths in the `/gcodes` directory).
         */
        baseDirectoryLabel?: string
        /**
         * Event handler triggered on breadcrumb segment interaction.
         *
         * `segment.location` is the full location of the selected path segment,
         * eg. for path `/foo/bar/baz`, when `bar` has been selected, `location` is equal to
         * `/foo/bar`.
         */
        onSegmentClick: (segment: { location: string }) => void
    }>(),
    {
        path: undefined,
        baseDirectoryLabel: undefined,
    }
)

const segmentSeparator = '/'

const pathSegments = computed<pathSegment[]>(() => {
    const [firstSegment, ...restOfSegments] = (props.path || '').split(segmentSeparator)

    const firstPathSegment = {
        directoryName: firstSegment,
        location: firstSegment,
    }

    return restOfSegments.reduce(
        (allSegments: pathSegment[], currentSegment: string) => {
            const previousSegmentLocation = allSegments[allSegments.length - 1].location
            const location = `${previousSegmentLocation}${segmentSeparator}${currentSegment}`

            allSegments.push({ directoryName: currentSegment, location })

            return allSegments
        },
        [firstPathSegment]
    )
})
</script>

<style scoped>
.navigation-divider {
    padding: 0 2px;
}
.navigation-segment:hover {
    text-decoration: underline;
}
.navigation-container:last-child {
    font-weight: bold;
}
</style>
