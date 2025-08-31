/**
 * IPC 处理器验证工具
 * 用于验证所有必要的 IPC 处理器是否正确注册，并提供同步机制
 */
const { ipcMain } = require('electron');
const logger = require('./logger');


// 跟踪通过 ipcMain.handle 注册的处理器，避免依赖内部私有字段
const registeredInvokeHandlers = new Set();
let _ipcPatched = false;
function patchIpcMain() {
  if (_ipcPatched) return;
  try {
    const origHandle = ipcMain.handle.bind(ipcMain);
    const origRemoveHandler = ipcMain.removeHandler.bind(ipcMain);
    ipcMain.handle = (channel, listener) => {
      try {
        registeredInvokeHandlers.add(channel);
        logger.debug(`IPC处理器已注册: ${channel}`);
      } catch (_) {}
      return origHandle(channel, listener);
    };
    ipcMain.removeHandler = (channel) => {
      try {
        registeredInvokeHandlers.delete(channel);
        logger.debug(`IPC处理器已移除: ${channel}`);
      } catch (_) {}
      return origRemoveHandler(channel);
    };
    _ipcPatched = true;
    logger.debug('IPC主进程补丁已应用');
  } catch (error) {
    logger.error('IPC主进程补丁应用失败:', error);
  }
}

/**
 * 需要验证的 IPC 处理器列表
 */
const REQUIRED_HANDLERS = [
  // 配置路径管理
  'get-config-path',
  'set-config-path',

  // 配置文件数据
  'get-profile-data',
  'getProfileFiles',
  'get-current-config',

  // 节点和规则信息
  'get-node-groups',
  'get-rule-sets',
  'get-route-rules',

  // 配置文件操作
  'deleteProfile',
  'openFileInEditor',
  'openConfigDir',
  'getProfileMetadata',

  // 配置文件更新
  'updateProfile',
  'updateAllProfiles',

  // 本地文件加载
  'loadLocalProfile',

  // 配置目录
  'get-config-dir'
];

/**
 * 关键 IPC 处理器列表（必须在应用启动时就绪）
 */
const CRITICAL_HANDLERS = [
  'get-profile-data',
  'getProfileFiles',
  'get-current-config',
  'get-node-groups',
  'get-config-path',
  'get-config-dir'
];

// IPC 就绪状态管理
let ipcReadyState = {
  isReady: false,
  readyPromise: null,
  readyResolve: null,
  registeredHandlers: new Set(),
  failedHandlers: new Set()
};

/**
 * 验证 IPC 处理器是否已注册
 * @param {string} handlerName 处理器名称
 * @returns {boolean} 是否已注册
 */
function isHandlerRegistered(handlerName) {
  try {
    // 优先检查我们跟踪的 handle 注册
    if (registeredInvokeHandlers.has(handlerName)) {
      return true;
    }

    // 对于 on() 注册的处理器，检查监听器数量
    const listeners = ipcMain.listenerCount(handlerName);
    return listeners > 0;
  } catch (error) {
    logger.error(`检查处理器 ${handlerName} 时出错:`, error);
    return false;
  }
}

/**
 * 初始化 IPC 就绪状态管理
 */
function initializeReadyState() {
  if (!ipcReadyState.readyPromise) {
    ipcReadyState.readyPromise = new Promise((resolve) => {
      ipcReadyState.readyResolve = resolve;
    });
  }
}

/**
 * 等待 IPC 处理器就绪
 * @param {number} timeout 超时时间（毫秒）
 * @returns {Promise<boolean>} 是否就绪
 */
async function waitForIpcReady(timeout = 10000) {
  initializeReadyState();

  if (ipcReadyState.isReady) {
    return true;
  }

  try {
    await Promise.race([
      ipcReadyState.readyPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('IPC 就绪等待超时')), timeout)
      )
    ]);
    return true;
  } catch (error) {
    logger.error('等待 IPC 就绪失败:', error);
    return false;
  }
}

/**
 * 验证关键 IPC 处理器
 * @returns {Object} 验证结果
 */
function validateCriticalHandlers() {
  const results = {
    success: true,
    registered: [],
    missing: [],
    total: CRITICAL_HANDLERS.length
  };

  for (const handler of CRITICAL_HANDLERS) {
    if (isHandlerRegistered(handler)) {
      results.registered.push(handler);
      ipcReadyState.registeredHandlers.add(handler);
    } else {
      results.missing.push(handler);
      results.success = false;
      ipcReadyState.failedHandlers.add(handler);
    }
  }

  return results;
}

/**
 * 验证所有必要的 IPC 处理器
 * @returns {Object} 验证结果
 */
function validateAllHandlers() {
  const results = {
    success: true,
    registered: [],
    missing: [],
    total: REQUIRED_HANDLERS.length
  };

  // 开始验证 IPC 处理器注册状态

  for (const handler of REQUIRED_HANDLERS) {
    if (isHandlerRegistered(handler)) {
      results.registered.push(handler);
      ipcReadyState.registeredHandlers.add(handler);
    } else {
      results.missing.push(handler);
      results.success = false;
      ipcReadyState.failedHandlers.add(handler);
      logger.warn(`处理器未注册: ${handler}`);
    }
  }

  // 只在有缺失处理器时输出错误信息
  if (results.missing.length > 0) {
    logger.error('缺失的处理器:', results.missing.join(','));
  }

  return results;
}

/**
 * 获取所有已注册的 IPC 处理器列表
 * @returns {Array} 已注册的处理器列表
 */
function getRegisteredHandlers() {
  // 注意：这是一个简化的实现，实际的 ipcMain 没有直接的方法获取所有处理器
  // 这里我们只能验证我们关心的处理器
  return REQUIRED_HANDLERS.filter(handler => isHandlerRegistered(handler));
}

/**
 * 标记 IPC 处理器为就绪状态
 */
function markIpcReady() {
  const criticalResult = validateCriticalHandlers();

  if (criticalResult.success) {
    ipcReadyState.isReady = true;
    if (ipcReadyState.readyResolve) {
      ipcReadyState.readyResolve();
    }
    // 关键 IPC 处理器验证通过，标记为就绪状态
  } else {
    logger.error('关键 IPC 处理器验证失败，缺失:', criticalResult.missing);
  }

  return criticalResult;
}

/**
 * 重置 IPC 就绪状态
 */
function resetReadyState() {
  ipcReadyState.isReady = false;
  ipcReadyState.readyPromise = null;
  ipcReadyState.readyResolve = null;
  ipcReadyState.registeredHandlers.clear();
  ipcReadyState.failedHandlers.clear();
}

/**
 * 设置 IPC 处理器验证
 * 注册一个用于验证的 IPC 处理器
 */
function setupValidator() {
  // 确保已打补丁以跟踪 handle 注册
  patchIpcMain();

  // 注册验证处理器
  ipcMain.handle('validate-ipc-handlers', async () => {
    return validateAllHandlers();
  });

  // 注册就绪状态查询处理器
  ipcMain.handle('ipc-ready-status', async () => {
    return {
      isReady: ipcReadyState.isReady,
      registeredCount: ipcReadyState.registeredHandlers.size,
      failedCount: ipcReadyState.failedHandlers.size,
      criticalHandlers: CRITICAL_HANDLERS,
      registeredHandlers: Array.from(ipcReadyState.registeredHandlers),
      failedHandlers: Array.from(ipcReadyState.failedHandlers)
    };
  });

  // 注册等待就绪处理器
  ipcMain.handle('wait-for-ipc-ready', async (_, timeout = 10000) => {
    return await waitForIpcReady(timeout);
  });

  logger.debug('IPC处理器验证器已设置');
}

module.exports = {
  validateAllHandlers,
  validateCriticalHandlers,
  isHandlerRegistered,
  getRegisteredHandlers,
  setupValidator,
  waitForIpcReady,
  markIpcReady,
  resetReadyState,
  initializeReadyState,
  REQUIRED_HANDLERS,
  CRITICAL_HANDLERS
};
