// Generates the theme.css that every page links to.
//
// Two layers of customization:
//   1. `theme`     — a built-in palette (default | dark | catppuccin)
//   2. `customCss` — path to a CSS file appended after the theme, so users who
//                    don't know markdown-it-attrs can still override anything
//                    (the built-in palettes are exposed as CSS variables).

import * as fs from 'fs'
import * as path from 'path'
import { DocuratorConfig } from './config'
import { colors, ui } from './colors'

export type ThemeName =
    | 'default'
    | 'dark'
    | 'catppuccin'
    | 'dracula'
    | 'material'
    | 'neon'
    | 'pastel'

// per-theme copy button text (label before/after clicking)
// Plain text only — the leading icon is an inline SVG (see copyIcon), so it
// renders identically on every system instead of relying on emoji fonts.
export const copyLabels: Record<ThemeName, { copy: string; copied: string }> = {
    default: { copy: 'Copy', copied: 'Copied!' },
    dark: { copy: 'Copy', copied: 'Copied!' },
    catppuccin: { copy: 'Copy', copied: 'Copied!' },
    dracula: { copy: 'Copy', copied: 'Copied!' },
    material: { copy: 'COPY', copied: 'COPIED' },
    neon: { copy: 'Copy', copied: 'Copied!' },
    pastel: { copy: 'Copy', copied: 'Copied!' },
}

// inline SVG icons — currentColor so they inherit the button's text colour.
// Using SVG (not emoji) guarantees the glyph renders on every system.
export const copyIcon =
    '<svg class="dc-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'

export const homeIcon =
    '<svg class="dc-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'

// the code-copy button's inner HTML: icon + label span (label text is swapped
// to the "copied" text on click; the icon is left untouched)
export function getCopyButtonHTML(config: DocuratorConfig): string {
    return `${copyIcon}<span>${getCopyLabels(config).copy}</span>`
}

// normalises config.theme to a known theme name (falls back to default)
export function resolveThemeName(config: DocuratorConfig): ThemeName {
    return config.theme && config.theme in themeVars ? config.theme : 'default'
}

// copy labels for the configured theme
export function getCopyLabels(config: DocuratorConfig): { copy: string; copied: string } {
    return copyLabels[resolveThemeName(config)]
}

// each theme is just a set of CSS variables; structure is shared (baseCss)
const themeVars: Record<ThemeName, string> = {
    default: `:root {
  --bg: #ffffff;
  --fg: #1f2328;
  --muted: #656d76;
  --sidebar-bg: #f6f8fa;
  --border: #d0d7de;
  --link: #0969da;
  --accent: #0969da;
  --code-bg: #f6f8fa;
  --code-fg: #1f2328;
  --quote-border: #d0d7de;
  --table-stripe: #f6f8fa;
  --active-bg: #ddf4ff;
  --copy-fg: #656d76;
  --copy-bg: #ffffff;
  --copy-border: #d0d7de;
  --copy-hover: #1f2328;
  --on-accent: #ffffff;
}`,
    dark: `:root {
  --bg: #0d1117;
  --fg: #e6edf3;
  --muted: #8b949e;
  --sidebar-bg: #161b22;
  --border: #30363d;
  --link: #58a6ff;
  --accent: #58a6ff;
  --code-bg: #161b22;
  --code-fg: #e6edf3;
  --quote-border: #30363d;
  --table-stripe: #161b22;
  --active-bg: rgba(31, 111, 235, 0.2);
  --copy-fg: #8b949e;
  --copy-bg: #161b22;
  --copy-border: #30363d;
  --copy-hover: #e6edf3;
  --on-accent: #ffffff;
}`,
    catppuccin: `:root {
  --bg: #1e1e2e;
  --fg: #cdd6f4;
  --muted: #a6adc8;
  --sidebar-bg: #181825;
  --border: #313244;
  --link: #89b4fa;
  --accent: #cba6f7;
  --code-bg: #181825;
  --code-fg: #cdd6f4;
  --quote-border: #cba6f7;
  --table-stripe: #181825;
  --active-bg: #313244;
  --copy-fg: #a6adc8;
  --copy-bg: #313244;
  --copy-border: #45475a;
  --copy-hover: #cba6f7;
  --on-accent: #1e1e2e;
}`,
    dracula: `:root {
  --bg: #282a36;
  --fg: #f8f8f2;
  --muted: #6272a4;
  --sidebar-bg: #21222c;
  --border: #44475a;
  --link: #8be9fd;
  --accent: #bd93f9;
  --code-bg: #21222c;
  --code-fg: #f8f8f2;
  --quote-border: #ff79c6;
  --table-stripe: #21222c;
  --active-bg: #44475a;
  --copy-fg: #6272a4;
  --copy-bg: #44475a;
  --copy-border: #6272a4;
  --copy-hover: #ff79c6;
  --on-accent: #282a36;
}`,
    material: `:root {
  --bg: #fafafa;
  --fg: #212121;
  --muted: #757575;
  --sidebar-bg: #ffffff;
  --border: #e0e0e0;
  --link: #1976d2;
  --accent: #009688;
  --code-bg: #eceff1;
  --code-fg: #263238;
  --quote-border: #009688;
  --table-stripe: #f5f5f5;
  --active-bg: #e0f2f1;
  --copy-fg: #757575;
  --copy-bg: #ffffff;
  --copy-border: #e0e0e0;
  --copy-hover: #009688;
  --on-accent: #ffffff;
}`,
    neon: `:root {
  --bg: #0a0a12;
  --fg: #e0e0ff;
  --muted: #7a7aa8;
  --sidebar-bg: #10101c;
  --border: #2a2a4a;
  --link: #00e5ff;
  --accent: #ff00e5;
  --code-bg: #10101c;
  --code-fg: #00ffc8;
  --quote-border: #00e5ff;
  --table-stripe: #15152a;
  --active-bg: rgba(255, 0, 229, 0.15);
  --copy-fg: #00e5ff;
  --copy-bg: #15152a;
  --copy-border: #2a2a4a;
  --copy-hover: #ff00e5;
  --on-accent: #0a0a12;
}`,
    pastel: `:root {
  --bg: #fdf6f9;
  --fg: #5a4a54;
  --muted: #a78a98;
  --sidebar-bg: #f6eef3;
  --border: #ecd9e4;
  --link: #d77fa1;
  --accent: #c9a0dc;
  --code-bg: #f4ecf4;
  --code-fg: #6a5a64;
  --quote-border: #b5e0d8;
  --table-stripe: #f8f0f5;
  --active-bg: #f0e0ee;
  --copy-fg: #a78a98;
  --copy-bg: #f4ecf4;
  --copy-border: #ecd9e4;
  --copy-hover: #c9a0dc;
  --on-accent: #ffffff;
}`,
}

// shared structure — references the variables above, so it works with any theme
const baseCss = `*,
*::before,
*::after { box-sizing: border-box; }

body {
  margin: 0;
  display: flex;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
}

/* sidebar */
nav {
  flex: 0 0 260px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
  padding: 1.5rem 1rem;
}

nav ul { list-style: none; margin: 0; padding: 0; }
.nav-children { padding-left: 0.85rem; border-left: 1px solid var(--border); margin-left: 0.4rem; }

.nav-folder-label {
  display: block;
  margin: 1rem 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.nav-link {
  display: block;
  padding: 0.35rem 0.6rem;
  margin: 0.1rem 0;
  border-radius: 6px;
  color: var(--fg);
  text-decoration: none;
  font-size: 0.92rem;
}
.nav-link:hover { background: var(--active-bg); }
.nav-link.active {
  background: var(--active-bg);
  color: var(--accent);
  font-weight: 600;
}

/* content */
main {
  flex: 1 1 auto;
  max-width: 820px;
  margin: 0 auto;
  padding: 2.5rem 3rem;
  width: 100%;
}

main h1, main h2 { padding-bottom: 0.3rem; border-bottom: 1px solid var(--border); }
main h1 { font-size: 2rem; margin-top: 0; }
main h2 { font-size: 1.5rem; margin-top: 2rem; }
main h3 { font-size: 1.2rem; margin-top: 1.5rem; }

main a { color: var(--link); text-decoration: none; }
main a:hover { text-decoration: underline; }

main img { max-width: 100%; height: auto; border-radius: 8px; }

/* code */
code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.88em;
  background: var(--code-bg);
  padding: 0.15em 0.4em;
  border-radius: 5px;
}
pre {
  background: var(--code-bg);
  color: var(--code-fg);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid var(--border);
}
pre code { background: none; padding: 0; }

/* code copy button (markdown-it-code-copy) */
.markdown-it-code-copy {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--copy-fg);
  background: var(--copy-bg);
  border: 1px solid var(--copy-border);
  border-radius: 6px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s, color 0.15s, border-color 0.15s;
}
.markdown-it-code-copy:hover { opacity: 1; color: var(--copy-hover); border-color: var(--copy-hover); }

/* inline SVG icons sit next to their label */
.dc-icon { vertical-align: -2px; }
.markdown-it-code-copy { display: inline-flex; align-items: center; gap: 4px; }
.page-nav-btn { display: inline-flex; align-items: center; gap: 6px; }

/* blockquote */
blockquote {
  margin: 1rem 0;
  padding: 0.3rem 1rem;
  color: var(--muted);
  border-left: 4px solid var(--quote-border);
}

/* tables (markdown-it-table) */
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
th, td { border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left; }
th { background: var(--table-stripe); font-weight: 600; }
tbody tr:nth-child(even) { background: var(--table-stripe); }

/* spa: first section shown by default before JS runs (buttons mode) */
.spa-section { display: none; }
.spa-section:first-of-type { display: block; }
/* scroll mode shows every section stacked */
.nav-scroll .spa-section { display: block; }
.nav-scroll .spa-section + .spa-section { margin-top: 3rem; }

/* page navigation buttons (Prev / Next / Back to Home) */
.page-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}
.page-nav-spacer { flex: 0 0 auto; }
.page-nav-btn {
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: filter 0.15s, border-color 0.15s, color 0.15s;
}
/* never underline the nav buttons on hover (overrides main a:hover) */
.page-nav-btn:hover { text-decoration: none; }
/* Previous: bordered / secondary */
.page-nav-prev {
  color: var(--fg);
  background: transparent;
  border: 1px solid var(--border);
}
.page-nav-prev:hover { border-color: var(--accent); color: var(--accent); }
/* Next & Back to Home: filled / primary */
.page-nav-next,
.page-nav-home {
  color: var(--on-accent);
  background: var(--accent);
  border: 1px solid var(--accent);
}
.page-nav-next:hover,
.page-nav-home:hover { filter: brightness(1.1); }

/* responsive */
@media (max-width: 720px) {
  body { flex-direction: column; }
  nav { flex-basis: auto; height: auto; position: static; border-right: none; border-bottom: 1px solid var(--border); }
  main { padding: 1.5rem; }
}`

// resolves the CSS string for the configured theme + optional custom overrides
export function resolveThemeCss(config: DocuratorConfig): string {
    const name: ThemeName =
        config.theme && config.theme in themeVars ? config.theme : 'default'

    let css = `${themeVars[name]}\n\n${baseCss}\n`

    // sidebar on the right: flip the row and move the divider border
    if (config.navPosition === 'right') {
        css += `
/* ---- navPosition: right ---- */
body { flex-direction: row-reverse; }
nav { border-right: none; border-left: 1px solid var(--border); }
@media (max-width: 720px) {
  body { flex-direction: column; }
  nav { border-left: none; border-bottom: 1px solid var(--border); }
}
`
    }

    if (config.customCss) {
        const customPath = path.resolve(process.cwd(), config.customCss)
        try {
            css += `\n/* ---- custom overrides (${config.customCss}) ---- */\n`
            css += fs.readFileSync(customPath, 'utf8')
        } catch {
            console.warn(ui.warn(`Could not read customCss at ${customPath}`))
        }
    }

    return css
}

// writes theme.css into the output directory
export function writeTheme(config: DocuratorConfig): void {
    fs.mkdirSync(config.outputPath, { recursive: true })
    const outFile = path.join(config.outputPath, 'theme.css')
    fs.writeFileSync(outFile, resolveThemeCss(config), 'utf8')
    console.log(`${colors.green('✓')} ${colors.gray(outFile)} ${ui.muted('(theme)')}`)
}
