const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('nexusNotch', Object.freeze({
  onState(callback) { const listener = (_event, state) => callback(state); ipcRenderer.on('notch:state', listener); ipcRenderer.send('notch:ready'); return () => ipcRenderer.removeListener('notch:state', listener) },
  action: action => ipcRenderer.send('notch:action', action),
  setExpanded: expanded => ipcRenderer.send('notch:expand', expanded),
  openApp: () => ipcRenderer.send('notch:open-app'),
  quit: () => ipcRenderer.send('notch:quit')
}))
