// markdown-it-code-copy ships no type definitions
declare module 'markdown-it-code-copy' {
    import type { PluginWithOptions } from 'markdown-it'

    interface CodeCopyOptions {
        iconStyle?: string
        iconClass?: string
        buttonStyle?: string
        buttonClass?: string
        element?: string
        removeEndNewline?: boolean
        onSuccess?: (...args: any[]) => void
        onError?: (...args: any[]) => void
    }

    const plugin: PluginWithOptions<CodeCopyOptions>
    export default plugin
}
