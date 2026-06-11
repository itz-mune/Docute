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
  ${cmd('init')}                Scaffold a docurator.config.json (and a sample docs/ folder).
  ${cmd('create, build')}       Generate the website from your Markdown files.
  ${cmd('serve, dev')}          Build, serve locally, and live-reload on every change.
  ${cmd('help')}                Show this help.
  ${cmd('version')}             Show the installed version.

${bold('Options')} ${gray('(override docurator.config.json):')}
  ${flag('-i, --input')} <dir>        Markdown source directory   ${gray('(default: docs)')}
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

${bold('Examples:')}
  ${gray('$')} docurator create
  ${gray('$')} docurator create --input . --theme neon --mode spa
  ${gray('$')} docurator build -o ./site --nav right --page-nav scroll
  ${gray('$')} docurator serve --port 4000
`
}

// scaffolds a starter project in the current directory (non-destructive)
function init(): void {
    const cwd = process.cwd()

    // 1. docurator.config.json — an explicit copy of the defaults to edit
    const configPath = path.join(cwd, 'docurator.config.json')
    if (fs.existsSync(configPath)) {
        console.log(ui.info('docurator.config.json already exists — left untouched.'))
    } else {
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
        console.log(ui.success(`Created ${ui.path('docurator.config.json')}`))
    }

    // 2. a sample docs/ folder with one page, only if the input dir is missing
    const docsDir = path.join(cwd, defaultConfig.inputPath)
    if (fs.existsSync(docsDir)) {
        console.log(ui.info(`${defaultConfig.inputPath}/ already exists — left untouched.`))
    } else {
        fs.mkdirSync(docsDir, { recursive: true })
        const sample = `---
title: Introduction
order: 1
---

# Introduction

Welcome to your new **Docurator** site! Edit the Markdown files in \`${defaultConfig.inputPath}/\`
and run \`docurator create\` to regenerate the website.
`
        fs.writeFileSync(path.join(docsDir, '01-introduction.md'), sample, 'utf8')
        console.log(ui.success(`Created ${ui.path(`${defaultConfig.inputPath}/01-introduction.md`)}`))
    }

    console.log(`\nNext: edit your Markdown, then run ${colors.cyan('docurator create')}.`)
}

function build(config: DocuratorConfig, quiet = false): void {
    // fail fast if two pages (anywhere in the tree) resolve to the same slug
    checkDuplicateSlugs(config.inputPath)

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
            const config = loadConfig()
            // reload config on every rebuild so edits to docurator.config.json
            // (theme, mode, etc.) take effect live, not just Markdown changes
            serve(config, () => build(loadConfig(), true), readPort())
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
