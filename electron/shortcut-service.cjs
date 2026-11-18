const path = require('node:path')
const fs = require('node:fs/promises')
const { constants } = require('node:fs')
const { spawn, execFile } = require('node:child_process')
const { promisify } = require('node:util')
const crypto = require('node:crypto')
const TOKEN = /^pick:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
const TYPES = ['app', 'file', 'folder']
function validWebUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || value !== value.trim()) return false
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password } catch { return false }
}
function createShortcutService({ app, shell, dialog, getWindow, platform = process.platform, spawnProcess = spawn, execute = promisify(execFile) }) {
  async function validateApp(target) {
    if (platform === 'win32') {
      if (!/\.(exe|lnk)$/i.test(target)) throw new Error('Choose a Windows application (.exe or .lnk).')
    } else if (platform === 'linux') {
      if (/\.(exe|lnk)$/i.test(target)) throw new Error('Choose a Linux executable or .desktop launcher, not a Windows .exe or .lnk application.')
      if (/\.desktop$/i.test(target)) return
      try { await fs.access(target, constants.X_OK) } catch { throw new Error('Choose an executable Linux application file.') }
    } else throw new Error('App shortcuts are not supported on this platform.')
  }
  function startLinuxApp(target) {
    return new Promise((resolve, reject) => {
      let child
      try { child = spawnProcess(target, [], { detached: true, stdio: 'ignore', shell: false }) }
      catch (error) { reject(error); return }
      child.once('error', reject)
      child.once('spawn', () => { child.unref(); resolve() })
    })
  }
  const registryPath = () => path.join(app.getPath('userData'), 'shortcut-targets.json')
  async function readRegistry() {
    try {
      const data = JSON.parse(await fs.readFile(registryPath(), 'utf8'))
      if (!Array.isArray(data) || data.some(entry => !entry || !TOKEN.test(`pick:${entry.id}`) || !TYPES.includes(entry.type) || typeof entry.path !== 'string' || !path.isAbsolute(entry.path))) throw new Error('Shortcut registry is invalid; existing data was not changed.')
      return data
    } catch (error) {
      if (error.code === 'ENOENT') return []
      if (error instanceof SyntaxError) throw new Error('Shortcut registry is invalid; existing data was not changed.')
      throw error
    }
  }
  async function choose(type) {
    if (!TYPES.includes(type)) return { error: 'Choose an app, file, or folder.' }
    try {
      const options = type === 'folder' ? { properties: ['openDirectory'] } : { properties: ['openFile'], ...(type === 'app' && platform === 'win32' ? { filters: [{ name: 'Windows applications', extensions: ['exe', 'lnk'] }] } : {}) }
      const result = await dialog.showOpenDialog(getWindow(), { title: `Choose ${type === 'app' ? 'an app' : `a ${type}`}`, ...options })
      if (result.canceled || !result.filePaths[0]) return { canceled: true }
      const target = result.filePaths[0]
      if (!path.isAbsolute(target)) throw new Error('Choose an absolute path from the picker.')
      const stat = await fs.stat(target)
      if (type === 'folder' ? !stat.isDirectory() : !stat.isFile()) throw new Error('The selected item has the wrong type.')
      if (type === 'app') await validateApp(target)
      const entries = await readRegistry(), id = crypto.randomUUID()
      entries.push({ id, type, path: target })
      await fs.mkdir(app.getPath('userData'), { recursive: true })
      const temp = `${registryPath()}.${id}.tmp`
      try { await fs.writeFile(temp, JSON.stringify(entries), { flag: 'wx' }); await fs.rename(temp, registryPath()) }
      finally { await fs.rm(temp, { force: true }).catch(() => {}) }
      return { target: `pick:${id}`, label: path.basename(target) }
    } catch (error) { return { error: error.message || 'Could not save this shortcut.' } }
  }
  async function open(type, target) {
    try {
      if (type === 'website') {
        if (!validWebUrl(target)) return { error: 'Only valid http or https links can be opened.' }
        await shell.openExternal(target)
        return { success: true }
      }
      if (!TYPES.includes(type) || typeof target !== 'string') return { error: 'Invalid shortcut.' }
      const match = TOKEN.exec(target)
      if (!match) return { error: 'Choose the target again in the desktop app.' }
      const item = (await readRegistry()).find(entry => entry.id === match[1] && entry.type === type)
      if (!item) return { error: 'Shortcut target not found. Choose it again.' }
      const stat = await fs.stat(item.path)
      if (type === 'folder' ? !stat.isDirectory() : !stat.isFile()) return { error: 'The target is no longer the expected type.' }
      if (type === 'app') {
        await validateApp(item.path)
        if (platform === 'linux') {
          if (/\.desktop$/i.test(item.path)) await execute('gio', ['launch', item.path], { timeout: 15000 })
          else await startLinuxApp(item.path)
          return { success: true }
        }
      }
      const error = await shell.openPath(item.path)
      return error ? { error } : { success: true }
    } catch (error) { return { error: error.code === 'ENOENT' ? 'Target not found. It may have been moved or deleted.' : (error.message || 'Could not open this shortcut.') } }
  }
  return { choose, open }
}
module.exports = { createShortcutService, validWebUrl }
