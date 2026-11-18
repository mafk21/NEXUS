function createStartupService({ app, platform = process.platform }) {
  function available() { return platform === 'win32' && app.isPackaged }
  return {
    get() {
      if (!available()) return { available: false, reason: platform === 'linux' ? 'Automatic startup is not available on Linux or Chromebook.' : 'Available in the installed Windows app.' }
      try { return { available: true, enabled: !!app.getLoginItemSettings().openAtLogin } }
      catch { return { available: false, reason: 'Could not read the Windows startup setting.' } }
    },
    set(enabled) {
      if (!available()) return { error: 'Available in the installed Windows app.' }
      if (typeof enabled !== 'boolean') return { error: 'Invalid startup setting.' }
      try {
        app.setLoginItemSettings({ openAtLogin: enabled, name: 'NEXUS.Desktop' })
        const actual = !!app.getLoginItemSettings().openAtLogin
        if (actual !== enabled) return { error: 'Windows did not update the startup setting.', enabled: actual }
        return { success: true, enabled: actual }
      } catch { return { error: 'Could not update the Windows startup setting.' } }
    }
  }
}
module.exports = { createStartupService }
