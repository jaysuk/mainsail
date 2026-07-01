export interface RootState {
    packageVersion: string
    debugMode: boolean
    naviDrawer: boolean | null
    instancesDB: 'moonraker' | 'browser' | 'json'
    configInstances: ConfigJsonInstance[]
}

export interface RootStateDependency {
    serviceName: string
    installedVersion: string
    neededVersion: string
}

export interface ConfigJson {
    defaultTheme?: 'dark' | 'light'
    hostname?: string | null
    port?: string | number | null
    path?: string | null
    instancesDB?: 'moonraker' | 'browser' | 'json'
    instances?: ConfigJsonInstance[]
    // URLs of Mainsail plugin ES modules to dynamically import at boot, each
    // exporting an `install(api: MainsailPluginApi)` function. See
    // src/plugins/mainsail/pluginLoader.ts.
    plugins?: string[]
}

export interface ConfigJsonInstance {
    hostname: string
    port?: number
    path?: string
}

export interface Theme {
    name: string
    displayName: string
    colorLogo: string
    colorPrimary?: string
    logo?: {
        show: boolean
        light: boolean
    }
    sidebarBackground?: {
        show: boolean
        light: boolean
    }
    mainBackground?: {
        show: boolean
        light: boolean
    }
    css?: boolean
}

export interface KlipperRepos {
    [name: string]: {
        url: string
        docsLanguages?: string[]
    }
}
