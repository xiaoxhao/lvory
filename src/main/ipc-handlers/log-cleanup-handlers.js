const { ipcMain } = require('electron');
const logger = require('../../utils/logger');
const logCleanupManager = require('../data-managers/log-cleanup-manager');

function setup() {
  ipcMain.handle('log-cleanup:perform', async () => {
    try {
      return logCleanupManager.performCleanup();
    } catch (error) {
      logger.error('执行日志清理失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('log-cleanup:set-retention-days', async (event, days) => {
    try {
      return logCleanupManager.setRetentionDays(days);
    } catch (error) {
      logger.error('设置日志保留天数失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('log-cleanup:get-retention-days', async () => {
    try {
      return logCleanupManager.getRetentionDays();
    } catch (error) {
      logger.error('获取日志保留天数失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('log-cleanup:get-stats', async () => {
    try {
      return logCleanupManager.getLogFileStats();
    } catch (error) {
      logger.error('获取日志文件统计失败:', error);
      return { success: false, error: error.message };
    }
  });

  logger.info('日志清理 IPC 处理程序已注册');
}

module.exports = {
  setup
};

