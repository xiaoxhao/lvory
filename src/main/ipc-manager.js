const { ipcMain } = require('electron');
const settingsManager = require('./settings-manager');
const singbox = require('../utils/sing-box');
const logger = require('../utils/logger');

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

    ipcMain.on('window-close', async () => {
      if (this.mainWindow?.isDestroyed?.() === false) {
        // 检查仅前台运行设置
        const settings = settingsManager.getSettings();
        if (settings.foregroundOnly) {
          try {
            logger.info('仅前台运行模式，从IPC管理器退出程序');
            await singbox.disableSystemProxy();
            await singbox.stopCore();
            global.isQuitting = true;
            require('electron').app.quit();
          } catch (error) {
            logger.error('退出前清理失败:', error);
            global.isQuitting = true;
            require('electron').app.quit();
          }
        } else {
          this.mainWindow.hide();
        }
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