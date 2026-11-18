// Packaged-app smoke test used on CI runners. No wallpaper or shortcuts are launched.
async function runSmokeTest(window, app, testNotch = async () => {}) {
  const timeout = setTimeout(() => app.exit(1), 30000)
  try {
    const check = expression => window.webContents.executeJavaScript(`new Promise((resolve, reject) => { let tries = 0; const check = () => { try { if (${expression}) return resolve(true); } catch {} if (++tries > 100) return reject(new Error('Smoke check failed')); setTimeout(check, 100); }; check(); })`)
    await check(`document.querySelectorAll('.category-card').length === 5 && !!window.nexusDesktop && window.nexusDesktop.platform === ${JSON.stringify(process.platform)}`)
    await window.webContents.executeJavaScript("localStorage.setItem('nexus.active-category.v1', 'gaming')")
    const loaded = new Promise(resolve => window.webContents.once('did-finish-load', resolve))
    window.webContents.reload()
    await loaded
    await check("!!document.querySelector('[aria-label=\"Gaming Default setup\"]')")
    await testNotch()
    if (process.platform === 'win32') {
      // Exercise the packaged IPC path. A transient offline/rate-limited result is valid and visible to the user.
      const updateStatus = await window.webContents.executeJavaScript("window.nexusDesktop.checkUpdates().then(r => r.status)")
      if (!['available', 'up-to-date', 'no-releases', 'no-installer', 'error'].includes(updateStatus)) throw new Error(`Update check IPC returned ${updateStatus}`)
      console.log(`NEXUS update check smoke status: ${updateStatus}`)
    }
    clearTimeout(timeout); app.exit(0)
  } catch (error) {
    console.error('NEXUS smoke test failed:', error)
    clearTimeout(timeout); app.exit(1)
  }
}
module.exports = { runSmokeTest }
