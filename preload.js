const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    launchMinecraft: () => ipcRenderer.invoke('launch-minecraft'),
    onMinecraftLog: (callback) => ipcRenderer.on('minecraft-log', callback),
    onMinecraftProgress: (callback) => ipcRenderer.on('minecraft-progress', callback)
});
