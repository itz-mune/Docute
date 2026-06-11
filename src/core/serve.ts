// Dev server: builds once, serves the output, watches the Markdown source +
// config, and live-reloads the browser on every rebuild. Zero dependencies —
// just Node's built-in http + fs.watch.

import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import { DocuratorConfig } from './config'
import { colors, ui } from './colors'

// SSE endpoint the injected client polls for reload signals
const RELOAD_PATH = '/__docurator_livereload'

// tiny client injected into every served HTML page: reconnects automatically
// and reloads the tab whenever the server pushes a "reload" event
const LIVE_RELOAD_SNIPPET = `
<script>
  (function () {
    var src = new EventSource("${RELOAD_PATH}");
    src.onmessage = function () { location.reload(); };
    src.onerror = function () { /* server restarting — EventSource auto-retries */ };
  })();
</script>`

const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
}

// rebuild is supplied by the caller (index.ts build()) so serve stays decoupled
type Rebuild = () => void

export function serve(config: DocuratorConfig, rebuild: Rebuild, port = 3000): void {
    // first build before we start listening
    try {
        rebuild()
    } catch (err) {
        console.error(ui.error((err as Error).message))
        process.exit(1)
    }

    const clients = new Set<http.ServerResponse>()

    const server = http.createServer((req, res) => {
        const url = (req.url ?? '/').split('?')[0]

        // live-reload event stream
        if (url === RELOAD_PATH) {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            })
            res.write('\n')
            clients.add(res)
            req.on('close', () => clients.delete(res))
            return
        }

        // map the URL to a file inside the output directory
        let rel = decodeURIComponent(url)
        if (rel.endsWith('/')) rel += 'index.html'
        // default extensionless requests to .html (so /faq serves faq.html)
        if (!path.extname(rel)) rel += '.html'

        const filePath = path.join(config.outputPath, rel)

        // prevent path traversal outside the output directory
        const outRoot = path.resolve(config.outputPath)
        if (!path.resolve(filePath).startsWith(outRoot)) {
            res.writeHead(403).end('Forbidden')
            return
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
                res.end(`<h1>404</h1><p>Not found: ${rel}</p>`)
                return
            }
            const ext = path.extname(filePath).toLowerCase()
            const type = MIME[ext] ?? 'application/octet-stream'
            // never cache in dev — guarantees theme.css/assets reload fresh
            const headers = { 'Content-Type': type, 'Cache-Control': 'no-store' }

            // inject the live-reload client into HTML responses
            if (ext === '.html') {
                let body = data.toString('utf8')
                body = body.includes('</body>')
                    ? body.replace('</body>', `${LIVE_RELOAD_SNIPPET}\n</body>`)
                    : body + LIVE_RELOAD_SNIPPET
                res.writeHead(200, headers)
                res.end(body)
            } else {
                res.writeHead(200, headers)
                res.end(data)
            }
        })
    })

    server.listen(port, () => {
        console.log(`\n${ui.heading('Docurator')} ${colors.gray('dev server running')}`)
        console.log(`  ${colors.gray('→')} ${ui.link(`http://localhost:${port}`)}`)
        console.log(
            `${colors.gray('Watching')} ${ui.path(`"${config.inputPath}"`)} ` +
            `${colors.gray('for changes — press')} ${colors.bold('Ctrl+C')} ${colors.gray('to stop.')}\n`
        )
    })

    // notify every connected browser to reload
    function notifyReload(): void {
        for (const res of clients) res.write('data: reload\n\n')
    }

    // The output dir often lives inside the watched input dir (e.g. input ".",
    // output "dist"). Without this guard, each rebuild writes into dist, the
    // watcher sees those writes, and rebuilds forever. Ignore output + dotfiles.
    const outRel = path.relative(config.inputPath, config.outputPath)
    const outPrefix = outRel && !outRel.startsWith('..') ? outRel + path.sep : null
    function isIgnored(file: string): boolean {
        if (!file) return false
        const norm = file.split('/').join(path.sep)
        if (outPrefix && (norm === outRel || norm.startsWith(outPrefix))) return true
        // skip editor temp/swap files and dotfiles that aren't real content
        const base = path.basename(norm)
        return base.startsWith('.') || base.endsWith('~') || base.endsWith('.tmp')
    }

    // debounce: fs.watch fires several events per save, so coalesce them
    let timer: NodeJS.Timeout | null = null
    function onChange(file: string): void {
        if (isIgnored(file)) return
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
            timer = null
            const label = file ? path.basename(file) : 'source'
            process.stdout.write(
                `${colors.gray('Change detected')} ${ui.path(`(${label})`)} ` +
                `${colors.gray('— rebuilding...')} `
            )
            try {
                // silence the build's own per-file logs; we print one line per save
                const realLog = console.log
                console.log = () => {}
                try { rebuild() } finally { console.log = realLog }
                console.log(colors.green('reloaded.'))
                notifyReload()
            } catch (err) {
                // keep the server alive on a bad build; report and wait for the fix
                console.log(colors.red('failed.'))
                console.error(ui.error((err as Error).message))
            }
        }, 120)
    }

    // watch the Markdown tree (recursive works on win32 + macOS)
    try {
        fs.watch(config.inputPath, { recursive: true }, (_evt, filename) =>
            onChange(filename ? filename.toString() : '')
        )
    } catch {
        console.warn(ui.warn(`Could not watch "${config.inputPath}" — is it missing?`))
    }

    // also watch docurator.config.json (lives next to the input, in cwd)
    const configPath = path.join(process.cwd(), 'docurator.config.json')
    if (fs.existsSync(configPath)) {
        fs.watch(configPath, () => onChange('docurator.config.json'))
    }
}
