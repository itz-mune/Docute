//Converts MD files to HTML Files

// noinspection SpellCheckingInspection
// import markdownit from 'markdown-it'
import * as fs from 'fs'
import * as path from 'path'
import { buildNavNode, buildSidebarHTML } from './scanner'
import { renderMarkdown, resolveTitle, sortFiles, stripOrderPrefix} from './utils'
import { loadConfig, DocuteConfig } from "./config";
// import replaceLink from 'markdown-it-replace-link'


const config = loadConfig()


// const md = markdownit({
//     html: true,
//     linkify: true,
//     typographer: true
// }).use(replaceLink, {
//     processHTML: true,
//     replaceLink: (link: string) => {
//         if (link.startsWith('http://') ||
//             link.startsWith('https://') ||
//             link.startsWith('www.')) {
//             return link  // leave external links untouched
//         }
//         if (link.endsWith('.md')) {
//             return path.basename(link, '.md') + '.html'
//         }
//         return link
//     }
// })

const navTree = buildNavNode(config.inputPath, config)
const sidebar = buildSidebarHTML(navTree, config)


//adds boilerplate metadata to the page
function buildTemplate(content: string, title: string): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <nav>
      <ul>
        ${sidebar}
      </ul>
    </nav>
    <main>
      ${content}
    </main>
  </body>
</html>`
}


//recursive function to check through directories and parse md to html files
export function recursiveParse(inputPath: string, config: DocuteConfig, outputPath?: string): void {
    const fileName: string = path.basename(inputPath, path.extname(inputPath))
    // slug strips the order prefix so output files match the rewritten links
    const slug: string = stripOrderPrefix(fileName)
    const resolvedOutput: string = outputPath ?? path.join(config.outputPath, slug + '.html')

    const isDirectory: boolean = fs.statSync(inputPath).isDirectory()

    if (!isDirectory) {
        if (path.extname(inputPath) === '.md') {
            const content: string = fs.readFileSync(inputPath, 'utf8')
            const { html: result, frontmatter, env } = renderMarkdown(content)
            const resolvedTitle: string = resolveTitle(config, env, frontmatter, fileName)
            const page: string = buildTemplate(result, resolvedTitle)

            fs.mkdirSync(config.outputPath, { recursive: true })
            fs.writeFileSync(resolvedOutput, page, 'utf8')
            console.log(`Done! Written to ${resolvedOutput}`)
        }
    } else {
        const files: string[] = fs.readdirSync(inputPath)
        const sorted: string[] = sortFiles(files, inputPath, config)
        for (const file of sorted) {
            const fullPath: string = path.join(inputPath, file)
            recursiveParse(fullPath, config)
        }
    }
}


