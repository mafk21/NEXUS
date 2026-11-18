const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('nexusDesktop', Object.freeze({
  platform: process.platform,
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
