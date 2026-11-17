import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, rm, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { validShortcut, validWebUrl } from '../src/shortcuts.js'
const require = createRequire(import.meta.url)
const { createShortcutService, validWebUrl: validDesktopUrl } = require('../electron/shortcut-service.cjs')
const { createStartupService } = require('../electron/startup-service.cjs')
const dirs = []
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }) })
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'nexus-shortcut-')); dirs.push(dir)
  const file = path.join(dir, 'test file.txt'), exe = path.join(dir, 'test.exe'), folder = path.join(dir, 'folder')
  await writeFile(file, 'hello'); await writeFile(exe, 'mock'); await mkdir(folder)
  const app = { getPath: () => path.join(dir, 'userdata') }
  const dialog = { showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [file] }) }
  const shell = { openPath: vi.fn().mockResolvedValue(''), openExternal: vi.fn().mockResolvedValue() }
  return { dir, file, exe, folder, app, dialog, shell }
}
describe('shortcut safety and desktop service', () => {
  it('accepts only http/https URLs without credentials', () => {
    for (const url of ['https://example.com/a', 'http://example.com']) { expect(validWebUrl(url)).toBe(true); expect(validDesktopUrl(url)).toBe(true) }
    for (const url of ['file:///secret', 'javascript:alert(1)', 'https://user:pass@example.com/', 'https://', ' https://example.com']) { expect(validWebUrl(url)).toBe(false); expect(validDesktopUrl(url)).toBe(false) }
    expect(validShortcut({ id: 'x', label: 'X', type: 'file', target: '../../secret', autoOpen: false })).toBe(false)
  })
  it('only opens files/folders explicitly selected through the dialog, persisting the registry', async () => {
    const f = await fixture(); let svc = createShortcutService({ ...f, getWindow: () => ({}) })
    const file = await svc.choose('file'); expect(file.target).toMatch(/^pick:/)
    f.dialog.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [f.folder] })
    const folder = await svc.choose('folder'); expect(folder.target).toMatch(/^pick:/)
    svc = createShortcutService({ ...f, getWindow: () => ({}) })
    expect(await svc.open('file', file.target)).toEqual({ success: true }); expect(f.shell.openPath).toHaveBeenCalledWith(f.file)
    expect(await svc.open('folder', folder.target)).toEqual({ success: true }); expect(f.shell.openPath).toHaveBeenCalledWith(f.folder)
    expect((await svc.open('app', file.target)).error).toBeTruthy(); expect((await svc.open('file', f.file)).error).toBeTruthy()
    await unlink(f.file); expect((await svc.open('file', file.target)).error).toContain('not found')
  })
  it('opens allowed URLs, rejects dangerous links, and reports shell errors', async () => {
    const f = await fixture(); const svc = createShortcutService({ ...f, getWindow: () => ({}) })
    expect(await svc.open('website', 'https://example.com/')).toEqual({ success: true })
    expect((await svc.open('website', 'file:///etc/passwd')).error).toBeTruthy(); expect(f.shell.openExternal).toHaveBeenCalledTimes(1)
    f.shell.openPath.mockResolvedValue('Windows could not open this file')
    const chosen = await svc.choose('file'); expect((await svc.open('file', chosen.target)).error).toContain('could not open')
  })
  it('refuses invalid app targets, invalid type and corrupt registry', async () => {
    const f = await fixture(); const svc = createShortcutService({ ...f, getWindow: () => ({}) })
    expect((await svc.choose('app')).error).toContain('Windows application')
    expect((await svc.choose('evil')).error).toBeTruthy()
    await mkdir(f.app.getPath('userData')); await writeFile(path.join(f.app.getPath('userData'), 'shortcut-targets.json'), '{bad')
    expect((await svc.choose('file')).error).toContain('registry is invalid')
  })
})
describe('startup setting', () => {
  it('is unavailable for development and other platforms', () => {
    const app = { isPackaged: false, setLoginItemSettings: vi.fn() }
    expect(createStartupService({ app, platform: 'win32' }).get().available).toBe(false)
    expect(createStartupService({ app, platform: 'linux' }).set(true).error).toBeTruthy()
    expect(app.setLoginItemSettings).not.toHaveBeenCalled()
  })
  it('reports the actual Windows setting and failure instead of claiming success', () => {
    let enabled = false
    const app = { isPackaged: true, getLoginItemSettings: () => ({ openAtLogin: enabled }), setLoginItemSettings: ({ openAtLogin }) => { enabled = openAtLogin } }
    const svc = createStartupService({ app, platform: 'win32' }); expect(svc.get()).toEqual({ available: true, enabled: false })
    expect(svc.set(true)).toEqual({ success: true, enabled: true }); expect(svc.set('true').error).toBeTruthy()
    app.setLoginItemSettings = () => {}; expect(svc.set(false).error).toContain('did not update')
  })
})
