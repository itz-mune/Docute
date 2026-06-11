# Docurator

Turn a folder of Markdown into a beautiful documentation website — with one command.

Docurator is a zero-config static documentation generator. Point it at a directory of
Markdown files and it produces a clean, themeable site: either a classic **multi-page**
site or a **single-page app**. It ships with a live-reloading dev server, built-in
themes, and a colourful CLI — with **no runtime dependencies** for serving.

---

## Features

- **Markdown → website** — drop in `.md` files, get a styled site.
- **Two modes** — `multi` (one HTML page per doc) or `spa` (single-page app).
- **Live-reload dev server** — `docurator serve` rebuilds and refreshes the browser on every save.
- **Built-in themes** — `default`, `dark`, `catppuccin`, `dracula`, `material`, `neon`, `pastel`, plus custom CSS.
- **Smart ordering & titles** — derive page order/titles from frontmatter, filename prefixes, or `_meta.json`.
- **Sidebar navigation** — left or right, button- or scroll-based page switching.
- **Rich Markdown** — tables, code blocks with copy buttons, HTML5 audio/video, anchored headings.
- **Safe rebuilds** — only Docurator-generated files are cleaned; your images and assets are preserved.
- **Colourful CLI** — auto-disables for non-TTY / `NO_COLOR` / `--no-color`.

---

## Installation

```bash
npm install -g docurator
```

Or run it without installing:

```bash
npx docurator create
```

---

## Quick start

Open a terminal **inside the folder that holds your Markdown files**, then:

```bash
docurator serve
```

That's the whole thing. `serve` creates a config if one doesn't exist, builds the
site, opens your browser at <http://localhost:3000>, and live-reloads on every save.

Prefer to just build static files? Run `docurator create` instead — it also
auto-creates the config on first run. Use `docurator init` only if you want to
tweak the config before building.

---

## Commands

| Command            | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `docurator init`      | Drop a `docurator.config.json` you can edit (optional).           |
| `docurator create`    | Generate the website from your Markdown files.                    |
| `docurator build`     | Alias of `create`.                                                |
| `docurator serve`     | Build, serve locally, open the browser, and live-reload.          |
| `docurator dev`       | Alias of `serve`.                                                 |
| `docurator help`      | Show help.                                                        |
| `docurator version`   | Show the installed version.                                       |

> `create` and `serve` auto-create `docurator.config.json` (using defaults) if it's
> missing — so you can run either one in a fresh folder with no setup.

### Options

These flags override `docurator.config.json`:

| Flag                          | Description                                  | Default     |
| ----------------------------- | -------------------------------------------- | ----------- |
| `-i, --input <dir>`           | Markdown source directory                    | `.`         |
| `-o, --output <dir>`          | Output directory                             | `dist`      |
| `-m, --mode <multi\|spa>`     | Multi-page or single-page                    | `multi`     |
| `-t, --theme <name>`          | Theme (see list below)                       | `default`   |
| `--nav <left\|right>`         | Sidebar position                             | `left`      |
| `--page-nav <buttons\|scroll>`| Page-switching style                         | `buttons`   |
| `--title-source <…>`          | `frontmatter` \| `h1` \| `filename` \| `auto`| `auto`      |
| `--order-source <…>`          | `frontmatter` \| `prefix` \| `alphabetical` \| `auto` | `auto` |
| `--tie-priority <file\|directory>` | Tie-breaker for matching prefixes       | `file`      |
| `--home <slug>`               | Slug to use as the home page                 | first page  |
| `--custom-css <file>`         | Extra CSS appended after the theme           | —           |
| `--port <number>`             | Dev-server port (`serve` only)               | `3000`      |
| `--no-open`                   | Don't auto-open the browser (`serve` only)   | —           |
| `--no-color`                  | Disable coloured output                      | —           |

### Examples

```bash
docurator serve
docurator create --theme neon --mode spa
docurator build -o ./site --nav right --page-nav scroll
docurator serve --port 4000 --no-open
```

---

## Configuration

Docurator reads a `docurator.config.json` from the current working directory. Precedence is:

**defaults → `docurator.config.json` → CLI flags**

```json
{
  "titleSource": "auto",
  "orderSource": "auto",
  "mode": "multi",
  "inputPath": ".",
  "outputPath": "dist",
  "tiePriority": "file",
  "theme": "default",
  "navPosition": "left",
  "pageNav": "buttons"
}
```

| Key           | Type     | Default     | Description                                            |
| ------------- | -------- | ----------- | ------------------------------------------------------ |
| `titleSource` | string   | `"auto"`    | `frontmatter` \| `h1` \| `filename` \| `auto`          |
| `orderSource` | string   | `"auto"`    | `frontmatter` \| `prefix` \| `alphabetical` \| `auto`  |
| `mode`        | string   | `"multi"`   | `multi` \| `spa`                                       |
| `inputPath`   | string   | `"."`       | Markdown source directory (the current folder).        |
| `outputPath`  | string   | `"dist"`    | Output directory.                                      |
| `tiePriority` | string   | `"file"`    | When a file and folder share a numeric prefix.         |
| `theme`       | string   | `"default"` | Built-in theme name.                                   |
| `home`        | string   | —           | Slug used as the home/index page.                      |
| `customCss`   | string   | —           | Path to a CSS file appended after the theme.           |
| `navPosition` | string   | `"left"`    | `left` \| `right`                                      |
| `pageNav`     | string   | `"buttons"` | `buttons` \| `scroll`                                  |

---

## Authoring content

### Frontmatter

Each Markdown file may begin with YAML frontmatter:

```markdown
---
title: Getting Started
order: 3
description: Install Docurator and generate your first site.
---

# Getting Started

Your content here…
```

- **`title`** — used when `titleSource` is `frontmatter` or `auto`.
- **`order`** — controls position in the sidebar when `orderSource` is `frontmatter` or `auto`.
- **`description`** — used for the page's meta description.

### Ordering by filename prefix

Numeric prefixes order pages and are stripped from the slug:

```
docs/
  01-introduction.md      → /introduction
  02-getting-started.md   → /getting-started
  03-faq.md               → /faq
```

### Folders & sidebar groups

Nested folders become sidebar sections. A folder's label comes from a `_meta.json`
`title` if present, otherwise the formatted folder name:

```
docs/
  01-guides/
    _meta.json            → { "title": "Guides" }
    01-configuration.md
    02-writing-content.md
```

### Rich Markdown

Tables, fenced code blocks (with copy buttons), anchored headings, and HTML5 media
all work out of the box:

```markdown
![A picture](./images/screenshot.png)

@[video](./demo.mp4)
```

---

## Themes

Built-in themes: `default`, `dark`, `catppuccin`, `dracula`, `material`, `neon`, `pastel`.

```bash
docurator create --theme dracula
```

For full control, append your own CSS after the theme:

```json
{ "theme": "default", "customCss": "./brand.css" }
```

---

## Development server

`docurator serve` builds the site, serves it over HTTP, and watches both your Markdown
source and `docurator.config.json`. On every change it rebuilds and live-reloads the
browser via Server-Sent Events.

```bash
docurator serve --port 4000
```

- Recursive file watching (Windows + macOS).
- Debounced rebuilds — one clean line per save.
- No-cache headers, so theme and asset edits always reflect.
- Config edits (theme, mode, …) take effect live.

> **Note:** the dev server runs the compiled build, so after editing **Docurator's own
> source** you must rebuild (`npm run build`) and restart `docurator serve`.

---

## Programmatic API

Docurator can be used from Node.js:

```ts
import { recursiveParse } from 'docurator'

recursiveParse('docs')
```

```ts
import { parseMarkdownToHTML } from 'docurator'

parseMarkdownToHTML('docs/introduction.md', 'dist/introduction.html')
```

---

## How it works

1. Walks `inputPath`, reading every `.md` file and `_meta.json`.
2. Derives each page's **title**, **order**, and **slug** per your config.
3. Renders Markdown to HTML and writes one file per slug (or one SPA shell).
4. Emits `theme.css` and an `index.html` entry point.
5. In `serve` mode, watches for changes and live-reloads.

Rebuilds clean only Docurator-generated files (top-level `*.html` and `theme.css`), so
renamed or deleted pages never leave orphans — while your images, fonts, and
subdirectories are left untouched.

---

## License

MIT
