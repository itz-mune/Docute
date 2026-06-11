import markdownit from 'markdown-it'
import replaceLink from 'markdown-it-replace-link'
import frontmatterPlugin from 'markdown-it-front-matter'
import { headersPlugin } from '@mdit-vue/plugin-headers'
import * as yaml from 'js-yaml'
import * as path from 'path'
import type { DocuratorConfig } from "./config";
import { loadConfig } from "./config";
import * as fs from "node:fs";
import markdownItAttrs from "markdown-it-attrs";
import {markdownItTable} from "markdown-it-table";
import markdownItCodeCopy from "markdown-it-code-copy";
import { html5Media } from "markdown-it-html5-media";
import { getCopyLabels, getCopyButtonHTML } from "./theme";


// config is fixed for a build, so resolve it once for link rewriting + copy labels
const buildConfig = loadConfig()
const buildMode = buildConfig.mode


// stores frontmatter data after each render
export let frontmatterData: any = {}


export function getFrontmatterOrder(filePath: string): number {
    try {
        const content = fs.readFileSync(filePath, 'utf8')
        const match = content.match(/^---\n([\s\S]*?)\n---/)
        if (match) {
            const parsed: any = yaml.load(match[1])
            return parsed?.order ?? Infinity
        }
    } catch {
        // ignore errors
    }
    return Infinity  // no order defined → sort to end
}


// reads a folder's sidecar config (_meta.json) — order/title for the directory itself
export interface FolderMeta {
    order?: number
    title?: string
}

export function getFolderMeta(dirPath: string): FolderMeta {
    try {
        const raw = fs.readFileSync(path.join(dirPath, '_meta.json'), 'utf8')
        return JSON.parse(raw) ?? {}
    } catch {
        return {}  // no _meta.json → empty
    }
}


// explicit order for any entry: directories use _meta.json, files use frontmatter.
// Infinity means "no explicit order given".
export function getExplicitOrder(fullPath: string): number {
    try {
        if (fs.statSync(fullPath).isDirectory()) {
            return getFolderMeta(fullPath).order ?? Infinity
        }
    } catch {
        return Infinity
    }
    return getFrontmatterOrder(fullPath)
}


// "no order" sentinel as an order key — sorts to the very end
export const ORDER_END: number[] = [Infinity]

// turns an order value into a comparable key of numeric segments.
// 2 -> [2], 1.1 -> [1, 1], "2.1.1" -> [2, 1, 1]. Invalid/missing -> ORDER_END.
export function parseOrderKey(value: unknown): number[] {
    if (typeof value === 'number' && !isNaN(value)) {
        // a float like 1.1 from YAML still means "1.1" hierarchically
        return value.toString().split('.').map(Number)
    }
    if (typeof value === 'string') {
        const parts = value.trim().split('.').map(s => parseInt(s, 10))
        if (parts.length > 0 && parts.every(n => !isNaN(n))) return parts
    }
    return ORDER_END
}

// compares two order keys segment by segment; a missing segment counts as 0
// so a parent (1) sorts before its child (1.1).
export function compareOrderKeys(a: number[], b: number[]): number {
    const len = Math.max(a.length, b.length)
    for (let i = 0; i < len; i++) {
        const x = a[i] ?? 0
        const y = b[i] ?? 0
        if (x !== y) return x - y
    }
    return 0
}

// raw order value for any entry (directory _meta.json or file frontmatter)
function getOrderValue(fullPath: string): unknown {
    try {
        if (fs.statSync(fullPath).isDirectory()) {
            return getFolderMeta(fullPath).order
        }
        const content = fs.readFileSync(fullPath, 'utf8')
        const match = content.match(/^---\n([\s\S]*?)\n---/)
        if (match) {
            const parsed: any = yaml.load(match[1])
            return parsed?.order
        }
    } catch {
        // ignore
    }
    return undefined
}

// explicit order as a comparable key (supports hierarchical "2.1.1")
export function getExplicitOrderKey(fullPath: string): number[] {
    return parseOrderKey(getOrderValue(fullPath))
}



export interface RenderResult {
    html: string
    frontmatter: any
    env: any
}


export function renderMarkdown(content: string): RenderResult {
    const env: any = {}

    // reset so a file without frontmatter doesn't inherit the previous file's
    frontmatterData = {}

    const html = md.render(content, env)
    const frontmatter = { ...frontmatterData }  // capture before next render

    return { html, frontmatter, env }
}

export function sortFiles(files: string[], dirPath: string, config: DocuratorConfig): string[] {
    return [...files].sort((a, b) => {
        if (config.orderSource === 'alphabetical') {
            return a.localeCompare(b)
        }
        if (config.orderSource === 'prefix') {
            // explicit order (_meta.json / frontmatter) overrides the filename prefix
            const explicitA = getExplicitOrderKey(path.join(dirPath, a))
            const explicitB = getExplicitOrderKey(path.join(dirPath, b))
            const keyA = explicitA !== ORDER_END ? explicitA : [parseInt(a) || Infinity]
            const keyB = explicitB !== ORDER_END ? explicitB : [parseInt(b) || Infinity]
            const cmp = compareOrderKeys(keyA, keyB)
            if (cmp === 0) {
                // same order: a file and a directory tie-break by configured priority
                const dirA = fs.statSync(path.join(dirPath, a)).isDirectory()
                const dirB = fs.statSync(path.join(dirPath, b)).isDirectory()
                if (dirA !== dirB) {
                    const fileFirst = config.tiePriority === 'file'
                    // when fileFirst, the file (non-dir) should come first
                    return (dirA ? 1 : -1) * (fileFirst ? 1 : -1)
                }
                // both files or both dirs → alphabetical
                return a.localeCompare(b)
            }
            return cmp
        }
        if (config.orderSource === 'frontmatter') {
            // files via frontmatter, directories via _meta.json; supports hierarchical "2.1.1"
            const keyA = getExplicitOrderKey(path.join(dirPath, a))
            const keyB = getExplicitOrderKey(path.join(dirPath, b))
            const cmp = compareOrderKeys(keyA, keyB)
            return cmp !== 0 ? cmp : a.localeCompare(b)  // tie / both unordered → alphabetical
        }
        // auto - try explicit (frontmatter/_meta.json) first, then prefix, then alphabetical
        const keyA = getExplicitOrderKey(path.join(dirPath, a))
        const keyB = getExplicitOrderKey(path.join(dirPath, b))
        if (keyA !== ORDER_END || keyB !== ORDER_END) return compareOrderKeys(keyA, keyB)

        const numA = parseInt(a) || Infinity
        const numB = parseInt(b) || Infinity
        if (numA !== Infinity || numB !== Infinity) return numA - numB

        return a.localeCompare(b)
    })
}



export function getH1Title(filePath: string): string | null {
    try {
        const content = fs.readFileSync(filePath, 'utf8')
        const match = content.match(/^#\s+(.+)$/m)
        return match ? match[1].trim() : null
    } catch {
        return null
    }
}

export function getFrontmatterTitle(filePath: string): string | null {
    try {
        const content = fs.readFileSync(filePath, 'utf8')
        const match = content.match(/^---\n([\s\S]*?)\n---/)
        if (match) {
            const parsed: any = yaml.load(match[1])
            return parsed?.title ?? null
        }
    } catch {
        return null
    }
    return null
}



export const md = markdownit({
    html: true,
    linkify: true,
    typographer: true,
    // highlight: (str, lang) => str  // placeholder for now
}).use(replaceLink, {
        processHTML: true,
        replaceLink: (link: string) => {
            if (link.startsWith('http://') ||
                link.startsWith('https://') ||
                link.startsWith('www.')) {
                return link
            }
            if (link.endsWith('.md')) {
                // strip any order prefix so links match the slugged section ids/files
                const name = stripOrderPrefix(path.basename(link, '.md'))
                // SPA navigates by hash within one page; multi writes one file per page
                return buildMode === 'spa' ? `#${name}` : `${name}.html`
            }
            return link
        }
    })
    .use(frontmatterPlugin, (fm: string) => {
        frontmatterData = yaml.load(fm)
    })
    .use(headersPlugin, {
        level: [1, 2, 3]  // 👈 add this
    })
    .use(markdownItAttrs)
    .use( markdownItTable )
    .use(markdownItCodeCopy, {
        // inline SVG icon + label span, styled via theme.css (avoids both the
        // MDI icon-font dependency and emoji glyphs that may not render)
        element: getCopyButtonHTML(buildConfig),
        iconClass: '',
        iconStyle: '',
        buttonStyle: '',
    })
    // turns ![](clip.mp4) / ![](audio.mp3) image syntax into <video>/<audio> tags
    .use(html5Media)


// client-side copy behaviour for markdown-it-code-copy buttons.
// The plugin only emits the button + data-clipboard-text; for a static site we
// wire the actual copy here using the browser Clipboard API (no clipboard.js).
// The "copied" feedback text is theme-specific.
export function getCodeCopyScript(config: DocuratorConfig): string {
    const copiedLabel = getCopyLabels(config).copied
    return `<script>
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.markdown-it-code-copy');
    if (!btn) return;
    const text = btn.getAttribute('data-clipboard-text') || '';
    navigator.clipboard.writeText(text).then(function () {
      const label = btn.querySelector('span') || btn;
      const original = label.textContent;
      label.textContent = ${JSON.stringify(copiedLabel)};
      setTimeout(function () { label.textContent = original; }, 1200);
    });
  });
</script>`
}

// strips a leading order prefix (e.g. "01-", "2.") to get a clean slug
export function stripOrderPrefix(name: string): string {
    return name.replace(/^\d+[-_.\s]*/, '')
}

// Every .md becomes a flat output (slug.html / #slug), so two files anywhere in
// the tree that strip to the same slug would silently overwrite each other and
// their links would clash. Walk the tree and fail the build if that happens.
export function checkDuplicateSlugs(inputPath: string): void {
    const seen = new Map<string, string[]>()  // slug -> source paths

    function walk(dir: string): void {
        for (const entry of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, entry)
            if (fs.statSync(fullPath).isDirectory()) {
                walk(fullPath)
            } else if (path.extname(entry) === '.md') {
                const slug = stripOrderPrefix(path.basename(entry, '.md'))
                const list = seen.get(slug) ?? []
                list.push(fullPath)
                seen.set(slug, list)
            }
        }
    }
    walk(inputPath)

    const clashes = [...seen.entries()].filter(([, paths]) => paths.length > 1)
    if (clashes.length > 0) {
        const detail = clashes
            .map(([slug, paths]) => `  "${slug}" <- ${paths.join(', ')}`)
            .join('\n')
        throw new Error(
            `Docurator: duplicate page slugs detected — these would overwrite each other ` +
            `and break links. Rename the files so each slug is unique:\n${detail}`
        )
    }
}

// Removes previously-generated output so renamed/deleted pages don't leave
// orphan .html behind. Deliberately conservative: only deletes top-level
// *.html and theme.css (exactly what Docurator emits) — never subdirectories or
// other file types, so user assets (images/, fonts, etc.) are left intact.
export function cleanOutput(outputPath: string): void {
    if (!fs.existsSync(outputPath)) return

    for (const entry of fs.readdirSync(outputPath)) {
        const fullPath = path.join(outputPath, entry)
        // skip anything that isn't a top-level file we own
        if (!fs.statSync(fullPath).isFile()) continue
        const isGenerated = entry.endsWith('.html') || entry === 'theme.css'
        if (isGenerated) fs.rmSync(fullPath)
    }
}

// formats any filename into Title Case
export function headingFormat(str: string): string {
    return stripOrderPrefix(str)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}


export function resolveTitle(
    config: DocuratorConfig,
    env: any,
    frontmatter: any,
    rawName: string
): string {
    if (config.titleSource === 'frontmatter') {
        return frontmatter?.title ?? headingFormat(rawName)
    } else if (config.titleSource === 'h1') {
        return env.headers?.find((h: any) => h.level === 1)?.title ?? headingFormat(rawName)
    } else if (config.titleSource === 'filename') {
        return headingFormat(rawName)
    } else {
        return frontmatter?.title
            ?? env.headers?.find((h: any) => h.level === 1)?.title
            ?? headingFormat(rawName)
    }
}