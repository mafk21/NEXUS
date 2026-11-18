import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
const require = createRequire(import.meta.url)
const { releaseTagFor } = require('../scripts/release-tag.cjs')
const files = version => [{ version }, { version, packages: { '': { version } } }]
describe('release tag selection', () => {
  it('derives the existing tag format from the version, including prereleases', () => {
    expect(releaseTagFor(...files('1.0.0-rc.3'))).toBe('v1.0.0-rc.3')
    expect(releaseTagFor(...files('1.0.0'))).toBe('v1.0.0')
  })
  it('rejects invalid or unsafe versions rather than building an arbitrary ref', () => {
    for (const version of ['v1.0.0', '1.0.0+metadata', '1.0.0-01', '1.0.0/other', '', null]) expect(() => releaseTagFor(...files(version))).toThrow()
  })
  it('requires both lockfile version fields to agree', () => {
    const [pkg, lock] = files('1.0.0-rc.3')
    expect(() => releaseTagFor(pkg, { ...lock, version: '1.0.0-rc.2' })).toThrow('must match')
    expect(() => releaseTagFor(pkg, { ...lock, packages: { '': { version: '1.0.0-rc.2' } } })).toThrow('must match')
  })
})
