//Creates the NavBar structure

import * as fs from 'fs'
import * as path from 'path'
import {getFolderMeta, getFrontmatterTitle, getH1Title, headingFormat, sortFiles, stripOrderPrefix} from "./utils";
import { DocuratorConfig } from "./config";



//NavNode is a single node in the navbar
export interface NavNode {
    label: string
    path?: string
    children?: NavNode[]
}


//function to format any name into Title Case
// export function headingFormat(str: string): string {
//     return str
//         .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase → camel Case
//         .replace(/[_-]/g, ' ')                  // underscores/dashes → spaces
//         .split(' ')
//         .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//         .join(' ')
// }


//function to get a single big NavNode
// @ts-ignore
export function buildNavNode(dirPath: string, config: DocuratorConfig): NavNode[] {
    const files: string[] = fs.readdirSync(dirPath)
    const nodes: NavNode[] = []
    const sorted: string[] = sortFiles(files, dirPath, config)

    for (const file of sorted) {
        const fullPath: string = path.join(dirPath, file)
        const isDirectory: boolean = fs.statSync(fullPath).isDirectory()
        const rawName: string = path.basename(file, path.extname(file))

        if (!isDirectory) {
            if (path.extname(fullPath) === '.md') {
                let label: string

                if (config.titleSource === 'h1') {
                    label = getH1Title(fullPath) ?? headingFormat(rawName)
                } else if (config.titleSource === 'frontmatter') {
                    label = getFrontmatterTitle(fullPath) ?? headingFormat(rawName)
                } else if (config.titleSource === 'auto') {
                    label = getFrontmatterTitle(fullPath)
                        ?? getH1Title(fullPath)
                        ?? headingFormat(rawName)
                } else {
                    label = headingFormat(rawName)
                }

                nodes.push({
                    label,
                    path: stripOrderPrefix(rawName)
                })
            }
        } else {
            // 👈 this whole block was missing!
            const children: NavNode[] = buildNavNode(fullPath, config)
            if (children.length > 0) {
                // folder label: _meta.json title overrides the (prefix-stripped) dir name
                const label: string = getFolderMeta(fullPath).title ?? headingFormat(rawName)
                nodes.push({
                    label,
                    children
                })
            }
        }
    }

    return nodes
}


//build the navbar
export function buildSidebarHTML(nodes: NavNode[], config: DocuratorConfig, mode: 'multi' | 'spa' = 'multi'): string {
    const items: string[] = nodes.map(node => {
        if (node.children) {
            return `
            <li class="nav-folder">
                <span class="nav-folder-label">${node.label}</span>
                <ul class="nav-children">
                    ${buildSidebarHTML(node.children, config, mode)}
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