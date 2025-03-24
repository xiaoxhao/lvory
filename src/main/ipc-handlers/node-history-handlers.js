/**
 * 节点历史数据相关IPC处理程序
 */
const { ipcMain } = require('electron');
const logger = require('../../utils/logger');
const nodeHistoryManager = require('../data-managers/node-history-manager');

/**
 * 设置节点历史数据相关IPC处理程序
 */
function setup() {
  // 获取指定节点的历史数据
  ipcMain.handle('get-node-history', async (event, nodeTag) => {
    return nodeHistoryManager.getNodeHistory(nodeTag);
  });

  // 检查节点历史数据功能是否启用
  ipcMain.handle('is-node-history-enabled', () => {
    return { success: true, enabled: nodeHistoryManager.isHistoryEnabled() };
  });

  // 加载所有节点历史数据
  ipcMain.handle('load-all-node-history', () => {
    return nodeHistoryManager.loadAllHistoryData();
  });
  
  // 获取指定节点的累计流量数据
  ipcMain.handle('get-node-total-traffic', async (event, nodeTag) => {
    return nodeHistoryManager.getTotalTraffic(nodeTag);
  });
  
  // 获取所有节点的累计流量数据
  ipcMain.handle('get-all-nodes-total-traffic', () => {
    return nodeHistoryManager.getAllTotalTraffic();
  });
  
  // 重置节点累计流量数据
  ipcMain.handle('reset-node-total-traffic', async (event, nodeTag) => {
    return nodeHistoryManager.resetTotalTraffic(nodeTag);
  });
}

module.exports = {
  setup
}; 