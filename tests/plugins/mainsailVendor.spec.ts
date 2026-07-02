import { describe, expect, it, afterEach } from 'vitest'
import { createApp } from 'vue'
import { installVendorGlobals, registerVuetifyGlobals } from '@/plugins/mainsail/vendor'
import { loadPlugins } from '@/plugins/mainsail/pluginLoader'

describe('installVendorGlobals', () => {
    afterEach(() => {
        delete window.__mainsailVendor
    })

    it('exposes the real Vue module namespace', () => {
        installVendorGlobals()

        expect(window.__mainsailVendor?.vue.ref).toBeTypeOf('function')
    })
})

describe('registerVuetifyGlobals', () => {
    it('globally registers a curated set of Vuetify components on the app instance', () => {
        const app = createApp({ template: '<div />' })

        registerVuetifyGlobals(app)

        expect(app.component('VBtn')).toBeDefined()
        expect(app.component('VDialog')).toBeDefined()
        expect(app.component('VTextField')).toBeDefined()
    })

    it('globally registers Vuetify directives under their kebab-case template name', () => {
        const app = createApp({ template: '<div />' })

        registerVuetifyGlobals(app)

        expect(app.directive('ripple')).toBeDefined()
        expect(app.directive('click-outside')).toBeDefined()
    })
})

describe('loadPlugins', () => {
    afterEach(() => {
        delete window.__mainsailVendor
    })

    it('does not require any vendor global to already be installed', async () => {
        const importer = async () => ({ install: () => {} })

        await expect(loadPlugins(['https://example.com/plugin.js'], importer)).resolves.toBeUndefined()
    })
})
