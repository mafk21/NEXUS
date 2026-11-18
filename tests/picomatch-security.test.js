import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const picomatch = require('picomatch')

describe('patched build-time glob matcher', () => {
  it('uses the pinned fork and preserves common build glob behavior', () => {
    const metadata = require('picomatch/package.json')
    expect(metadata.name).toBe('@ryotsu/picomatch')
    expect(metadata.version).toBe('4.0.7-a')
    expect(picomatch.isMatch('dist/assets/index.js', 'dist/**/*')).toBe(true)
    expect(picomatch.isMatch('electron/main.cjs', 'electron/**/*')).toBe(true)
    expect(picomatch.isMatch('tests/app.test.jsx', 'tests/**/*.test.jsx')).toBe(true)
    expect(picomatch.isMatch('src/App.jsx', 'tests/**/*.test.jsx')).toBe(false)
  })

  it('finishes representative CVE-2026-112366 inputs without nested wildcard backtracking', () => {
    // Run in a separate process with a hard timeout: a regression must not hang the test runner.
    const script = `
      const assert = require('node:assert');
      const pm = require('picomatch');
      const cases = [
        ['+(*a)', 'a'.repeat(80) + '!'],
        ['*(*a)', 'a'.repeat(80) + '!'],
        ['+(*)b', 'a'.repeat(80) + '!'],
        ['*(*)b', 'a'.repeat(80) + '!'],
        ['+(a*b)', 'ab'.repeat(40) + '!'],
        ['+(@(*a))', 'a'.repeat(80) + '!'],
        ['+(?(*a))', 'a'.repeat(80) + '!']
      ];
      for (const options of [{}, { windows: true }, { capture: true }]) {
        for (const [pattern, input] of cases) assert.strictEqual(pm.isMatch(input, pattern, options), false, pattern);
      }
    `
    const result = spawnSync(process.execPath, ['-e', script], { cwd: process.cwd(), timeout: 5000, windowsHide: true, encoding: 'utf8' })
    expect(result.error?.message).toBeUndefined()
    expect(result.status, result.stderr).toBe(0)
  }, 10000)
})
