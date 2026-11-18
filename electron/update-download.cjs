const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { createHash } = require('node:crypto')
const MAX_INSTALLER = 512 * 1024 * 1024
const ALLOWED_HOSTS = new Set(['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com', 'github-releases.githubusercontent.com'])
function safeDownloadUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && ALLOWED_HOSTS.has(url.hostname) } catch { return false }
}
function releaseDownloadUrl(version) {
  return `https://github.com/mafk21/NEXUS/releases/download/${encodeURIComponent(`v${version}`)}/${encodeURIComponent(`NEXUS Setup ${version}.exe`)}`
}
function validMetadata(asset) { return !!asset && Number.isSafeInteger(asset.size) && asset.size > 0 && asset.size <= MAX_INSTALLER && typeof asset.digest === 'string' && /^sha256:[a-f0-9]{64}$/.test(asset.digest) }
async function hashFile(file, expectedSize) {
  const stat = await fsp.lstat(file)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== expectedSize) throw new Error('Downloaded installer was changed.')
  const hash = createHash('sha256'); const stream = fs.createReadStream(file)
  for await (const chunk of stream) hash.update(chunk)
  return `sha256:${hash.digest('hex')}`
}
async function downloadInstaller({ net, version, asset, progress = () => {}, timeoutMs = 300000, tempRoot = os.tmpdir() }) {
  if (!validMetadata(asset)) throw new Error('This release does not provide a verifiable Windows installer.')
  const url = releaseDownloadUrl(version)
  if (!safeDownloadUrl(url)) throw new Error('Invalid download address.')
  const dir = await fsp.mkdtemp(path.join(tempRoot, 'nexus-update-'))
  const file = path.join(dir, 'NEXUS-Update.exe')
  let handle, timer, response, timedOut = false
  try {
    handle = await fsp.open(file, 'wx', 0o600)
    const request = net.request({ method: 'GET', url, redirect: 'manual', useSessionCookies: false })
    request.setHeader('Accept', 'application/octet-stream')
    request.setHeader('User-Agent', 'NEXUS-update-download')
    let redirects = 0
    response = await new Promise((resolve, reject) => {
      timer = setTimeout(() => { timedOut = true; request.abort(); response?.destroy(new Error('Download timed out.')); reject(new Error('Download timed out.')) }, timeoutMs)
      request.on('redirect', (_code, _method, target) => {
        if (++redirects > 5 || !safeDownloadUrl(target)) { request.abort(); reject(new Error('Download redirected to an untrusted address.')); return }
        request.followRedirect()
      })
      request.on('response', resolve)
      request.on('error', reject)
      request.end()
    })
    if (response.statusCode !== 200) { response.resume(); throw new Error('GitHub could not provide the installer.') }
    const hash = createHash('sha256'); let bytes = 0, lastPercent = -1
    for await (const chunk of response) {
      bytes += chunk.length
      if (bytes > asset.size || bytes > MAX_INSTALLER) { request.abort(); throw new Error('Installer exceeded the expected size.') }
      hash.update(chunk)
      let offset = 0
      while (offset < chunk.length) { const { bytesWritten } = await handle.write(chunk, offset, chunk.length - offset); if (!bytesWritten) throw new Error('Could not write installer.'); offset += bytesWritten }
      const percent = Math.floor(bytes / asset.size * 100)
      if (percent !== lastPercent) { lastPercent = percent; progress({ received: bytes, total: asset.size }) }
    }
    await handle.close(); handle = null
    if (bytes !== asset.size || `sha256:${hash.digest('hex')}` !== asset.digest) throw new Error('Installer integrity check failed. Nothing was installed.')
    return { dir, file, size: bytes, digest: asset.digest, version }
  } catch (error) {
    if (handle) await handle.close().catch(() => {})
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {})
    if (timedOut) throw new Error('Download timed out.')
    throw error
  } finally { clearTimeout(timer) }
}
async function verifyPrepared(prepared) {
  if (!prepared || path.dirname(prepared.file) !== prepared.dir || path.basename(prepared.file) !== 'NEXUS-Update.exe') throw new Error('No verified installer is ready.')
  const actualDir = await fsp.realpath(prepared.dir)
  if (actualDir !== await fsp.realpath(path.dirname(prepared.file))) throw new Error('Installer location changed.')
  if (await hashFile(prepared.file, prepared.size) !== prepared.digest) throw new Error('Downloaded installer was changed. Nothing was installed.')
}
module.exports = { MAX_INSTALLER, safeDownloadUrl, releaseDownloadUrl, validMetadata, downloadInstaller, verifyPrepared }
