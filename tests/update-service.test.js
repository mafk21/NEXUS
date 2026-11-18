import { describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { createUpdateService, compareVersions, parseVersion } = require('../electron/update-service.cjs')
const app = (version = '1.0.0-rc.1') => ({ isPackaged: true, getVersion: () => version })
const release = (version, asset = true) => ({ tag_name: `v${version}`, draft: false, prerelease: version.includes('-'), assets: asset ? [{ name: `NEXUS Setup ${version}.exe`, state: 'uploaded', size: 123, digest: `sha256:${'a'.repeat(64)}` }] : [] })
const shell = () => ({ openExternal: vi.fn().mockResolvedValue() })
describe('release versions', () => {
  it('compares strict SemVer precedence including prereleases and build metadata', () => {
    const versions = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0']
    for (let i = 0; i < versions.length - 1; i++) expect(compareVersions(versions[i], versions[i + 1])).toBeLessThan(0)
    expect(compareVersions('2.0.0', '1.999999999999999999999.0')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0+abc', '1.0.0+xyz')).toBe(0)
    for (const bad of ['v1.0.0', '01.0.0', '1.2', '1.0.0-01', '1.0.0/../../x', '', null]) expect(parseVersion(bad)).toBeNull()
  })
})
describe('manual Windows update checks', () => {
  it('selects the highest eligible release with an uploaded Windows installer and opens only its official page after checking', async () => {
    const browser = shell(); const service = createUpdateService({ app: app(), shell: browser, platform: 'win32', getReleases: vi.fn().mockResolvedValue([release('1.1.0-rc.2'), release('1.0.0'), release('1.1.0-rc.10'), { ...release('9.0.0'), draft: true }, release('2.0.0', false)]) })
    expect((await service.openRelease()).error).toBeTruthy()
    expect(await service.check()).toEqual({ status: 'available', current: '1.0.0-rc.1', version: '1.1.0-rc.10' })
    expect(await service.openRelease()).toEqual({ success: true })
    expect(browser.openExternal).toHaveBeenCalledWith('https://github.com/mafk21/NEXUS/releases/tag/v1.1.0-rc.10')
  })
  it('excludes prereleases for stable installs, and distinguishes no releases, missing installers and up to date', async () => {
    let items = []
    const service = createUpdateService({ app: app('1.0.0'), shell: shell(), platform: 'win32', getReleases: async () => items })
    expect((await service.check()).status).toBe('no-releases')
    items = [release('1.0.0'), release('2.0.0-rc.1')]; expect((await service.check()).status).toBe('up-to-date')
    items = [release('1.0.0'), release('1.2.0', false)]; expect((await service.check()).status).toBe('no-installer')
    items = [release('1.2.0')]; expect((await service.check()).status).toBe('available')
  })
  it('rejects invalid metadata, unuploaded installers and malicious release URLs; clears stale results on error', async () => {
    let items = [release('1.1.0')]; const browser = shell()
    const service = createUpdateService({ app: app(), shell: browser, platform: 'win32', getReleases: async () => { if (items === null) throw Error('offline'); return items } })
    expect((await service.check()).status).toBe('available')
    items = null; expect((await service.check()).status).toBe('error'); expect((await service.openRelease()).error).toBeTruthy(); expect(browser.openExternal).not.toHaveBeenCalled()
    items = [{ ...release('9.0.0'), tag_name: 'v9.0.0/../../evil', html_url: 'https://evil.example' }, { ...release('2.0.0'), assets: [{ name: 'NEXUS Setup 2.0.0.exe', size: 10, state: 'new', digest: `sha256:${'a'.repeat(64)}` }] }]
    expect((await service.check()).status).toBe('no-installer'); expect((await service.openRelease()).error).toBeTruthy()
  })
  it('does not check or open anything on Linux, in a development build or with an invalid local version', async () => {
    const getReleases = vi.fn(), browser = shell()
    for (const service of [createUpdateService({ app: app(), shell: browser, platform: 'linux', getReleases }), createUpdateService({ app: { ...app(), isPackaged: false }, shell: browser, platform: 'win32', getReleases }), createUpdateService({ app: app('bad'), shell: browser, platform: 'win32', getReleases })]) {
      expect(['unsupported', 'error']).toContain((await service.check()).status); expect((await service.openRelease()).error).toBeTruthy()
    }
    expect(getReleases).not.toHaveBeenCalled(); expect(browser.openExternal).not.toHaveBeenCalled()
  })
  it('downloads and verifies only after a check, and opens the installer only on a separate explicit action', async () => {
    const browser = { ...shell(), openPath: vi.fn().mockResolvedValue('') }
    const prepared = { dir: '/fake/updates', file: '/fake/updates/NEXUS-Update.exe', size: 123, version: '1.1.0', digest: `sha256:${'a'.repeat(64)}` }
    const download = vi.fn().mockResolvedValue(prepared), verify = vi.fn().mockResolvedValue()
    const service = createUpdateService({ app: app(), shell: browser, platform: 'win32', getReleases: async () => [release('1.1.0')], download, verify })
    expect((await service.install()).error).toBeTruthy(); expect((await service.download()).error).toBeTruthy()
    await service.check(); expect(browser.openPath).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled()
    expect((await service.download()).success).toBe(true); expect(browser.openPath).not.toHaveBeenCalled()
    expect((await service.install()).success).toBe(true); expect(verify).toHaveBeenCalledWith(prepared); expect(browser.openPath).toHaveBeenCalledWith(prepared.file)
  })
  it('never launches an installer that fails verification and blocks overlapping downloads', async () => {
    let resolveDownload
    const browser = { ...shell(), openPath: vi.fn() }
    const prepared = { dir: '/fake/updates', file: '/fake/updates/NEXUS-Update.exe', size: 123, version: '1.1.0', digest: `sha256:${'a'.repeat(64)}` }
    const service = createUpdateService({ app: app(), shell: browser, platform: 'win32', getReleases: async () => [release('1.1.0')], download: () => new Promise(resolve => { resolveDownload = resolve }), verify: async () => { throw new Error('changed') } })
    await service.check(); const pending = service.download()
    expect((await service.download()).error).toContain('already running'); expect((await service.install()).error).toContain('already running')
    resolveDownload(prepared); await pending
    expect((await service.install()).error).toContain('could not be verified'); expect(browser.openPath).not.toHaveBeenCalled()
  })
  it('refuses releases without a checksum or with invalid installer metadata', async () => {
    const noDigest = release('1.1.0'); delete noDigest.assets[0].digest
    const service = createUpdateService({ app: app(), shell: shell(), platform: 'win32', getReleases: async () => [noDigest] })
    expect((await service.check()).status).toBe('no-installer'); expect((await service.download()).error).toBeTruthy()
  })
  it('does not allow overlapping checks or an update page from an unfinished check', async () => {
    let finish; const getReleases = () => new Promise(resolve => { finish = resolve }); const browser = shell()
    const service = createUpdateService({ app: app(), shell: browser, platform: 'win32', getReleases })
    const pending = service.check(); expect((await service.check()).status).toBe('error'); expect((await service.openRelease()).error).toBeTruthy()
    finish([release('1.1.0')]); expect((await pending).status).toBe('available')
  })
})

describe('GitHub release network requests', () => {
  const { fetchReleases } = require('../electron/update-service.cjs')
  it('uses a fixed HTTPS endpoint, no credentials or redirects, and parses a bounded response', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([release('1.1.0')]), { status: 200 }))
    expect(await fetchReleases(fetch)).toEqual([release('1.1.0')])
    expect(fetch.mock.calls[0][0]).toBe('https://api.github.com/repos/mafk21/NEXUS/releases?per_page=100')
    expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: 'error', credentials: 'omit', headers: { Accept: 'application/vnd.github+json' } })
  })
  it('handles malformed, oversized, rate-limited and timed-out requests', async () => {
    await expect(fetchReleases(vi.fn().mockResolvedValue(new Response('bad', { status: 200 })))).rejects.toThrow('invalid release')
    await expect(fetchReleases(vi.fn().mockResolvedValue(new Response('x'.repeat(2 * 1024 * 1024 + 1), { status: 200 })))).rejects.toThrow('too large')
    await expect(fetchReleases(vi.fn().mockResolvedValue(new Response('', { status: 403 })))).rejects.toThrow('rate-limiting')
    const stalled = vi.fn((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted')))))
    await expect(fetchReleases(stalled, { timeoutMs: 5 })).rejects.toThrow('timed out')
  })
})
