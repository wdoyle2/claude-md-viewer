export type OpenFile = { path: string; text: string; error: string | null }

declare module 'claude-code' {
  interface PluginState {
    'md-viewer': { current: OpenFile | null }
  }
}
