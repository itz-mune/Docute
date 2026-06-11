import * as fs from 'fs'
import * as path from 'path'

export interface DocuratorConfig {
    titleSource: 'frontmatter' | 'h1' | 'filename' | 'auto'
    orderSource: 'frontmatter' | 'prefix' | 'alphabetical' | 'auto'
    mode: 'multi' | 'spa'
    inputPath: string
    outputPath: string
    // when a file and directory share the same numeric prefix, which comes first
    tiePriority: 'file' | 'directory'
    home?: string
    theme?: 'default' | 'dark' | 'catppuccin' | 'dracula' | 'material' | 'neon' | 'pastel'
    // path to a CSS file appended after the theme, for custom overrides
    customCss?: string
    // which side the sidebar sits on
    navPosition?: 'left' | 'right'
    // how the reader moves between pages/sections
    pageNav?: 'buttons' | 'scroll'
}

export const defaultConfig: DocuratorConfig = {
    titleSource: 'auto',
    orderSource: 'auto',
    mode: 'multi',
    inputPath: 'docs',
    outputPath: 'dist',
    tiePriority: 'file',
    theme: "default",
    navPosition: 'left',
    pageNav: 'buttons'
}

// maps a CLI flag (long or short) to the config key it overrides
const FLAG_TO_KEY: Record<string, keyof DocuratorConfig> = {
    '--mode': 'mode', '-m': 'mode',
    '--theme': 'theme', '-t': 'theme',
    '--input': 'inputPath', '-i': 'inputPath',
    '--output': 'outputPath', '-o': 'outputPath',
    '--nav': 'navPosition',
    '--page-nav': 'pageNav',
    '--title-source': 'titleSource',
    '--order-source': 'orderSource',
    '--tie-priority': 'tiePriority',
    '--home': 'home',
    '--custom-css': 'customCss',
}

// Parses CLI flags into a partial config. Supports "--flag value" and
// "--flag=value". Positional args (e.g. the "create" command) are ignored,
// so this is safe to run from inside loadConfig regardless of the command.
export function parseCliFlags(argv: string[]): Partial<DocuratorConfig> {
    const out: Partial<DocuratorConfig> = {}

    for (let i = 0; i < argv.length; i++) {
        const token = argv[i]
        if (!token.startsWith('-')) continue

        const eq = token.indexOf('=')
        const flag = eq >= 0 ? token.slice(0, eq) : token
        const key = FLAG_TO_KEY[flag]
        if (!key) continue

        // value is either after "=" or the next token
        const value = eq >= 0 ? token.slice(eq + 1) : argv[++i]
        if (value === undefined) continue

        // all overridable keys are string-valued, so a plain cast is safe here
        ;(out as Record<string, string>)[key] = value
    }

    return out
}

export function loadConfig(argv: string[] = process.argv.slice(2)): DocuratorConfig {
    const configPath = path.join(process.cwd(), 'docurator.config.json')

    let fileConfig: Partial<DocuratorConfig> = {}
    if (fs.existsSync(configPath)) {
        try {
            fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        } catch {
            console.warn(`\x1b[33m!\x1b[39m Could not parse ${configPath}; ignoring it.`)
        }
    }

    // precedence: defaults < docurator.config.json < CLI flags
    return { ...defaultConfig, ...fileConfig, ...parseCliFlags(argv) }
}
