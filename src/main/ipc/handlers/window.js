/**
 * 窗口相关IPC处理程序
 */
const { ipcMain } = require('electron');
const logger = require('../../../utils/logger');
const utils = require('../utils');
const { WINDOW } = require('../constants');
const singbox = require('../../../utils/sing-box');

/**
 * 处理窗口控制命令
 * @param {Event} event IPC事件
 * @param {Object} params 参数对象
 * @param {String} params.action 动作类型: minimize, maximize, close
 */
function handleWindowControl(event, params) {
  const { action } = params;
  const mainWindow = utils.getMainWindow();
  if (!mainWindow) return;

  logger.info(`窗口控制: ${action}`);
  
  switch (action) {
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
    default:
      logger.warn(`未知的窗口控制命令: ${action}`);
  }
}

/**
 * 处理窗口操作请求
 * @param {Event} event IPC事件
 * @param {Object} params 参数对象
 * @param {String} params.type 操作类型: show, quit
 * @returns {Promise<Object>} 操作结果
 */
async function handleWindowAction(event, params) {
  const { type } = params;
  logger.info(`窗口操作: ${type}`);
  
  try {
    switch (type) {
      case 'show':
        const windowManager = require('../../window');
        windowManager.showWindow();
        return utils.createSuccess();
      
      case 'quit':
        // 退出前清理
        await singbox.disableSystemProxy();
        await singbox.stopCore();
        
        // 标记为真正退出
        global.isQuitting = true;
        require('electron').app.quit();
        return utils.createSuccess();
      
      default:
        logger.warn(`未知的窗口操作类型: ${type}`);
        return {
          success: false,
          error: `未支持的窗口操作: ${type}`
        };
    }
  } catch (error) {
    return utils.handleError(error, `窗口操作(${type})`);
  }
}

/**
 * 设置窗口相关IPC处理程序
 */
function setup() {
  // 注册窗口控制事件 (send模式)
  ipcMain.on(WINDOW.CONTROL, handleWindowControl);
  
  // 注册窗口操作事件 (invoke模式)
  ipcMain.handle(WINDOW.ACTION, handleWindowAction);
  
  logger.info('窗口IPC处理程序已设置');
}

/**
 * 清理窗口相关IPC处理程序
 */
function cleanup() {
  ipcMain.removeListener(WINDOW.CONTROL, handleWindowControl);
  ipcMain.removeHandler(WINDOW.ACTION);
  
  logger.info('窗口IPC处理程序已清理');
}

module.exports = {
  setup,
  cleanup
}; 