import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
const require = createRequire(import.meta.url)
const { createWallpaperService } = require('../electron/wallpaper-service.cjs')
const folders = []
afterEach(async () => { for (const folder of folders.splice(0)) await rm(folder, { recursive: true, force: true }) })
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nexus-wallpaper-test-')); folders.push(root)
  const appDir = path.join(root, 'app'), userDir = path.join(root, 'userdata')
  await mkdir(path.join(appDir, 'public/wallpapers'), { recursive: true }); await mkdir(userDir)
  const png = Buffer.from([137,80,78,71,13,10,26,10,1,2,3]); const original = path.join(root, 'original.png'); await writeFile(original, png)
  const app = { getAppPath: () => appDir, getPath: () => userDir, isPackaged: false }
  const dialog = { showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [original] }) }
  const nativeImage = { createFromBuffer: () => ({ isEmpty: () => false, getSize: () => ({ width: 1, height: 1 }), toBitmap: () => Buffer.from([1,2,3,4]) }) }
  return { root, appDir, userDir, original, png, app, dialog, nativeImage }
}
describe('desktop wallpaper service', () => {
  it('copies an imported file, keeps a preview when the original disappears, and prepares Windows application', async () => {
    const f = await fixture(); const execute = vi.fn().mockResolvedValue({ stdout: '', stderr: '' })
    const service = createWallpaperService({ ...f, getWindow: () => ({}), platform: 'win32', execute })
    const result = await service.choose(); expect(result.reference).toMatch(/^user:/)
    await unlink(f.original); expect((await service.preview(result.reference)).dataUrl).toBe(`data:image/png;base64,${f.png.toString('base64')}`)
    expect(await service.apply(result.reference)).toEqual({ success: true }); expect(execute).toHaveBeenCalledOnce()
    const args = execute.mock.calls[0][1]; const script = Buffer.from(args[3], 'base64').toString('utf16le')
    const encodedPath = script.match(/FromBase64String\('([^']+)'\)/)[1]; const bmpPath = Buffer.from(encodedPath, 'base64').toString('utf16le')
    expect((await readFile(bmpPath)).toString('ascii', 0, 2)).toBe('BM')
  })
  it('returns useful errors for missing or invalid files and does not invoke Windows', async () => {
    const f = await fixture(); const execute = vi.fn()
    const service = createWallpaperService({ ...f, getWindow: () => ({}), platform: 'win32', execute })
    expect((await service.apply('user:12345678-1234-1234-1234-123456789abc.png')).error).toContain('not found')
    expect((await service.preview('builtin:../secret')).error).toBeTruthy()
    await writeFile(f.original, 'not an image'); expect((await service.choose()).error).toContain('PNG or JPEG')
    expect(execute).not.toHaveBeenCalled()
  })
  it('exports a chosen image only to the destination chosen in the save dialog', async () => {
    const f = await fixture(); const output = path.join(f.root, 'saved.png')
    f.dialog.showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: output })
    const service = createWallpaperService({ ...f, getWindow: () => ({}), platform: 'linux' })
    const imported = await service.choose()
    expect(await service.exportImage(imported.reference)).toEqual({ success: true })
    expect(await readFile(output)).toEqual(f.png)
    f.dialog.showSaveDialog.mockResolvedValueOnce({ canceled: true })
    expect(await service.exportImage(imported.reference)).toEqual({ canceled: true })
    expect((await service.exportImage('builtin:../secret')).error).toBeTruthy()
    f.dialog.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: path.join(f.root, 'bad.jpg') })
    expect((await service.exportImage(imported.reference)).error).toContain('format')
  })
  it('does not claim non-Windows wallpaper application succeeds', async () => {
    const f = await fixture(); const service = createWallpaperService({ ...f, getWindow: () => ({}), platform: 'linux' })
    expect((await service.apply('builtin:gaming.png')).error).toContain('Windows only')
  })
})
