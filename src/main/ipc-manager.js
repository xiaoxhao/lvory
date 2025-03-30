const { ipcMain } = require('electron');

class IPCManager {
  constructor() {
    this.mainWindow = null;
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  init() {
    // 窗口控制相关IPC
    this.handleWindowControls();
  }

  handleWindowControls() {
    ipcMain.on('window-minimize', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.minimize();
      }
    });

    ipcMain.on('window-close', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.hide();
      }
    });

    ipcMain.on('window-maximize', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        if (this.mainWindow.isMaximized()) {
          this.mainWindow.unmaximize();
        } else {
          this.mainWindow.maximize();
        }
      }
    });
  }
}

const ipcManager = new IPCManager();
module.exports = ipcManager; 