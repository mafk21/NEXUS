const API_URL = 'https://api.github.com/repos/mafk21/NEXUS/releases?per_page=100'
const RELEASE_ROOT = 'https://github.com/mafk21/NEXUS/releases/tag/'
const MAX_RESPONSE = 2 * 1024 * 1024
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

function parseVersion(value) {
  if (typeof value !== 'string' || value.length > 120) return null
  const match = SEMVER.exec(value)
  if (!match) return null
  const pre = match[4] ? match[4].split('.') : []
  if (pre.some(part => /^\d+$/.test(part) && part.length > 1 && part[0] === '0')) return null
  return { core: match.slice(1, 4), pre }
}
function compareNumeric(a, b) { return a.length !== b.length ? (a.length > b.length ? 1 : -1) : a === b ? 0 : a > b ? 1 : -1 }
function compareVersions(a, b) {
  const left = parseVersion(a), right = parseVersion(b)
  if (!left || !right) throw new Error('Invalid semantic version')
  for (let i = 0; i < 3; i++) { const result = compareNumeric(left.core[i], right.core[i]); if (result) return result }
  if (!left.pre.length || !right.pre.length) return left.pre.length === right.pre.length ? 0 : left.pre.length ? -1 : 1
  for (let i = 0; i < Math.max(left.pre.length, right.pre.length); i++) {
    const x = left.pre[i], y = right.pre[i]
    if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? -1 : 1
    if (x === y) continue
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y)
    if (xn && yn) return compareNumeric(x, y)
    if (xn !== yn) return xn ? -1 : 1
    return x > y ? 1 : -1
  }
  return 0
}
// Use Electron's network stack, including system proxy and certificate settings.
// No renderer-supplied URL, credentials, redirects, unbounded responses or background checks.
async function fetchReleases(fetchFn, { timeoutMs = 12000 } = {}) {
  if (typeof fetchFn !== 'function') throw new Error('Network service unavailable')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let reader
  try {
    const response = await fetchFn(API_URL, { headers: { 'User-Agent': 'NEXUS-update-check', Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, redirect: 'error', credentials: 'omit', signal: controller.signal })
    if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'GitHub is rate-limiting update checks. Please try again later.' : 'GitHub could not provide release information. Please try again later.')
    if (!response.body) throw new Error('Invalid release information.')
    reader = response.body.getReader()
    let size = 0; const parts = []
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_RESPONSE) { await reader.cancel(); throw new Error('Release response too large') }
      parts.push(Buffer.from(value))
    }
    try { return JSON.parse(Buffer.concat(parts).toString('utf8')) } catch { throw new Error('GitHub returned invalid release information.') }
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Update check timed out.')
    throw error
  } finally { clearTimeout(timer); reader?.releaseLock() }
}
function createUpdateService({ app, shell, platform = process.platform, getReleases } = {}) {
  let available = null, checking = false
  return {
    async check() {
      if (checking) return { status: 'error', message: 'An update check is already running.' }
      available = null
      if (platform !== 'win32' || !app.isPackaged) return { status: 'unsupported', message: 'Update checks are available in the packaged Windows app.' }
      const current = app.getVersion()
      const parsed = parseVersion(current)
      if (!parsed) return { status: 'error', message: 'The installed version cannot be checked. Please use the official NEXUS releases page.' }
      checking = true
      try {
        const releases = await getReleases()
        if (!Array.isArray(releases)) throw new Error('Invalid release information.')
        let newest = null, newerWithoutInstaller = false, hasEligibleRelease = false
        for (const release of releases) {
          if (!release || release.draft !== false || typeof release.prerelease !== 'boolean' || typeof release.tag_name !== 'string' || !release.tag_name.startsWith('v')) continue
          const version = release.tag_name.slice(1), versionInfo = parseVersion(version)
          if (!versionInfo || release.prerelease !== (versionInfo.pre.length > 0) || (!parsed.pre.length && release.prerelease)) continue
          hasEligibleRelease = true
          if (compareVersions(version, current) <= 0) continue
          const expectedAsset = `NEXUS Setup ${version}.exe`
          if (!Array.isArray(release.assets) || !release.assets.some(asset => asset?.name === expectedAsset && asset.state === 'uploaded' && typeof asset.size === 'number' && asset.size > 0)) { newerWithoutInstaller = true; continue }
          if (!newest || compareVersions(version, newest) > 0) newest = version
        }
        if (newest) { available = newest; return { status: 'available', current, version: newest } }
        if (newerWithoutInstaller) return { status: 'no-installer', current, message: 'A newer release exists, but its Windows installer is not available yet.' }
        if (!hasEligibleRelease) return { status: 'no-releases', current, message: 'No compatible NEXUS releases have been published yet.' }
        return { status: 'up-to-date', current }
      } catch (error) {
        return { status: 'error', message: error?.message?.startsWith('GitHub ') || error?.message === 'Update check timed out.' ? error.message : 'Could not check for updates. Check your internet connection and try again.' }
      } finally { checking = false }
    },
    async openRelease() {
      if (platform !== 'win32' || !app.isPackaged || !available) return { error: 'Check for an available update first.' }
      try { await shell.openExternal(`${RELEASE_ROOT}${encodeURIComponent(`v${available}`)}`); return { success: true } }
      catch { return { error: 'Could not open the release page in your browser.' } }
    }
  }
}
module.exports = { createUpdateService, parseVersion, compareVersions, fetchReleases }
