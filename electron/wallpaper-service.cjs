const path = require('node:path')
const fs = require('node:fs/promises')
const crypto = require('node:crypto')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const { MAX_IMAGE_BYTES, resolveWallpaperPath, imageExtension, bitmapToBmp, wallpaperPowerShell } = require('./wallpaper.cjs')

function createWallpaperService({ app, dialog, nativeImage, getWindow, platform = process.platform, execute = promisify(execFile) }) {
  function directories() {
    return { builtinDir: path.join(app.getAppPath(), app.isPackaged ? 'dist/wallpapers' : 'public/wallpapers'), userDir: path.join(app.getPath('userData'), 'wallpapers') }
  }
  async function readImage(filePath) {
    const stat = await fs.stat(filePath)
    if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES || stat.size === 0) throw new Error('Image must be a PNG or JPEG smaller than 20 MB.')
    const buffer = await fs.readFile(filePath)
    const ext = imageExtension(buffer)
    const image = nativeImage.createFromBuffer(buffer)
    const size = image.getSize()
    if (image.isEmpty() || !size.width || !size.height || size.width * size.height > 40000000) throw new Error('Unable to read this image, or its dimensions are too large.')
    return { buffer, image, ext, size }
  }
  function safeError(error) {
    if (error?.code === 'ENOENT') return 'Wallpaper file not found. Please choose it again.'
    return error?.message || 'Something went wrong while handling the wallpaper.'
  }
  return {
    async choose() {
      try {
        const result = await dialog.showOpenDialog(getWindow(), { title: 'Choose a wallpaper', properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }] })
        if (result.canceled || !result.filePaths[0]) return { canceled: true }
        const { buffer, ext } = await readImage(result.filePaths[0])
        const dirs = directories(); await fs.mkdir(dirs.userDir, { recursive: true })
        const name = `${crypto.randomUUID()}.${ext}`
        await fs.writeFile(path.join(dirs.userDir, name), buffer, { flag: 'wx' })
        return { reference: `user:${name}` }
      } catch (error) { return { error: safeError(error) } }
    },
    async preview(reference) {
      try {
        const { buffer, ext } = await readImage(resolveWallpaperPath(reference, directories()))
        return { dataUrl: `data:image/${ext === 'jpg' ? 'jpeg' : 'png'};base64,${buffer.toString('base64')}` }
      } catch (error) { return { error: safeError(error) } }
    },
    async exportImage(reference) {
      try {
        const { buffer, ext } = await readImage(resolveWallpaperPath(reference, directories()))
        const result = await dialog.showSaveDialog(getWindow(), {
          title: 'Save wallpaper image', defaultPath: `NEXUS-wallpaper.${ext}`,
          filters: [{ name: ext === 'png' ? 'PNG image' : 'JPEG image', extensions: ext === 'png' ? ['png'] : ['jpg', 'jpeg'] }]
        })
        if (result.canceled || !result.filePath) return { canceled: true }
        if (!path.isAbsolute(result.filePath)) throw new Error('Choose a valid destination.')
        if (!new RegExp(ext === 'png' ? '\\.png$' : '\\.(jpg|jpeg)$', 'i').test(result.filePath)) throw new Error('Choose a filename matching the image format.')
        await fs.writeFile(result.filePath, buffer)
        return { success: true }
      } catch (error) { return { error: safeError(error) } }
    },
    async apply(reference) {
      if (platform !== 'win32') return { error: 'Applying wallpapers is currently available on Windows only.' }
      try {
        const dirs = directories()
        const { image, size, buffer } = await readImage(resolveWallpaperPath(reference, dirs))
        const bmp = bitmapToBmp(image.toBitmap(), size.width, size.height)
        await fs.mkdir(dirs.userDir, { recursive: true })
        const hash = crypto.createHash('sha256').update(buffer).digest('hex')
        const output = path.join(dirs.userDir, `applied-${hash}.bmp`)
        await fs.writeFile(output, bmp)
        const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
        await execute(powershell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', wallpaperPowerShell(output)], { timeout: 30000, windowsHide: true })
        return { success: true }
      } catch (error) { return { error: safeError(error) } }
    }
  }
}
module.exports = { createWallpaperService }
