const path = require('node:path')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
const KEYS = Object.freeze({ previous: 0xb1, playPause: 0xb3, next: 0xb0 })
function createMediaService({ platform = process.platform, execute = promisify(execFile) } = {}) {
  return {
    async send(command) {
      if (platform !== 'win32') return { error: 'System media controls are currently available on Windows only.' }
      if (!Object.hasOwn(KEYS, command)) return { error: 'Invalid media command.' }
      // The key code comes from a fixed allowlist, never from a shell string supplied by the renderer.
      const script = `$ErrorActionPreference='Stop'\nAdd-Type -TypeDefinition 'using System.Runtime.InteropServices; public static class NexusMediaKeys { [DllImport("user32.dll")] public static extern void keybd_event(byte key, byte scan, uint flags, System.UIntPtr extra); }'\n[NexusMediaKeys]::keybd_event(${KEYS[command]}, 0, 0, [UIntPtr]::Zero)\n[NexusMediaKeys]::keybd_event(${KEYS[command]}, 0, 2, [UIntPtr]::Zero)`
      const powershell = path.win32.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
      try { await execute(powershell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { timeout: 10000, windowsHide: true }); return { success: true } }
      catch { return { error: 'Could not send the media command to Windows.' } }
    }
  }
}
module.exports = { createMediaService }
