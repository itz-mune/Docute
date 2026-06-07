//Converts MD files to HTML Files

// noinspection SpellCheckingInspection
import markdownit from 'markdown-it'
import * as fs from 'fs'
import * as path from 'path'
import { buildNavNode, buildSidebarHTML } from './scanner'
import replaceLink from 'markdown-it-replace-link'


const md = markdownit({
    html: true,
    linkify: true,
    typographer: true
}).use(replaceLink, {
        processHTML: true,
        replaceLink: (link: string) => {
            if (link.endsWith('.md')) {
                return path.basename(link, '.md') + '.html'
            }
            return link
        }
    })

const navTree = buildNavNode('docs')
const sidebar = buildSidebarHTML(navTree)


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
function recursiveParse(inputPath: string, outputPath?: string, title?: string): void {

    const fileName: string = path.basename(inputPath, path.extname(inputPath))
    const resolvedOutput: string = outputPath ?? path.join('dist', fileName + '.html')
    const resolvedTitle: string = title ?? fileName

    const isDirectory: boolean = fs.statSync(inputPath).isDirectory()
    if (!isDirectory) {
        if (path.extname(inputPath) === '.md') {
            const content: string = fs.readFileSync(inputPath, 'utf8')
            const result: string = md.render(content)
            const html: string = buildTemplate(result, resolvedTitle)
            fs.mkdirSync('dist', { recursive: true })
            fs.writeFileSync(resolvedOutput, html, 'utf8')
            console.log(`Done! Written to ${resolvedOutput}`)
        }
    } else {
        for (const file of fs.readdirSync(inputPath)) {
            const fullPath: string = path.join(inputPath, file)
            recursiveParse(fullPath)
        }
    }
}


recursiveParse('docs')