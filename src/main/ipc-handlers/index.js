/**
 * IPC事件处理模块入口
 * 统一管理Electron的IPC通信处理
 */
const { ipcMain } = require('electron');
const logger = require('../../utils/logger');

// 加载所有处理程序模块
let profileHandlers; 
let singboxHandlers;
let downloadHandlers;
let settingsHandlers;
let updateHandlers;
let nodeHistoryHandlers;

let ipcHandlersRegistered = false;

// 所有需要移除的处理程序列表
const HANDLERS_TO_REMOVE = [
  // 配置相关
  'get-config-path', 'set-config-path', 'open-config-dir',
  // 配置文件相关
  'get-profile-data', 'getProfileFiles', 'deleteProfile', 
  'openFileInEditor', 'openConfigDir', 'getProfileMetadata', 
  'updateProfile', 'updateAllProfiles', 'profiles-changed-listen', 
  'profiles-changed-unlisten',
  // Singbox相关
  'singbox-start-core', 'singbox-stop-core', 'singbox-get-status', 
  'singbox-get-version', 'singbox-check-installed', 'singbox-check-config', 
  'singbox-format-config', 'singbox-download-core', 'singbox-run', 'singbox-stop',
  // 下载相关
  'download-core', 'download-profile',
  // 窗口相关 - 已迁移到新的IPC系统
  'show-window', 'quit-app', 'window-minimize', 'window-maximize', 'window-close',
  // 日志相关
  'get-log-history', 'clear-logs',
  // 设置相关
  'set-auto-launch', 'get-auto-launch', 'save-settings', 'get-settings',
  // 节点历史数据相关
  'get-node-history', 'is-node-history-enabled', 'load-all-node-history',
  'get-node-total-traffic', 'get-all-nodes-total-traffic', 'reset-node-total-traffic',
  // 用户配置相关
  'get-user-config', 'save-user-config',
  // 规则集相关
  'get-rule-sets', 'get-node-groups',
  // 映射引擎相关
  'get-mapping-definition', 'save-mapping-definition', 'apply-config-mapping',
  'get-mapping-definition-path', 'get-default-mapping-definition',
  'get-protocol-template', 'create-protocol-mapping',
  // 网络接口相关
  'get-network-interfaces'
];

/**
 * 加载指定模块
 * @param {String} name 模块名称
 * @returns {Object} 加载的模块
 */
function loadHandlerModule(name) {
  try {
    logger.info(`加载IPC处理程序模块: ${name}`);
    return require(`./${name}-handlers`);
  } catch (error) {
    logger.error(`加载IPC处理程序模块 ${name} 失败:`, error);
    return null;
  }
}

/**
 * 注册所有IPC处理程序
 */
function setupHandlers() {
  if (ipcHandlersRegistered) {
    logger.warn('IPC处理程序已注册，跳过');
    return;
  }
  
  try {
    // 加载所有处理程序模块 (window-handlers已移除，使用新的IPC系统)
    profileHandlers = loadHandlerModule('profile');
    singboxHandlers = loadHandlerModule('singbox');
    downloadHandlers = loadHandlerModule('download');
    settingsHandlers = loadHandlerModule('settings');
    updateHandlers = loadHandlerModule('update');
    nodeHistoryHandlers = loadHandlerModule('node-history');
    
    // 导入工具模块
    const utils = require('./utils');
    
    // 设置所有处理程序
    if (profileHandlers) profileHandlers.setup();
    if (singboxHandlers) singboxHandlers.setup();
    if (downloadHandlers) downloadHandlers.setup();
    if (settingsHandlers) settingsHandlers.setup();
    if (updateHandlers) updateHandlers.setup();
    if (nodeHistoryHandlers) nodeHistoryHandlers.setup();
    
    // 设置网络接口处理程序
    utils.getNetworkInterfaces();
    
    ipcHandlersRegistered = true;
    logger.info('所有IPC处理程序注册成功');
  } catch (error) {
    logger.error('注册IPC处理程序失败:', error);
  }
}

/**
 * 清理所有IPC处理程序
 */
function cleanupHandlers() {
  if (!ipcHandlersRegistered) {
    return;
  }
  
  logger.info('正在清理IPC处理程序...');
  
  // 移除所有注册的处理程序
  HANDLERS_TO_REMOVE.forEach((channel) => {
    try {
      // 对于监听器类型的channel，需要特殊处理
      if (channel.endsWith('-listen') || channel.endsWith('-unlisten')) {
        ipcMain.removeAllListeners(channel);
      } else {
        // 移除invoke类型的处理程序
        ipcMain.removeHandler(channel);
      }
    } catch (error) {
      logger.warn(`移除处理程序 ${channel} 失败:`, error);
    }
  });
  
  ipcHandlersRegistered = false;
  logger.info('IPC处理程序已清理');
}

module.exports = {
  setupHandlers,
  cleanupHandlers
}; 