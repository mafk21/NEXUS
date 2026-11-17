const path = require('node:path')

const BUILTIN_FILES = new Set(['gaming.png', 'study.png', 'work.png', 'dusk.png', 'custom.png'])
const USER_REFERENCE = /^user:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(png|jpg)$/i
const MAX_IMAGE_BYTES = 20 * 1024 * 1024

function resolveWallpaperPath(reference, { builtinDir, userDir }) {
  if (typeof reference !== 'string') throw new Error('Invalid wallpaper reference.')
  if (reference.startsWith('builtin:')) {
    const name = reference.slice('builtin:'.length)
    if (!BUILTIN_FILES.has(name)) throw new Error('Unknown built-in wallpaper.')
    return path.join(builtinDir, name)
  }
  const match = USER_REFERENCE.exec(reference)
  if (!match) throw new Error('Invalid wallpaper reference.')
  return path.join(userDir, `${match[1]}.${match[2].toLowerCase()}`)
}
function imageExtension(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png'
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg'
  throw new Error('Please choose a valid PNG or JPEG image.')
}
// Electron provides BGRA pixels top-to-bottom; a negative BMP height keeps that orientation.
function bitmapToBmp(bitmap, width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 || width * height > 40000000 || bitmap.length !== width * height * 4) throw new Error('The image dimensions are not supported.')
  const bytes = bitmap.length
  const header = Buffer.alloc(54)
  header.write('BM', 0); header.writeUInt32LE(54 + bytes, 2); header.writeUInt32LE(54, 10)
  header.writeUInt32LE(40, 14); header.writeInt32LE(width, 18); header.writeInt32LE(-height, 22)
  header.writeUInt16LE(1, 26); header.writeUInt16LE(32, 28); header.writeUInt32LE(bytes, 34)
  return Buffer.concat([header, bitmap])
}
function wallpaperPowerShell(filePath) {
  const encodedPath = Buffer.from(filePath, 'utf16le').toString('base64')
  const script = `$ErrorActionPreference = 'Stop'\n$p = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${encodedPath}'))\nAdd-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class NexusWallpaper { [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool SystemParametersInfo(uint action, uint param, string path, uint flags); }'\nif (-not [NexusWallpaper]::SystemParametersInfo(20, 0, $p, 3)) { throw "Windows could not apply the wallpaper (error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))." }`
  return Buffer.from(script, 'utf16le').toString('base64')
}
module.exports = { BUILTIN_FILES, MAX_IMAGE_BYTES, resolveWallpaperPath, imageExtension, bitmapToBmp, wallpaperPowerShell }
