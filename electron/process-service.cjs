const path = require('node:path')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')
function createProcessService({ platform = process.platform, execute = promisify(execFile) } = {}) {
  return {
    async list() {
      if (platform !== 'win32') return { error: 'App detection is available on Windows only.' }
      try {
        const tasklist = path.win32.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tasklist.exe')
        const { stdout } = await execute(tasklist, ['/FO', 'CSV', '/NH'], { timeout: 10000, windowsHide: true, maxBuffer: 1024 * 1024 })
        const names = [...new Set(stdout.split(/\r?\n/).map(line => /^"((?:[^"]|"")+)"/.exec(line)?.[1]?.replace(/""/g, '"')).filter(name => name && /^[^\\/:*?"<>|\r\n]{1,100}\.exe$/i.test(name)))].slice(0, 1000)
        return { names }
      } catch { return { error: 'Could not read running app names.' } }
    }
  }
}
module.exports = { createProcessService }
