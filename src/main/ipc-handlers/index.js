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
let tracerouteHandlers;
let coreManagerHandlers;
let coreHandlers;
let windowHandlers;

let ipcHandlersRegistered = false;

// 所有需要移除的处理程序列表 - 仅包含真正过时的处理器
const HANDLERS_TO_REMOVE = [
  // 过时的配置相关处理器
  'open-config-dir',
  // 过时的配置文件相关处理器 - 注意：以下处理器仍在使用中，不应移除
  // 'deleteProfile', 'openFileInEditor', 'openConfigDir', 'getProfileMetadata',
  // 'updateProfile', 'updateAllProfiles', 'loadLocalProfile' - 这些仍在前端使用
  // 'profiles-changed-listen', 'profiles-changed-unlisten', - 这些仍在使用中
  // 过时的Singbox相关处理器
  'singbox-start-core', 'singbox-stop-core', 'singbox-get-status',
  'singbox-get-version', 'singbox-check-installed', 'singbox-check-config',
  'singbox-format-config', 'singbox-download-core', 'singbox-run', 'singbox-stop',
  // 过时的下载相关处理器
  'download-core', 'download-profile',
  // 过时的窗口相关处理器
  'show-window', 'quit-app', 'window-minimize', 'window-maximize', 'window-close',
  // 过时的日志相关处理器 - 注意：以下处理器仍在使用中，已移除
  // 'get-log-history', 'clear-logs', 'get-connection-log-history', 'clear-connection-logs',
  // 'start-connection-monitoring', 'stop-connection-monitoring',
  'get-singbox-log-files', 'read-singbox-log-file', 'get-current-singbox-log',
  // 过时的设置相关处理器 - 注意：以下处理器仍在使用中，已移除
  // 'set-auto-launch', 'get-auto-launch', 'save-settings', 'get-settings',
  // 过时的节点历史数据相关处理器
  'get-node-history', 'is-node-history-enabled', 'load-all-node-history',
  'get-node-total-traffic', 'get-all-nodes-total-traffic', 'reset-node-total-traffic',
  // 过时的用户配置相关处理器
  'get-user-config', 'save-user-config',
  // 过时的映射引擎相关处理器
  'get-mapping-definition', 'save-mapping-definition', 'apply-config-mapping',
  'get-mapping-definition-path', 'get-default-mapping-definition',
  'get-protocol-template', 'create-protocol-mapping',
  // 过时的网络接口相关处理器 - 注意：以下处理器仍在使用中，已移除
  // 'get-network-interfaces',
  // 过时的应用版本相关处理器 - 注意：以下处理器仍在使用中，已移除
  // 'get-app-version',
  // 'get-build-date',
  // 'get-is-portable',
  // 'get-run-mode-info',
  // 过时的版本更新相关处理器
  'check-for-updates',
  'get-all-versions',
  // 过时的外部链接相关处理器
  'open-external',
  // 过时的Traceroute相关处理器
  'traceroute:execute',
  'traceroute:validate'
];

// 注意：以下处理器仍在使用中，不应被移除：
// - 'get-config-path', 'set-config-path' (配置路径管理)
// - 'get-profile-data' (获取配置文件数据)
// - 'getProfileFiles' (获取配置文件列表)
// - 'get-current-config' (获取当前配置)
// - 'get-node-groups' (获取节点组信息)
// - 'get-rule-sets', 'get-route-rules' (规则集相关)
// - 'deleteProfile', 'openFileInEditor', 'openConfigDir', 'getProfileMetadata' (配置文件操作)
// - 'updateProfile', 'updateAllProfiles' (配置文件更新)
// - 'loadLocalProfile' (本地文件加载)

/**
 * 加载指定模块
 * @param {String} name 模块名称
 * @returns {Object} 加载的模块
 */
function loadHandlerModule(name) {
  try {
    // 减少冗余日志输出，只在出错时记录
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

  // 首先设置 IPC 处理器验证器以启用跟踪
  const ipcValidator = require('../../utils/ipc-validator');
  ipcValidator.setupValidator();

  // 确保清理任何可能存在的旧处理器，避免重复注册
  const { ipcMain } = require('electron');
  const criticalHandlers = ['get-profile-data', 'getProfileFiles', 'get-current-config', 'get-node-groups'];
  criticalHandlers.forEach(handler => {
    try {
      ipcMain.removeHandler(handler);
    } catch (error) {
      // 忽略移除不存在处理器的错误
    }
  });
  
  try {
    // 加载所有处理程序模块
    profileHandlers = loadHandlerModule('profile');
    singboxHandlers = loadHandlerModule('singbox');
    downloadHandlers = loadHandlerModule('download');
    settingsHandlers = loadHandlerModule('settings');
    updateHandlers = loadHandlerModule('update');
    nodeHistoryHandlers = loadHandlerModule('node-history');
    tracerouteHandlers = loadHandlerModule('traceroute');
    coreManagerHandlers = loadHandlerModule('core-manager');
    coreHandlers = loadHandlerModule('core');
    windowHandlers = loadHandlerModule('window');

    // 导入工具模块
    const utils = require('./utils');
    
    // 设置处理器，只在失败时记录详细信息
    if (profileHandlers) {
      try {
        profileHandlers.setup();
      } catch (error) {
        logger.error('Profile handlers 设置失败:', error);
      }
    } else {
      logger.error('Profile handlers 加载失败');
    }

    if (singboxHandlers) {
      singboxHandlers.setup();
    } else {
      logger.error('SingBox handlers 加载失败');
    }

    if (downloadHandlers) {
      downloadHandlers.setup();
    } else {
      logger.error('Download handlers 加载失败');
    }

    if (settingsHandlers) {
      settingsHandlers.setup();
    } else {
      logger.error('Settings handlers 加载失败');
    }

    if (updateHandlers) {
      updateHandlers.setup();
    } else {
      logger.error('Update handlers 加载失败');
    }

    if (nodeHistoryHandlers) {
      nodeHistoryHandlers.setup();
    } else {
      logger.error('Node history handlers 加载失败');
    }

    if (tracerouteHandlers) {
      tracerouteHandlers.registerTracerouteHandlers();
    } else {
      logger.error('Traceroute handlers 加载失败');
    }

    if (coreManagerHandlers) {
      coreManagerHandlers.setup();
    } else {
      logger.error('Core manager handlers 加载失败');
    }

    if (coreHandlers) {
      coreHandlers.setup();
    } else {
      logger.error('Core handlers 加载失败');
    }

    if (windowHandlers) {
      windowHandlers.setup();
    } else {
      logger.error('Window handlers 加载失败');
    }
    
    // 设置网络接口处理程序
    utils.getNetworkInterfaces();
    utils.getAppVersion();
    utils.getBuildDate();
    
    // 设置便携模式检测处理程序
    utils.getIsPortable();

    // 设置运行模式信息处理程序
    utils.getAppRunModeInfo();

    // 设置版本更新检查处理程序
    utils.checkForUpdates();
    utils.getAllVersions();
    utils.openExternal();




    ipcHandlersRegistered = true;
    logger.debug('所有IPC处理程序注册完成');

    // 立即验证关键 IPC 处理器并标记为就绪
    const criticalResult = ipcValidator.markIpcReady();
    if (!criticalResult.success) {
      logger.error('关键 IPC 处理器验证失败:', criticalResult.missing.join(','));
    }

    // 延迟验证所有处理器（用于完整性检查）
    setTimeout(() => {
      const validationResult = ipcValidator.validateAllHandlers();
      if (!validationResult.success) {
        logger.error('完整 IPC 处理器验证失败，某些处理器未正确注册:', validationResult.missing.join(','));
      }
    }, 1000);
  } catch (error) {
    logger.error('注册IPC处理程序失败:', error);
  }
}

/**
 * 清理所有IPC处理程序
 * 注意：此函数只应在应用程序真正退出时调用
 */
function cleanupHandlers() {
  if (!ipcHandlersRegistered) {
    return;
  }

  // 检查是否真的在退出过程中
  if (!global.isQuitting) {
    logger.warn('应用程序未在退出过程中，跳过IPC处理程序清理');
    return;
  }

  // 只清理真正过时的处理器，保留仍在使用的处理器
  HANDLERS_TO_REMOVE.forEach((channel) => {
    try {
      if (channel.endsWith('-listen') || channel.endsWith('-unlisten')) {
        ipcMain.removeAllListeners(channel);
      } else {
        ipcMain.removeHandler(channel);
      }
    } catch (error) {
      logger.warn(`移除处理程序 ${channel} 失败:`, error);
    }
  });

  ipcHandlersRegistered = false;
}

module.exports = {
  setupHandlers,
  cleanupHandlers
}; 