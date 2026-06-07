//Creates the NavBar structure

import * as fs from 'fs'
import * as path from 'path'

//NavNode is a single node in the navbar
export interface NavNode {
    label: string
    path?: string
    children?: NavNode[]
}


//function to format any name into Title Case
export function headingFormat(str: string): string {
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase → camel Case
        .replace(/[_-]/g, ' ')                  // underscores/dashes → spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}


//function to get a single big NavNode
export function buildNavNode(dirPath: string): NavNode[] {
    const files: string[] = fs.readdirSync(dirPath)
    const nodes: NavNode[] = []

    for (const file of files) {
        const fullPath: string = path.join(dirPath, file)
        const isDirectory: boolean = fs.statSync(fullPath).isDirectory()
        const rawName: string = path.basename(file, path.extname(file))

        if (!isDirectory) {
            if (path.extname(fullPath) === '.md') {
                nodes.push({
                    label: headingFormat(rawName),
                    path: rawName
                })
            }
        } else {
            const children : NavNode[] = buildNavNode(fullPath)
            if (children.length > 0) {
                nodes.push({
                    label: headingFormat(rawName),
                    children: buildNavNode(fullPath)
                })
            }
        }
    }

    return nodes
}


//build the navbar
export function buildSidebarHTML(nodes: NavNode[], mode: 'multi' | 'spa' = 'multi'): string {
    const items: string[] = nodes.map(node => {
        if (node.children) {
            return `
            <li class="nav-folder">
                <span class="nav-folder-label">${node.label}</span>
                <ul class="nav-children">
                    ${buildSidebarHTML(node.children, mode)}
                </ul>
            </li>`
        } else {
            const href = mode === 'spa' ? `#${node.path}` : `${node.path}.html`
            return `
            <li class="nav-file">
                <a href="${href}" class="nav-link">${node.label}</a>
            </li>`
        }
    })

    return items.join('\n')
}