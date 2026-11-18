const { app, BrowserWindow, shell, ipcMain, dialog, nativeImage } = require('electron')
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
let mainWindow
const wallpaper = createWallpaperService({ app, dialog, nativeImage, getWindow: () => mainWindow })
const shortcuts = createShortcutService({ app, shell, dialog, getWindow: () => mainWindow })
const startup = createStartupService({ app })
const processes = createProcessService()
const media = createMediaService()
function requireSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error('Unauthorized request.')
}
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
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  if (smokeTest) mainWindow.webContents.once('did-finish-load', () => runSmokeTest(mainWindow, app))
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
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() }) })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
