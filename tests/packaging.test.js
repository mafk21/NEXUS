import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { FileMatcher } = require('app-builder-lib/out/fileMatcher.js')
const pkg = require('../package.json')

describe('packaging dependency compatibility', () => {
  it('matches NEXUS files using electron-builder with the patched minimatch', () => {
    const root = path.resolve('packaging-test-root')
    const matcher = new FileMatcher(root, path.join(root, 'out'), pattern => pattern, pkg.build.files)
    const filter = matcher.createFilter()
    const file = { isDirectory: () => false }
    const directory = { isDirectory: () => true }
    for (const entry of ['dist/index.html', 'dist/assets/app.js', 'electron/main.cjs', 'electron/preload.cjs', 'package.json']) {
      expect(filter(path.join(root, entry), file), entry).toBe(true)
    }
    expect(filter(path.join(root, 'dist'), directory)).toBe(true)
    expect(filter(path.join(root, 'electron'), directory)).toBe(true)
    expect(filter(path.join(root, 'tests/app.test.jsx'), file)).toBe(false)
  })
  it('keeps the older glob dependency compatible for packaging tools', () => {
    const glob = require('glob')
    expect(glob.sync('electron/*.cjs')).toContain('electron/main.cjs')
  })
})
