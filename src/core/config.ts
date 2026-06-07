import * as fs from 'fs'
import * as path from 'path'

export interface DocuteConfig {
    titleSource: 'frontmatter' | 'h1' | 'filename' | 'auto'
    orderSource: 'frontmatter' | 'prefix' | 'alphabetical' | 'auto'
    mode: 'multi' | 'spa'
    inputPath: string
    outputPath: string
    // when a file and directory share the same numeric prefix, which comes first
    tiePriority: 'file' | 'directory'
}

export const defaultConfig: DocuteConfig = {
    titleSource: 'auto',
    orderSource: 'auto',
    mode: 'multi',
    inputPath: 'docs',
    outputPath: 'dist',
    tiePriority: 'file'
}

export function loadConfig(): DocuteConfig {
    const configPath = path.join(process.cwd(), 'docute.config.json')
    console.log('Looking for config at:', configPath)  // 👈 add this
    console.log('Config exists:', fs.existsSync(configPath))  // 👈 and this

    if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8')
        const userConfig = JSON.parse(raw)
        console.log('Loaded config:', userConfig)  // 👈 and this
        return { ...defaultConfig, ...userConfig }
    }

    return defaultConfig
}