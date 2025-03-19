/**
 * IPC事件处理模块入口
 * 统一管理Electron的IPC通信处理
 */
const { ipcMain } = require('electron');
const logger = require('../../utils/logger');

// 导入各个处理模块
const windowHandlers = require('./window-handlers');
const profileHandlers = require('./profile-handlers');
const singboxHandlers = require('./singbox-handlers');
const downloadHandlers = require('./download-handlers');
const settingsHandlers = require('./settings-handlers');
const updateHandlers = require('./update-handlers');

let ipcHandlersRegistered = false;

/**
 * 移除已存在的IPC处理程序
 */
const removeExistingHandlers = () => {
  try {
    // 需要移除的处理程序列表
    const handlersToRemove = [
      'get-config-path',
      'set-config-path',
      'open-config-dir',
      'get-profile-data',
      'singbox-start-core',
      'singbox-stop-core',
      'singbox-get-status',
      'singbox-get-version',
      'singbox-check-installed',
      'singbox-check-config',
      'singbox-format-config',
      'singbox-download-core',
      'download-core',
      'show-window',
      'quit-app',
      'get-log-history',
      'clear-logs',
      'download-profile',
      'singbox-run',
      'singbox-stop',
      'getProfileFiles',
      'exportProfile',
      'renameProfile',
      'deleteProfile',
      'openFileInEditor',
      'openConfigDir',
      'profiles-changed-listen',
      'profiles-changed-unlisten',
      'set-auto-launch',
      'get-auto-launch',
      'save-settings',
      'get-settings',
      'getProfileMetadata',
      'updateProfile',
      'updateAllProfiles'
    ];
    
    // 尝试移除每个处理程序
    for (const handler of handlersToRemove) {
      try {
        ipcMain.removeHandler(handler);
      } catch (error) {
        // 忽略错误，因为处理程序可能不存在
      }
    }
    
    logger.info('已清理旧的IPC处理程序');
  } catch (error) {
    logger.error('清理IPC处理程序失败:', error);
  }
};

const setupIpcHandlers = () => {
  // 防止重复注册
  if (ipcHandlersRegistered) {
    logger.info('IPC处理程序已注册，跳过');
    return;
  }
  
  logger.info('设置IPC处理程序');
  
  // 移除已存在的处理程序
  removeExistingHandlers();
  
  // 注册各模块的处理程序
  windowHandlers.setup();
  profileHandlers.setup();
  singboxHandlers.setup();
  downloadHandlers.setup();
  settingsHandlers.setup();
  updateHandlers.setup();
  
  // 标记IPC处理程序已注册
  ipcHandlersRegistered = true;
  logger.info('IPC处理程序注册完成');
};

module.exports = {
  setupIpcHandlers
}; 