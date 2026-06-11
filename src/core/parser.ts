//Converts MD files to HTML Files

// noinspection SpellCheckingInspection
import * as fs from 'fs'
import * as path from 'path'
import { buildNavNode, buildSidebarHTML } from './scanner'
import { renderMarkdown, resolveTitle, sortFiles, stripOrderPrefix, getCodeCopyScript, isSkippableDir} from './utils'
import { DocuratorConfig } from "./config";
import { flattenNav, PageRef, buildPaginationFooter, multiScrollScript } from "./pagination";
import { colors, ui } from "./colors";


// everything buildTemplate needs that's computed once per build (not per file)
interface BuildContext {
    config: DocuratorConfig
    sidebar: string
    pages: PageRef[]
}


//adds boilerplate metadata to the page
function buildTemplate(ctx: BuildContext, content: string, title: string, slug: string): string {
    const { config, sidebar, pages } = ctx
    const isScroll = config.pageNav === 'scroll'
    const index = pages.findIndex(p => p.slug === slug)

    let pageNavFooter = ''
    let pageNavScript = ''
    if (index >= 0) {
        if (isScroll) {
            // last page wraps back to the first
            const nextSlug = index === pages.length - 1 ? pages[0].slug : pages[index + 1].slug
            pageNavScript = multiScrollScript(`${nextSlug}.html`)
        } else {
            pageNavFooter = buildPaginationFooter(pages, index, 'multi')
        }
    }
    const bodyClass = isScroll ? 'nav-scroll' : 'nav-buttons'

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="stylesheet" href="theme.css">
  </head>
  <body class="${bodyClass}">
    <nav>
      <ul>
        ${sidebar}
      </ul>
    </nav>
    <main>
      ${content}
      ${pageNavFooter}
    </main>
    ${pageNavScript}
    ${getCodeCopyScript(config)}
  </body>
</html>`
}


// recursively walks the tree, rendering each .md to its own .html
function walk(ctx: BuildContext, inputPath: string): void {
    const isDirectory: boolean = fs.statSync(inputPath).isDirectory()

    if (!isDirectory) {
        if (path.extname(inputPath) === '.md') {
            const fileName: string = path.basename(inputPath, path.extname(inputPath))
            // slug strips the order prefix so output files match the rewritten links
            const slug: string = stripOrderPrefix(fileName)
            const resolvedOutput: string = path.join(ctx.config.outputPath, slug + '.html')

            const content: string = fs.readFileSync(inputPath, 'utf8')
            const { html: result, frontmatter, env } = renderMarkdown(content)
            const resolvedTitle: string = resolveTitle(ctx.config, env, frontmatter, fileName)
            const page: string = buildTemplate(ctx, result, resolvedTitle, slug)

            fs.mkdirSync(ctx.config.outputPath, { recursive: true })
            fs.writeFileSync(resolvedOutput, page, 'utf8')
            console.log(`${colors.green('✓')} ${colors.gray(resolvedOutput)}`)
        }
    } else {
        const files: string[] = fs.readdirSync(inputPath)
        const sorted: string[] = sortFiles(files, inputPath, ctx.config)
        for (const file of sorted) {
            const child = path.join(inputPath, file)
            // skip output dir / dotfolders / node_modules when walking "."
            if (fs.statSync(child).isDirectory() && isSkippableDir(child, ctx.config)) continue
            walk(ctx, child)
        }
    }
}


// multi-mode entry point: builds the nav context once, then walks the tree
export function recursiveParse(inputPath: string, config: DocuratorConfig): void {
    const navTree = buildNavNode(inputPath, config)
    const pages = flattenNav(navTree)
    const ctx: BuildContext = {
        config,
        sidebar: buildSidebarHTML(navTree, config),
        // flat ordered page list for prev/next + scroll wrap-around
        pages,
    }
    walk(ctx, inputPath)
    writeIndexRedirect(ctx, pages)
}


// Multi mode writes one .html per page (introduction.html, faq.html, …) but no
// index.html, so visiting "/" 404s in a browser or static host. Write a tiny
// index.html that forwards to the home page (config.home, else the first page).
function writeIndexRedirect(ctx: BuildContext, pages: PageRef[]): void {
    if (pages.length === 0) return

    const home = ctx.config.home && pages.some(p => p.slug === ctx.config.home)
        ? ctx.config.home
        : pages[0].slug
    const target = `${home}.html`

    // if the home page is already named "index", its own output IS index.html —
    // writing a redirect here would overwrite that page with a self-redirect loop
    if (target === 'index.html') return

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=${target}" />
    <link rel="canonical" href="${target}" />
    <title>Redirecting…</title>
  </head>
  <body>
    <p>Redirecting to <a href="${target}">${target}</a>…</p>
    <script>location.replace(${JSON.stringify(target)})</script>
  </body>
</html>`

    const indexPath = path.join(ctx.config.outputPath, 'index.html')
    fs.writeFileSync(indexPath, html, 'utf8')
    console.log(`${colors.green('✓')} ${colors.gray(indexPath)} ${ui.muted(`→ ${target}`)}`)
}
