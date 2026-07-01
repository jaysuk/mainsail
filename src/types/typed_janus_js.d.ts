// typed_janus_js's package.json "exports" map only lists the package root
// (no "types" condition, and no subpaths at all), so TypeScript can't resolve
// either `typed_janus_js` or any `typed_janus_js/dist/...` subpath under
// moduleResolution: "bundler". Re-declare the handful of symbols this project
// actually consumes (JanusStreamer.vue), sourced by relative path straight
// into the installed dist files, which sidesteps package-name/exports-map
// resolution entirely.
declare module 'typed_janus_js' {
    export { JanusJs } from '../../node_modules/typed_janus_js/dist/janus_js'
    export { JanusSession } from '../../node_modules/typed_janus_js/dist/janus_session'
    export { JanusStreamingPlugin } from '../../node_modules/typed_janus_js/dist/wrapper_plugins/streaming'
}

declare module 'typed_janus_js/dist/interfaces/janus' {
    export { ConstructorOptions, MessageCallback, JSEP } from '../../../node_modules/typed_janus_js/dist/interfaces/janus'
}
