import markdownit from 'markdown-it'
import * as fs from 'fs'
import * as path from 'path'
import { buildNavNode, buildSidebarHTML, headingFormat } from './scanner'
import replaceLink from 'markdown-it-replace-link'


//Interface
interface Section {
    id: string
    title: string
    content: string
}

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

// const navTree = buildNavNode('docs')
// const sidebar = buildSidebarHTML(navTree, 'spa')


// collects all MD files recursively and returns array of {id, content}
function collectSections(dirPath: string): Section[] {
    const items : string[] = fs.readdirSync(dirPath)
    const sections: Section[] = []
    for (const item of items) {
        const fullPath : string = path.join(dirPath, item)
        const isDirectory: boolean = fs.statSync(fullPath).isDirectory()
        const rawName: string = path.basename(item, path.extname(item))

        if (!isDirectory) {
            if (path.extname(fullPath) === '.md') {
                sections.push({
                    id : rawName,
                    title : headingFormat(rawName),
                    content : md.render(fs.readFileSync(fullPath, 'utf8'))
                })
            }
        } else {
            const children: Section[] = collectSections(fullPath)
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
      const sections = document.querySelectorAll('.spa-section')

      function showSection(id) {
        sections.forEach(section => {
          section.style.display = section.id === id ? 'block' : 'none'
        })
      }

      // show section based on URL hash
      function handleHash() {
        const id = window.location.hash.slice(1) // removes the '#'
        const target = document.getElementById(id)
        if (target) {
          showSection(id)
        } else {
          // default to first section if no hash or invalid hash
          showSection(sections[0].id)
        }
      }

      // run on page load and when hash changes
      window.addEventListener('hashchange', handleHash)
      handleHash()
    </script>
  </body>
</html>`
}

// main entry point
export function buildSPA(inputPath: string): void {
    const sections : Section[] = collectSections(inputPath)
    const NavTree = buildNavNode(inputPath)
    const sidebar : string = buildSidebarHTML(NavTree, 'spa')
    const html : string = buildSPATemplate(sections, sidebar)
    fs.mkdirSync('dist', { recursive: true })
    fs.writeFileSync('dist/index.html', html, 'utf8')
}

buildSPA('docs')