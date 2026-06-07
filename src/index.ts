import { loadConfig } from './core/config'
import { recursiveParse } from './core/parser'
import { buildSPA } from './core/spa'

const config = loadConfig()

if (config.mode === 'spa') {
    buildSPA(config.inputPath, config)
} else {
    recursiveParse(config.inputPath, config)
}