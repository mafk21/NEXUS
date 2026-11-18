const { app, BrowserWindow, shell, ipcMain, dialog, nativeImage, screen } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { runSmokeTest } = require('./smoke.cjs')
const smokeTest = app.isPackaged && process.argv.includes('--nexus-smoke-test')
if (smokeTest) app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-smoke-')))
const { createWallpaperService } = require('./wallpaper-service.cjs')
const { createShortcutService } = require('./shortcut-service.cjs')
const { createStartupService } = require('./startup-service.cjs')
const { createProcessService } = require('./process-service.cjs')
const { createMediaService } = require('./media-service.cjs')
const { validAction, notchBounds } = require('./notch-service.cjs')
let mainWindow, notchWindow
let latestNotchState = null, notchExpanded = false
const wallpaper = createWallpaperService({ app, dialog, nativeImage, getWindow: () => mainWindow })
const shortcuts = createShortcutService({ app, shell, dialog, getWindow: () => mainWindow })
const startup = createStartupService({ app })
const processes = createProcessService()
const media = createMediaService()
function requireSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error('Unauthorized request.')
}
function requireNotch(event) {
  if (!notchWindow || event.sender !== notchWindow.webContents || event.senderFrame !== notchWindow.webContents.mainFrame) throw new Error('Unauthorized request.')
}
function updateNotchBounds() {
  if (!notchWindow || notchWindow.isDestroyed()) return
  const workArea = screen.getPrimaryDisplay().workArea
  notchWindow.setBounds(notchBounds(workArea, notchExpanded))
}
function createNotch() {
  if (notchWindow && !notchWindow.isDestroyed()) { notchWindow.show(); return notchWindow }
  notchExpanded = false
  notchWindow = new BrowserWindow({
    ...notchBounds(screen.getPrimaryDisplay().workArea, false), frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, show: false, hasShadow: false, title: 'NEXUS notch',
    webPreferences: { preload: path.join(__dirname, 'notch-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  notchWindow.setVisibleOnAllWorkspaces(true)
  notchWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  notchWindow.webContents.on('will-navigate', event => event.preventDefault())
  notchWindow.once('ready-to-show', () => { if (notchWindow && !notchWindow.isDestroyed()) notchWindow.showInactive() })
  notchWindow.on('closed', () => { notchWindow = null })
  if (process.env.NEXUS_DEV_URL && !app.isPackaged) notchWindow.loadURL(`${process.env.NEXUS_DEV_URL}#notch`)
  else notchWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'notch' })
  return notchWindow
}
ipcMain.handle('notch:set-enabled', (event, enabled) => {
  requireSender(event)
  if (typeof enabled !== 'boolean' || process.platform !== 'win32' || smokeTest) return { error: 'The floating notch is available on Windows.' }
  if (enabled) createNotch()
  else if (notchWindow && !notchWindow.isDestroyed()) notchWindow.close()
  return { success: true }
})
ipcMain.on('notch:update', (event, state) => {
  requireSender(event)
  latestNotchState = state
  if (notchWindow && !notchWindow.isDestroyed()) notchWindow.webContents.send('notch:state', state)
})
ipcMain.on('notch:ready', event => { requireNotch(event); if (latestNotchState) event.sender.send('notch:state', latestNotchState) })
ipcMain.on('notch:action', (event, action) => {
  requireNotch(event)
  if (validAction(action) && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('notch:action', action)
})
ipcMain.on('notch:expand', (event, expanded) => { requireNotch(event); if (typeof expanded === 'boolean') { notchExpanded = expanded; updateNotchBounds() } })
ipcMain.on('notch:open-app', event => { requireNotch(event); if (mainWindow && !mainWindow.isDestroyed()) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus() } })
ipcMain.on('notch:quit', event => { requireNotch(event); app.quit() })
ipcMain.handle('wallpaper:choose', event => { requireSender(event); return wallpaper.choose() })
ipcMain.handle('wallpaper:preview', (event, reference) => { requireSender(event); return wallpaper.preview(reference) })
ipcMain.handle('wallpaper:export', (event, reference) => { requireSender(event); return wallpaper.exportImage(reference) })
ipcMain.handle('wallpaper:apply', (event, reference) => { requireSender(event); return wallpaper.apply(reference) })
ipcMain.handle('shortcut:choose', (event, type) => { requireSender(event); return shortcuts.choose(type) })
ipcMain.handle('shortcut:open', (event, type, target) => { requireSender(event); return shortcuts.open(type, target) })
ipcMain.handle('media:send', (event, command) => { requireSender(event); return media.send(command) })
ipcMain.handle('processes:list', event => { requireSender(event); return processes.list() })
ipcMain.handle('startup:get', event => { requireSender(event); return startup.get() })
ipcMain.handle('startup:set', (event, enabled) => { requireSender(event); return startup.set(enabled) })
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 940, minWidth: 860, minHeight: 620,
    backgroundColor: '#0b0c11', title: 'NEXUS', autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
  })
  mainWindow.on('closed', () => { if (notchWindow && !notchWindow.isDestroyed()) notchWindow.close() })
  if (smokeTest) mainWindow.webContents.once('did-finish-load', () => runSmokeTest(mainWindow, app, async () => {
    if (process.platform !== 'win32') return
    const notch = createNotch()
    await new Promise((resolve, reject) => { notch.webContents.once('did-finish-load', resolve); notch.webContents.once('did-fail-load', () => reject(new Error('Notch failed to load'))) })
    await notch.webContents.executeJavaScript(`new Promise((resolve, reject) => { let tries = 0; const check = () => { if (document.querySelector('.notch-bar') && document.querySelector('.notch-current')?.textContent !== 'Your space, close by') return resolve(); if (++tries > 100) return reject(new Error('Notch failed to receive workspace')); setTimeout(check, 100); }; check(); })`)
    await notch.webContents.executeJavaScript(`document.querySelector('.notch-bar').click()` )
    await notch.webContents.executeJavaScript(`new Promise((resolve, reject) => { let tries = 0; const check = () => { if (document.querySelector('.notch-selects select') && document.querySelector('.notch-footer')) return resolve(); if (++tries > 100) return reject(new Error('Notch failed to expand')); setTimeout(check, 100); }; check(); })`)
    notch.close()
  }))
  else mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault()
  })
  if (process.env.NEXUS_DEV_URL && !app.isPackaged) mainWindow.loadURL(process.env.NEXUS_DEV_URL)
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
}
app.whenReady().then(() => { createWindow(); screen.on('display-metrics-changed', updateNotchBounds); screen.on('display-added', updateNotchBounds); screen.on('display-removed', updateNotchBounds); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() }) })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
