/**
 * 窗口相关IPC处理程序
 */
const { ipcMain } = require('electron');
const logger = require('../../utils/logger');
const singbox = require('../../utils/sing-box');
const settingsManager = require('../settings-manager');

/**
 * 获取主窗口
 */
function getMainWindow() {
  const { BrowserWindow } = require('electron');
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

/**
 * 处理窗口控制命令
 */
async function handleWindowControl(event, params) {
  const { action } = params;
  const mainWindow = getMainWindow();
  if (!mainWindow) return;

  switch (action) {
    case 'minimize': {
      mainWindow.hide();
      break;
    }
    case 'maximize': {
      if (mainWindow.isMaximized()) {
        mainWindow.restore();
        const [width, height] = mainWindow.getSize();
        if (width < 800 || height < 600) {
          mainWindow.setSize(Math.max(width, 800), Math.max(height, 600));
        }
      } else {
        mainWindow.maximize();
      }
      break;
    }
    case 'close': {
      const settings = settingsManager.getSettings();
      if (settings.foregroundOnly) {
        try {
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
        mainWindow.hide();
      }
      break;
    }
    default:
      logger.warn(`未知的窗口控制命令: ${action}`);
  }
}

/**
 * 处理窗口操作请求
 */
async function handleWindowAction(event, params) {
  const { type } = params;
  
  try {
    switch (type) {
      case 'show': {
        const windowManager = require('../window');
        windowManager.showWindow();
        return { success: true };
      }
      case 'quit': {
        await singbox.disableSystemProxy();
        await singbox.stopCore();
        global.isQuitting = true;
        require('electron').app.quit();
        return { success: true };
      }
      default:
        logger.warn(`未知的窗口操作类型: ${type}`);
        return {
          success: false,
          error: `未支持的窗口操作: ${type}`
        };
    }
  } catch (error) {
    logger.error(`窗口操作(${type})失败:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 设置窗口相关IPC处理程序
 */
function setup() {
  ipcMain.on('window.control', handleWindowControl);
  ipcMain.handle('window.action', handleWindowAction);
}

module.exports = {
  setup
};
