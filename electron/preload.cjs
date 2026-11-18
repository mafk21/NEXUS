const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('nexusDesktop', Object.freeze({
  platform: process.platform,
  setNotchEnabled: enabled => ipcRenderer.invoke('notch:set-enabled', enabled),
  updateNotch: state => ipcRenderer.send('notch:update', state),
  onNotchAction(callback) { const listener = (_event, action) => callback(action); ipcRenderer.on('notch:action', listener); return () => ipcRenderer.removeListener('notch:action', listener) },
  chooseWallpaper: () => ipcRenderer.invoke('wallpaper:choose'),
  previewWallpaper: reference => ipcRenderer.invoke('wallpaper:preview', reference),
  exportWallpaper: reference => ipcRenderer.invoke('wallpaper:export', reference),
  applyWallpaper: reference => ipcRenderer.invoke('wallpaper:apply', reference),
  chooseShortcut: type => ipcRenderer.invoke('shortcut:choose', type),
  openShortcut: (type, target) => ipcRenderer.invoke('shortcut:open', type, target),
  sendMediaKey: command => ipcRenderer.invoke('media:send', command),
  listRunningApps: () => ipcRenderer.invoke('processes:list'),
  getStartup: () => ipcRenderer.invoke('startup:get'),
  setStartup: enabled => ipcRenderer.invoke('startup:set', enabled)
}))
