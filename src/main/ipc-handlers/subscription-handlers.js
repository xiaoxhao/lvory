const { ipcMain } = require('electron');
const subscriptionManager = require('../data-managers/subscription-manager');
const logger = require('../../utils/logger');

function setup() {
  ipcMain.handle('subscription:add', async (event, { fileName, metadata }) => {
    try {
      return subscriptionManager.addSubscription(fileName, metadata);
    } catch (error) {
      logger.error('添加订阅失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('subscription:get', async (event, fileName) => {
    try {
      return subscriptionManager.getSubscription(fileName);
    } catch (error) {
      logger.error('获取订阅失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('subscription:get-all', async () => {
    try {
      return subscriptionManager.getAllSubscriptions();
    } catch (error) {
      logger.error('获取所有订阅失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('subscription:update', async (event, { fileName, updates }) => {
    try {
      return subscriptionManager.updateSubscription(fileName, updates);
    } catch (error) {
      logger.error('更新订阅失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('subscription:delete', async (event, fileName) => {
    try {
      return subscriptionManager.deleteSubscription(fileName);
    } catch (error) {
      logger.error('删除订阅失败:', error);
      return { success: false, error: error.message };
    }
  });

  logger.info('订阅管理IPC处理程序已设置');
}

module.exports = {
  setup
};

