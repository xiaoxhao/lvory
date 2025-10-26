const { ipcMain } = require('electron');
const trafficStatsManager = require('../data-managers/traffic-stats-manager');
const logger = require('../../utils/logger');

function setup() {
  ipcMain.handle('traffic-stats:set-period', async (event, period) => {
    try {
      return trafficStatsManager.setStatsPeriod(period);
    } catch (error) {
      logger.error('设置流量统计周期失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('traffic-stats:get-period', async () => {
    try {
      return trafficStatsManager.getStatsPeriod();
    } catch (error) {
      logger.error('获取流量统计周期失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('traffic-stats:update', async (event, { upload, download }) => {
    try {
      return trafficStatsManager.updateTraffic(upload, download);
    } catch (error) {
      logger.error('更新流量统计失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('traffic-stats:get-current', async () => {
    try {
      return trafficStatsManager.getCurrentPeriodStats();
    } catch (error) {
      logger.error('获取当前周期流量统计失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('traffic-stats:get-history', async (event, limit) => {
    try {
      return trafficStatsManager.getHistoryStats(limit);
    } catch (error) {
      logger.error('获取历史流量统计失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('traffic-stats:reset-current', async () => {
    try {
      return trafficStatsManager.resetCurrentPeriod();
    } catch (error) {
      logger.error('重置当前周期流量统计失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('traffic-stats:cleanup', async (event, retentionDays) => {
    try {
      return trafficStatsManager.cleanupOldData(retentionDays);
    } catch (error) {
      logger.error('清理过期流量统计数据失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('traffic-stats:set-retention-days', async (event, days) => {
    try {
      return trafficStatsManager.setRetentionDays(days);
    } catch (error) {
      logger.error('设置数据保留天数失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('traffic-stats:get-retention-days', async () => {
    try {
      return trafficStatsManager.getRetentionDays();
    } catch (error) {
      logger.error('获取数据保留天数失败:', error);
      return { success: false, error: error.message };
    }
  });

  logger.info('流量统计 IPC 处理程序已注册');
}

module.exports = {
  setup
};

