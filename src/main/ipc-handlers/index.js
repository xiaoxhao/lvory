/**
 * IPC事件处理模块入口
 * 统一管理Electron的IPC通信处理
 */
const { ipcMain } = require('electron');
const logger = require('../../utils/logger');

// 懒加载处理程序模块
let windowHandlers;
let profileHandlers; 
let singboxHandlers;
let downloadHandlers;
let settingsHandlers;
let updateHandlers;
let nodeHistoryHandlers;

let ipcHandlersRegistered = false;
let lazyHandlersRegistered = false;

// 所有需要移除的处理程序列表
const HANDLERS_TO_REMOVE = [
  // 配置相关
  'get-config-path', 'set-config-path', 'open-config-dir',
  // 配置文件相关
  'get-profile-data', 'getProfileFiles', 'exportProfile', 'renameProfile', 
  'deleteProfile', 'openFileInEditor', 'openConfigDir', 'getProfileMetadata', 
  'updateProfile', 'updateAllProfiles', 'profiles-changed-listen', 
  'profiles-changed-unlisten',
  // Singbox相关
  'singbox-start-core', 'singbox-stop-core', 'singbox-get-status', 
  'singbox-get-version', 'singbox-check-installed', 'singbox-check-config', 
  'singbox-format-config', 'singbox-download-core', 'singbox-run', 'singbox-stop',
  // 下载相关
  'download-core', 'download-profile',
  // 窗口相关
  'show-window', 'quit-app',
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
  'get-protocol-template', 'create-protocol-mapping'
];

// 处理程序类型映射，用于确定哪个模块负责处理特定的channel
const HANDLER_TYPE_MAP = {
  // 窗口相关
  'window': ['window-', 'show-window', 'quit-app'],
  
  // 设置相关
  'settings': ['set-auto-launch', 'get-auto-launch', 'save-settings', 'get-settings'],
  
  // 配置文件相关
  'profile': [
    'get-config-path', 'set-config-path', 'open-config-dir',
    'getProfileFiles', 'get-profile-data', 'updateProfile', 'deleteProfile', 
    'exportProfile', 'renameProfile', 'openFileInEditor', 'getProfileMetadata', 
    'updateAllProfiles', 'profiles-changed',
    'get-user-config', 'save-user-config',
    'get-rule-sets', 'get-node-groups',
    'get-mapping-definition', 'save-mapping-definition', 'apply-config-mapping',
    'get-mapping-definition-path', 'get-default-mapping-definition',
    'get-protocol-template', 'create-protocol-mapping'
  ],
  
  // singbox相关
  'singbox': ['singbox-'],
  
  // 下载相关
  'download': ['download-'],
  
  // 更新相关
  'update': ['update-'],
  
  // 节点历史数据相关
  'nodeHistory': ['node-', 'get-node-', 'is-node-', 'load-all-node-', 'reset-node-']
};

/**
 * 按需加载指定模块
 * @param {String} name 模块名称
 * @returns {Object} 加载的模块
 */
function loadHandlerModule(name) {
  try {
    logger.info(`懒加载IPC处理程序模块: ${name}`);
    return require(`./${name}-handlers`);
  } catch (error) {
    logger.error(`加载IPC处理程序模块 ${name} 失败:`, error);
    return null;
  }
}

/**
 * 确定处理程序类型
 * @param {String} channel IPC通道名称
 * @returns {String|null} 处理程序类型
 */
function determineHandlerType(channel) {
  for (const [type, patterns] of Object.entries(HANDLER_TYPE_MAP)) {
    for (const pattern of patterns) {
      if (pattern.endsWith('-') ? channel.startsWith(pattern) : channel === pattern) {
        return type;
      }
    }
  }
  return null;
}

/**
 * 设置懒加载处理程序代理
 */
function setupLazyLoadHandlers() {
  if (lazyHandlersRegistered) {
    return;
  }
  
  // 预先加载singbox处理程序，确保核心功能正常
  if (!singboxHandlers) {
    singboxHandlers = loadHandlerModule('singbox');
    if (singboxHandlers) singboxHandlers.setup();
    logger.info('已预先加载SingBox处理程序');
  }
  
  // 注册懒加载处理程序
  const handledChannels = ipcMain._channels ? Object.keys(ipcMain._channels) : [];
  
  // 获取所有已注册的处理程序通道
  HANDLERS_TO_REMOVE.forEach(channel => {
    if (!handledChannels.includes(channel)) {
      // 确定该通道应该由哪个模块处理
      const handlerType = determineHandlerType(channel);
      
      if (!handlerType) {
        logger.warn(`无法确定处理程序类型: ${channel}`);
        return;
      }
      
      try {
        // 创建代理处理程序
        ipcMain.handle(channel, async (event, ...args) => {
          try {
            // 加载对应的处理模块
            const handler = await loadHandlerForType(handlerType);
            if (!handler) {
              throw new Error(`找不到处理程序类型: ${handlerType}`);
            }
            
            // 如果加载失败或处理程序仍然不存在，返回错误
            const handledChannels = ipcMain._channels ? Object.keys(ipcMain._channels) : [];
            if (!handledChannels.includes(channel)) {
              logger.error(`即使加载了模块，处理程序依然不存在: ${channel}`);
              return { error: `处理程序不可用: ${channel}` };
            }
            
            // 此时应该已经正确注册了处理程序，通过IPC调用处理
            return { success: true, message: '处理程序已加载' };
          } catch (error) {
            logger.error(`执行处理程序时出错: ${channel}`, error);
            return { error: error.message || '处理程序执行错误' };
          }
        });
        logger.info(`为 ${channel} 设置了懒加载代理`);
      } catch (error) {
        logger.error(`为 ${channel} 注册懒加载代理失败:`, error);
      }
    }
  });
  
  lazyHandlersRegistered = true;
  logger.info('懒加载IPC处理程序代理设置完成');
}

/**
 * 加载特定类型的处理程序并返回处理结果
 * @param {String} type 处理程序类型
 * @returns {Promise<Object>} 加载的模块
 */
async function loadHandlerForType(type) {
  let handler = null;
  
  switch (type) {
    case 'window':
      if (!windowHandlers) {
        windowHandlers = loadHandlerModule('window');
        if (windowHandlers) windowHandlers.setup();
      }
      handler = windowHandlers;
      break;
    case 'settings':
      if (!settingsHandlers) {
        settingsHandlers = loadHandlerModule('settings');
        if (settingsHandlers) settingsHandlers.setup();
      }
      handler = settingsHandlers;
      break;
    case 'profile':
      if (!profileHandlers) {
        profileHandlers = loadHandlerModule('profile');
        if (profileHandlers) profileHandlers.setup();
      }
      handler = profileHandlers;
      break;
    case 'singbox':
      if (!singboxHandlers) {
        singboxHandlers = loadHandlerModule('singbox');
        if (singboxHandlers) singboxHandlers.setup();
      }
      handler = singboxHandlers;
      break;
    case 'download':
      if (!downloadHandlers) {
        downloadHandlers = loadHandlerModule('download');
        if (downloadHandlers) downloadHandlers.setup();
      }
      handler = downloadHandlers;
      break;
    case 'update':
      if (!updateHandlers) {
        updateHandlers = loadHandlerModule('update');
        if (updateHandlers) updateHandlers.setup();
      }
      handler = updateHandlers;
      break;
    case 'nodeHistory':
      if (!nodeHistoryHandlers) {
        nodeHistoryHandlers = loadHandlerModule('node-history');
        if (nodeHistoryHandlers) nodeHistoryHandlers.setup();
      }
      handler = nodeHistoryHandlers;
      break;
  }
  
  return handler;
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
    // 立即加载必要的处理程序
    windowHandlers = loadHandlerModule('window');
    settingsHandlers = loadHandlerModule('settings');
    
    if (windowHandlers) windowHandlers.setup();
    if (settingsHandlers) settingsHandlers.setup();
    
    // 立即加载profile处理程序，因为它包含很多关键功能
    profileHandlers = loadHandlerModule('profile');
    if (profileHandlers) profileHandlers.setup();
    
    // 立即加载singbox处理程序，因为它是核心功能
    singboxHandlers = loadHandlerModule('singbox');
    if (singboxHandlers) singboxHandlers.setup();
    
    // 设置懒加载代理处理其他模块
    setupLazyLoadHandlers();
    
    ipcHandlersRegistered = true;
    logger.info('核心IPC处理程序注册成功，其他处理程序将按需加载');
  } catch (error) {
    logger.error('注册IPC处理程序失败:', error);
  }
}

/**
 * 清理所有IPC处理程序
 */
function cleanupHandlers() {
  if (!ipcHandlersRegistered && !lazyHandlersRegistered) {
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
  lazyHandlersRegistered = false;
  logger.info('IPC处理程序已清理');
}

module.exports = {
  setupHandlers,
  cleanupHandlers
}; 