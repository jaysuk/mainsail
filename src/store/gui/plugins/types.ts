export interface GuiPluginsState {
    plugins: {
        [id: string]: GuiPluginsStatePlugin
    }
}

export interface GuiPluginsStatePlugin {
    id: string
    name: string
    author: string
    version: string
    license?: string
    homepage?: string
    entryUrl: string
    enabled: boolean
}
