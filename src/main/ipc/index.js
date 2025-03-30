/**
 * IPC系统入口
 * 统一管理Electron的IPC通信
 */
const logger = require('../../utils/logger');

// 处理程序模块
const handlers = {
  window: require('./handlers/window')
};

// 已经注册的处理程序
let isRegistered = false;

/**
 * 设置所有IPC处理程序
 */
function setup() {
  if (isRegistered) {
    logger.warn('IPC处理程序已注册，跳过');
    return;
  }

  try {
    // 注册所有处理程序
    for (const [name, handler] of Object.entries(handlers)) {
      if (handler && typeof handler.setup === 'function') {
        handler.setup();
        logger.info(`注册IPC处理程序: ${name}`);
      } else {
        logger.warn(`无效的IPC处理程序模块: ${name}`);
      }
    }

    isRegistered = true;
    logger.info('所有IPC处理程序注册成功');
  } catch (error) {
    logger.error('注册IPC处理程序失败:', error);
  }
}

/**
 * 清理所有IPC处理程序
 */
function cleanup() {
  if (!isRegistered) {
    return;
  }

  try {
    // 清理所有处理程序
    for (const [name, handler] of Object.entries(handlers)) {
      if (handler && typeof handler.cleanup === 'function') {
        handler.cleanup();
        logger.info(`清理IPC处理程序: ${name}`);
      }
    }

    isRegistered = false;
    logger.info('所有IPC处理程序已清理');
  } catch (error) {
    logger.error('清理IPC处理程序失败:', error);
  }
}

module.exports = {
  setup,
  cleanup,
  constants: require('./constants')
}; 