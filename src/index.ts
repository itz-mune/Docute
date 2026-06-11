#!/usr/bin/env node
import * as fs from 'fs'
import * as path from 'path'
import { loadConfig, defaultConfig, DocuratorConfig } from './core/config'
import { recursiveParse } from './core/parser'
import { buildSPA } from './core/spa'
import { writeTheme } from './core/theme'
import { checkDuplicateSlugs, cleanOutput } from './core/utils'
import { serve } from './core/serve'
import { colors, ui } from './core/colors'

const VERSION = '1.0.0'

function helpText(): string {
    const { bold, cyan, gray, magenta } = colors
    const cmd = (c: string) => cyan(c)
    const flag = (f: string) => cyan(f)
    return `
${ui.heading('Docurator')} ${gray('—')} turn a folder of Markdown into a documentation website.

${bold('Usage:')}
  ${magenta('docurator')} ${cyan('<command>')} ${gray('[options]')}

${bold('Commands:')}
  ${cmd('init')}                Drop a docurator.config.json you can edit (optional).
  ${cmd('create, build')}       Generate the website from your Markdown files.
  ${cmd('serve, dev')}          Build, serve locally, open the browser, and live-reload.
  ${cmd('help')}                Show this help.
  ${cmd('version')}             Show the installed version.

${gray('Run any command inside your Markdown folder — config is auto-created if missing.')}

${bold('Options')} ${gray('(override docurator.config.json):')}
  ${flag('-i, --input')} <dir>        Markdown source directory   ${gray('(default: .)')}
  ${flag('-o, --output')} <dir>       Output directory            ${gray('(default: dist)')}
  ${flag('-m, --mode')} <multi|spa>   Multi-page or single-page   ${gray('(default: multi)')}
  ${flag('-t, --theme')} <name>       default | dark | catppuccin | dracula |
                           material | neon | pastel    ${gray('(default: default)')}
      ${flag('--nav')} <left|right>   Sidebar position            ${gray('(default: left)')}
      ${flag('--page-nav')} <buttons|scroll>
                           Page switching style        ${gray('(default: buttons)')}
      ${flag('--title-source')} <frontmatter|h1|filename|auto>
      ${flag('--order-source')} <frontmatter|prefix|alphabetical|auto>
      ${flag('--tie-priority')} <file|directory>
      ${flag('--home')} <slug>
      ${flag('--custom-css')} <file>  Extra CSS appended after the theme
      ${flag('--port')} <number>      Dev-server port (serve only)      ${gray('(default: 3000)')}
      ${flag('--no-open')}            Don't auto-open the browser (serve only)

${bold('Examples:')}
  ${gray('$')} docurator serve
  ${gray('$')} docurator create --theme neon --mode spa
  ${gray('$')} docurator build -o ./site --nav right --page-nav scroll
  ${gray('$')} docurator serve --port 4000 --no-open
`
}

// Writes docurator.config.json (an explicit copy of the defaults) into the
// current directory if it doesn't already exist. Returns true if it created it.
// Shared by `init`, `create`, and `serve` so a config is always present.
function ensureConfig(): boolean {
    const configPath = path.join(process.cwd(), 'docurator.config.json')
    if (fs.existsSync(configPath)) return false

    const starter = {
        titleSource: defaultConfig.titleSource,
        orderSource: defaultConfig.orderSource,
        mode: defaultConfig.mode,
        inputPath: defaultConfig.inputPath,
        outputPath: defaultConfig.outputPath,
        tiePriority: defaultConfig.tiePriority,
        theme: defaultConfig.theme,
        navPosition: defaultConfig.navPosition,
        pageNav: defaultConfig.pageNav,
    }
    fs.writeFileSync(configPath, JSON.stringify(starter, null, 2) + '\n', 'utf8')
    return true
}

// `init` just drops a config you can edit — it does NOT scaffold a docs/ folder.
// The default inputPath is "." so you run docurator inside your Markdown folder.
function init(): void {
    if (ensureConfig()) {
        console.log(ui.success(`Created ${ui.path('docurator.config.json')}`))
    } else {
        console.log(ui.info('docurator.config.json already exists — left untouched.'))
    }
    console.log(
        `\nNext: run ${colors.cyan('docurator serve')} in this folder to preview your docs ` +
        `${colors.gray('(or')} ${colors.cyan('docurator create')} ${colors.gray('to just build).')}`
    )
}

function build(config: DocuratorConfig, quiet = false): void {
    // fail fast if two pages (anywhere in the tree) resolve to the same slug
    checkDuplicateSlugs(config.inputPath, config)

    // wipe previously-generated .html/theme.css so renamed/deleted pages don't
    // leave orphans (safe: only removes files Docurator emits, not user assets)
    cleanOutput(config.outputPath)

    // emit theme.css (built-in palette + optional customCss overrides)
    writeTheme(config)

    if (config.mode === 'spa') {
        buildSPA(config.inputPath, config)
    } else {
        recursiveParse(config.inputPath, config)
    }

    if (!quiet) console.log(ui.success(colors.bold('Your documentation site is ready.')))
}

// --port is serve-only, so it's read here rather than in loadConfig.
// Supports "--port 4000" and "--port=4000"; defaults to 3000.
function readPort(): number {
    const argv = process.argv
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--port' && argv[i + 1]) return parseInt(argv[i + 1], 10) || 3000
        if (argv[i].startsWith('--port=')) return parseInt(argv[i].slice(7), 10) || 3000
    }
    return 3000
}

function main(): void {
    const command = process.argv[2]

    switch (command) {
        case 'init':
            init()
            break
        case 'create':
        case 'build': {
            // auto-create the config if it's missing, so `create` works alone
            if (ensureConfig()) {
                console.log(ui.success(`Created ${ui.path('docurator.config.json')} ${colors.gray('(defaults)')}`))
            }
            const config = loadConfig()
            try {
                build(config)
            } catch (err) {
                console.error(ui.error((err as Error).message))
                process.exit(1)
            }
            break
        }
        case 'serve':
        case 'dev': {
            // auto-create the config if it's missing, so `serve` works alone
            if (ensureConfig()) {
                console.log(ui.success(`Created ${ui.path('docurator.config.json')} ${colors.gray('(defaults)')}`))
            }
            const config = loadConfig()
            // reload config on every rebuild so edits to docurator.config.json
            // (theme, mode, etc.) take effect live, not just Markdown changes
            const openBrowser = !process.argv.includes('--no-open')
            serve(config, () => build(loadConfig(), true), readPort(), openBrowser)
            break
        }
        case 'version':
        case '--version':
        case '-v':
            console.log(`${ui.heading('docurator')} ${colors.gray('v' + VERSION)}`)
            break
        case undefined:
        case 'help':
        case '--help':
        case '-h':
            console.log(helpText())
            break
        default:
            console.error(ui.error(`Unknown command: ${colors.bold(command)}`))
            console.log(helpText())
            process.exit(1)
    }
}

main()
