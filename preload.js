const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electron', {
  minimizeWindow: () => ipcRenderer.send('window-control', 'minimize'),
  maximizeWindow: () => ipcRenderer.send('window-control', 'maximize'),
  closeWindow: () => ipcRenderer.send('window-control', 'close'),
  
  downloadProfile: (data) => ipcRenderer.invoke('download-profile', data),
  
  downloadCore: () => ipcRenderer.invoke('download-core'),
  
  onCoreDownloadProgress: (callback) => {
    ipcRenderer.on('core-download-progress', (event, progress) => callback(progress));
    return () => ipcRenderer.removeListener('core-download-progress', callback);
  },
  
  singbox: {
    checkInstalled: () => ipcRenderer.invoke('singbox-check-installed'),
    
    getVersion: () => ipcRenderer.invoke('singbox-get-version'),
    
    checkConfig: (configPath) => ipcRenderer.invoke('singbox-check-config', { configPath }),
    
    formatConfig: (configPath) => ipcRenderer.invoke('singbox-format-config', { configPath }),
    
    startCore: (options) => ipcRenderer.invoke('singbox-start-core', options),
    
    stopCore: () => ipcRenderer.invoke('singbox-stop-core'),
    
    getStatus: () => ipcRenderer.invoke('singbox-get-status'),
    
    run: (configPath) => ipcRenderer.invoke('singbox-run', { configPath }),
    
    stop: () => ipcRenderer.invoke('singbox-stop'),
    
    downloadCore: () => ipcRenderer.invoke('singbox-download-core'),
    
    onOutput: (callback) => {
      ipcRenderer.on('singbox-output', (event, data) => callback(data));
      return () => ipcRenderer.removeListener('singbox-output', callback);
    },
    
    onExit: (callback) => {
      ipcRenderer.on('singbox-exit', (event, data) => callback(data));
      return () => ipcRenderer.removeListener('singbox-exit', callback);
    }
  },

  getSingBoxVersion: () => ipcRenderer.invoke('singbox-get-version'),

  onCoreVersionUpdate: (callback) => {
    ipcRenderer.on('core-version-update', (event, data) => callback(data));
    return () => ipcRenderer.removeListener('core-version-update', callback);
  },
  
  onDownloadComplete: (callback) => ipcRenderer.on('download-complete', callback),
  removeDownloadComplete: (callback) => ipcRenderer.removeListener('download-complete', callback),
  
  getProfileData: () => ipcRenderer.invoke('get-profile-data'),
  
  onProfileData: (callback) => ipcRenderer.on('profile-data', callback),
  removeProfileData: (callback) => ipcRenderer.removeListener('profile-data', callback),
  
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),
  
  platform: process.platform,

  // 日志系统接口
  logs: {
    // 接收新的日志消息
    onLogMessage: (callback) => {
      ipcRenderer.on('log-message', (event, log) => callback(log));
      return () => ipcRenderer.removeListener('log-message', callback);
    },
    
    // 获取之前的日志历史
    getLogHistory: () => ipcRenderer.invoke('get-log-history'),
    
    // 清除日志历史
    clearLogs: () => ipcRenderer.invoke('clear-logs')
  }
}); 