/**
 * 窗口相关IPC处理程序
 */
const { ipcMain } = require('electron');
const logger = require('../../utils/logger');
const utils = require('./utils');
const singbox = require('../../utils/sing-box');

/**
 * 设置窗口相关IPC处理程序
 */
function setup() {
  // 窗口控制
  ipcMain.on('window-control', (event, command) => {
    const mainWindow = utils.getMainWindow();
    if (!mainWindow) return;
    
    switch (command) {
      case 'minimize':
        // 改为隐藏窗口而不是最小化
        mainWindow.hide();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.restore();
          // 确保恢复后的窗口不小于最小尺寸
          const [width, height] = mainWindow.getSize();
          if (width < 800 || height < 600) {
            mainWindow.setSize(Math.max(width, 800), Math.max(height, 600));
          }
        } else {
          mainWindow.maximize();
        }
        break;
      case 'close':
        // 只是隐藏窗口，不真正关闭
        mainWindow.hide();
        break;
    }
  });
  
  // 从托盘显示窗口
  ipcMain.handle('show-window', () => {
    const windowManager = require('../window');
    windowManager.showWindow();
    return { success: true };
  });
  
  // 真正退出应用
  ipcMain.handle('quit-app', async () => {
    try {
      // 退出前清理
      await singbox.disableSystemProxy();
      await singbox.stopCore();
      
      // 标记为真正退出
      global.isQuitting = true;
      require('electron').app.quit();
      return { success: true };
    } catch (error) {
      logger.error('退出应用失败:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  setup
}; 