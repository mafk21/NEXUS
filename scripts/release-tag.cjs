// Derive the tag from the checked-out version; never accept a free-form ref.
const { parseVersion } = require('../electron/update-service.cjs')
function releaseTagFor(pkg, lock) {
  const version = pkg?.version
  if (!parseVersion(version) || version.includes('+')) throw new Error('package.json must have a valid release version without build metadata.')
  if (lock?.version !== version || lock?.packages?.['']?.version !== version) throw new Error('package.json and package-lock.json versions must match.')
  return `v${version}`
}
if (require.main === module) {
  try {
    const tag = releaseTagFor(require('../package.json'), require('../package-lock.json'))
    process.stdout.write(`${tag}\n`)
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
module.exports = { releaseTagFor }
