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
      if (this.mainWindow?.isDestroyed?.() === false) {
        this.mainWindow.minimize();
      }
    });

    ipcMain.on('window-close', () => {
      if (this.mainWindow?.isDestroyed?.() === false) {
        this.mainWindow.hide();
      }
    });

    ipcMain.on('window-maximize', () => {
      if (this.mainWindow?.isDestroyed?.() === false) {
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