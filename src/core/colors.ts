// Tiny zero-dependency ANSI styling. Colors are disabled automatically when
// output isn't a TTY (e.g. piped to a file) or when NO_COLOR / --no-color is set,
// so logs stay clean in CI and redirects.

const enabled =
    !process.env.NO_COLOR &&
    !process.argv.includes('--no-color') &&
    process.stdout.isTTY === true

function wrap(open: number, close: number) {
    return (s: string | number): string =>
        enabled ? `\x1b[${open}m${s}\x1b[${close}m` : String(s)
}

export const colors = {
    enabled,
    reset: '\x1b[0m',
    bold: wrap(1, 22),
    dim: wrap(2, 22),
    italic: wrap(3, 23),
    underline: wrap(4, 24),

    black: wrap(30, 39),
    red: wrap(31, 39),
    green: wrap(32, 39),
    yellow: wrap(33, 39),
    blue: wrap(34, 39),
    magenta: wrap(35, 39),
    cyan: wrap(36, 39),
    white: wrap(37, 39),
    gray: wrap(90, 39),
}

// semantic helpers used across the CLI
export const ui = {
    success: (s: string) => `${colors.green('✓')} ${s}`,
    info: (s: string) => `${colors.cyan('•')} ${s}`,
    warn: (s: string) => `${colors.yellow('!')} ${s}`,
    error: (s: string) => `${colors.red('✗')} ${s}`,
    // a labelled accent, e.g. heading("Docurator")
    heading: (s: string) => colors.bold(colors.magenta(s)),
    link: (s: string) => colors.cyan(colors.underline(s)),
    path: (s: string) => colors.cyan(s),
    muted: (s: string) => colors.gray(s),
}
