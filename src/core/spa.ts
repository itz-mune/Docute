// import markdownit from 'markdown-it'
import * as fs from 'fs'
import * as path from 'path'
import { buildNavNode, buildSidebarHTML } from './scanner'
// import replaceLink from 'markdown-it-replace-link'
import { renderMarkdown, resolveTitle, sortFiles, stripOrderPrefix} from "./utils";
import { DocuteConfig } from "./config";


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
function collectSections(dirPath: string, config: DocuteConfig): Section[] {
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
            const children: Section[] = collectSections(fullPath, config)
            if (children.length > 0) {
                sections.push(...children)
            }
        }
    }

    return sections
}




// builds the full single page HTML
function buildSPATemplate(sections: Section[], sidebar: string): string {
    const sectionsHTML = sections.map(section => `
        <div id="${section.id}" class="spa-section">
            ${section.content}
        </div>
    `).join('\n')

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Docute</title>
  </head>
  <body>
    <nav>
      <ul>
        ${sidebar}
      </ul>
    </nav>
    <main>
      ${sectionsHTML}
    </main>

    <script>
      const allSections = document.querySelectorAll('.spa-section')

      function showSection(id) {
        allSections.forEach(section => {
          section.style.display = section.id === id ? 'block' : 'none'
        })
      }

      function setActiveLink(id) {
        document.querySelectorAll('.nav-link').forEach(link => {
          const href = link.getAttribute('href')
          link.classList.toggle('active', href === '#' + id)
        })
      }

      function handleHash() {
        const id = window.location.hash.slice(1)
        const target = document.getElementById(id)
        if (target) {
          showSection(id)
          setActiveLink(id)
        } else {
          showSection(allSections[0].id)
          setActiveLink(allSections[0].id)
        }
      }

      document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
    e.preventDefault()
    const href = link.getAttribute('href')
    if (href) {
        const id = href.replace('#', '')
        console.log('Clicked id:', id)
        console.log('Section found:', document.getElementById(id))
        showSection(id)
        setActiveLink(id)
        history.pushState(null, '', href)
    }
})
    })

      window.addEventListener('hashchange', handleHash)
      handleHash()
    </script>
  </body>
</html>`
}

// main entry point
export function buildSPA(inputPath: string, config: DocuteConfig): void {
    const sections: Section[] = collectSections(inputPath, config)
    const navTree = buildNavNode(inputPath, config)
    const sidebar: string = buildSidebarHTML(navTree, config, 'spa')
    const html: string = buildSPATemplate(sections, sidebar)

    fs.mkdirSync(config.outputPath, { recursive: true })
    fs.writeFileSync(path.join(config.outputPath, 'index.html'), html, 'utf8')
    console.log(`Done! Written to ${config.outputPath}/index.html`)
}
