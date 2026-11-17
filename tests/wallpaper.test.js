import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { initialWorkspace, isValidWorkspace, setSetupWallpaper, wallpaperFor } from '../src/workspace.js'
const require = createRequire(import.meta.url)
const { resolveWallpaperPath, imageExtension, bitmapToBmp, wallpaperPowerShell } = require('../electron/wallpaper.cjs')
const dirs = { builtinDir: '/app/art', userDir: '/data/wallpapers' }

describe('wallpaper safety and data', () => {
  it('supports legacy setups without wallpaper metadata', () => {
    const ws = initialWorkspace(); delete ws.categories[0].setups[0].wallpaper
    expect(isValidWorkspace(ws)).toBe(true); expect(wallpaperFor(ws.categories[0], ws.categories[0].setups[0])).toBe('builtin:gaming.png')
  })
  it('assigns a wallpaper to just the chosen setup', () => {
    const ws = initialWorkspace(); const next = setSetupWallpaper(ws, 'gaming', 'default-gaming', 'builtin:study.png')
    expect(next.categories[0].setups[0].wallpaper).toBe('builtin:study.png'); expect(ws.categories[0].setups[0].wallpaper).toBe('builtin:gaming.png')
    expect(setSetupWallpaper(ws, 'gaming', 'default-gaming', 'user:../../secret')).toBe(ws)
  })
  it('resolves only known built-ins and valid imported tokens, rejecting traversal', () => {
    expect(resolveWallpaperPath('builtin:gaming.png', dirs)).toContain('gaming.png')
    expect(resolveWallpaperPath('user:12345678-1234-1234-1234-123456789abc.jpg', dirs)).toContain('12345678-1234-1234-1234-123456789abc.jpg')
    for (const value of ['builtin:../secret', 'user:../../secret.jpg', 'user:C:\\Windows\\x.png', 'file:///etc/passwd', null]) expect(() => resolveWallpaperPath(value, dirs)).toThrow()
  })
  it('validates image signatures', () => {
    expect(imageExtension(Buffer.from([137,80,78,71,13,10,26,10]))).toBe('png')
    expect(imageExtension(Buffer.from([255,216,255,1]))).toBe('jpg')
    expect(() => imageExtension(Buffer.from('not an image'))).toThrow()
  })
  it('constructs a top-down BMP and rejects malformed pixel data', () => {
    const bmp = bitmapToBmp(Buffer.from([1,2,3,4,5,6,7,8]), 2, 1)
    expect(bmp.toString('ascii', 0, 2)).toBe('BM'); expect(bmp.readInt32LE(18)).toBe(2); expect(bmp.readInt32LE(22)).toBe(-1); expect(bmp.subarray(54)).toEqual(Buffer.from([1,2,3,4,5,6,7,8]))
    expect(() => bitmapToBmp(Buffer.alloc(1), 10, 10)).toThrow()
  })
  it('encodes a Windows path as data rather than executable PowerShell', () => {
    const script = Buffer.from(wallpaperPowerShell("C:\\users\\a'b\\wallpaper.bmp"), 'base64').toString('utf16le')
    expect(script).not.toContain("C:\\users\\a'b"); expect(script).toContain('SystemParametersInfo'); expect(script).toContain('[Convert]::FromBase64String')
  })
})
