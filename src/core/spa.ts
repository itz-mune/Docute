// import markdownit from 'markdown-it'
import * as fs from 'fs'
import * as path from 'path'
import { buildNavNode, buildSidebarHTML } from './scanner'
// import replaceLink from 'markdown-it-replace-link'
import { renderMarkdown, resolveTitle, sortFiles, stripOrderPrefix, getCodeCopyScript, isSkippableDir} from "./utils";
import { DocuratorConfig } from "./config";
import { PageRef, buildPaginationFooter, spaButtonsScript, spaScrollScript } from "./pagination";
import { colors } from "./colors";


//Interface
interface Section {
    id: string
    title: string
    content: string
}

// const md = markdownit({
//     html: true,
//     linkify: true,
//     typographer: true
// }).use(replaceLink, {
//     processHTML: true,
//     replaceLink: (link: string) => {
//         if (link.endsWith('.md')) {
//             return path.basename(link, '.md') + '.html'
//         }
//         return link
//     }
// })

// const navTree = buildNavNode('docs')
// const sidebar = buildSidebarHTML(navTree, 'spa')


// collects all MD files recursively and returns array of {id, content}
function collectSections(dirPath: string, config: DocuratorConfig): Section[] {
    const items: string[] = fs.readdirSync(dirPath)
    const sections: Section[] = []
    const sorted: string[] = sortFiles(items, dirPath, config)

    for (const item of sorted) {
        const fullPath: string = path.join(dirPath, item)
        const isDirectory: boolean = fs.statSync(fullPath).isDirectory()
        const rawName: string = path.basename(item, path.extname(item))

        if (!isDirectory) {
            if (path.extname(item) === '.md') {
                const content: string = fs.readFileSync(fullPath, 'utf8')  // ✅ fullPath not inputPath
                const { html: result, frontmatter, env } = renderMarkdown(content)
                const title: string = resolveTitle(config, env, frontmatter, rawName)  // ✅ rawName not fileName, title not resolvedTitle

                sections.push({
                    id: stripOrderPrefix(rawName),
                    title,        // ✅ correct
                    content: result
                })
            }
        } else {
            // never descend into the output dir, dotfolders, or node_modules
            if (isSkippableDir(fullPath, config)) continue
            const children: Section[] = collectSections(fullPath, config)
            if (children.length > 0) {
                sections.push(...children)
            }
        }
    }

    return sections
}




// builds the full single page HTML
function buildSPATemplate(sections: Section[], sidebar: string, config: DocuratorConfig): string {
    const isScroll = config.pageNav === 'scroll'
    const pages: PageRef[] = sections.map(s => ({ slug: s.id, title: s.title }))

    const sectionsHTML = sections.map((section, i) => `
        <section id="${section.id}" class="spa-section">
            ${section.content}
            ${isScroll ? '' : buildPaginationFooter(pages, i, 'spa')}
        </section>
    `).join('\n')

    const pageNavScript = isScroll ? spaScrollScript() : spaButtonsScript()
    const bodyClass = isScroll ? 'nav-scroll' : 'nav-buttons'

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Docurator</title>
    <link rel="stylesheet" href="theme.css">
  </head>
  <body class="${bodyClass}">
    <nav>
      <ul>
        ${sidebar}
      </ul>
    </nav>
    <main>
      ${sectionsHTML}
    </main>

    ${pageNavScript}
    ${getCodeCopyScript(config)}
  </body>
</html>`
}

// main entry point
export function buildSPA(inputPath: string, config: DocuratorConfig): void {
    const sections: Section[] = collectSections(inputPath, config)
    const navTree = buildNavNode(inputPath, config)
    const sidebar: string = buildSidebarHTML(navTree, config, 'spa')
    const html: string = buildSPATemplate(sections, sidebar, config)

    fs.mkdirSync(config.outputPath, { recursive: true })
    fs.writeFileSync(path.join(config.outputPath, 'index.html'), html, 'utf8')
    console.log(`${colors.green('✓')} ${colors.gray(`${config.outputPath}/index.html`)}`)
}
