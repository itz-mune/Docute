declare module 'markdown-it-html5-media' {
    import { PluginWithOptions } from 'markdown-it'

    interface Html5MediaOptions {
        // override the default attributes added to <video>/<audio> tags
        videoAttrs?: string
        audioAttrs?: string
        // localized fallback messages ("Your browser does not support…")
        messages?: Record<string, Record<string, string>>
        // translation key lookup
        translateFn?: (language: string, key: string, params: string[]) => string
    }

    export const html5Media: PluginWithOptions<Html5MediaOptions>
    export const messages: Record<string, Record<string, string>>
    export function guessMediaType(url: string): 'video' | 'audio' | 'image'
}
