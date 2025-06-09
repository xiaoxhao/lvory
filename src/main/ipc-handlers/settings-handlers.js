/**
 * 设置相关IPC处理程序
 */
const { ipcMain } = require('electron');
const logger = require('../../utils/logger');
const connectionLogger = require('../../utils/connection-logger');
const settingsManager = require('../settings-manager');

/**
 * 设置设置相关IPC处理程序
 */
function setup() {
  // 日志系统IPC处理程序
  ipcMain.handle('get-log-history', () => {
    return logger.getHistory();
  });

  ipcMain.handle('clear-logs', () => {
    return logger.clearHistory();
  });

  // 连接日志系统IPC处理程序
  ipcMain.handle('get-connection-log-history', () => {
    return connectionLogger.getConnectionLogHistory();
  });

  ipcMain.handle('clear-connection-logs', () => {
    return connectionLogger.clearConnectionHistory();
  });

  // 连接监听控制IPC处理程序
  ipcMain.handle('start-connection-monitoring', () => {
    return connectionLogger.startMonitoring();
  });

  ipcMain.handle('stop-connection-monitoring', () => {
    connectionLogger.stopMonitoring();
    return true;
  });
  
  // 设置开机自启动
  ipcMain.handle('set-auto-launch', async (event, enable) => {
    return settingsManager.setAutoLaunch(enable);
  });

  // 获取开机自启动状态
  ipcMain.handle('get-auto-launch', async () => {
    return settingsManager.getAutoLaunch();
  });
  
  // 保存设置
  ipcMain.handle('save-settings', async (event, settings) => {
    return settingsManager.saveSettings(settings);
  });

  // 加载设置
  ipcMain.handle('get-settings', async () => {
    const settings = await settingsManager.loadSettings();
    return { success: true, settings };
  });
}

module.exports = {
  setup
}; 