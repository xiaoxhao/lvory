/**
 * 统一的内核 IPC 处理程序
 * 提供与内核类型无关的统一接口
 */

const { ipcMain } = require('electron');
const logger = require('../../utils/logger');
const coreFactory = require('../../utils/core-manager/core-factory');
const { CORE_TYPES, getSupportedCoreTypes } = require('../../constants/core-types');

/**
 * 设置统一的内核 IPC 处理程序
 */
function setup() {
  // 获取支持的内核类型列表
  ipcMain.handle('core-get-supported-types', async () => {
    try {
      return {
        success: true,
        coreTypes: getSupportedCoreTypes()
      };
    } catch (error) {
      logger.error('获取支持的内核类型失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取当前内核类型
  ipcMain.handle('core-get-current-type', async () => {
    try {
      const currentType = coreFactory.getCurrentCoreType();
      return {
        success: true,
        coreType: currentType
      };
    } catch (error) {
      logger.error('获取当前内核类型失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 切换内核类型
  ipcMain.handle('core-switch-type', async (event, coreType) => {
    try {
      const result = await coreFactory.switchCoreType(coreType);
      return result;
    } catch (error) {
      logger.error('切换内核类型失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 启动内核
  ipcMain.handle('core-start', async (event, options) => {
    try {
      const core = coreFactory.getCurrentCore();
      const result = await core.startCore(options);
      
      // 发送状态更新事件
      if (result.success) {
        const utils = require('./utils');
        const mainWindow = utils.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('core-status-update', { isRunning: true });
        }
      }
      
      return result;
    } catch (error) {
      logger.error('启动内核失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 停止内核
  ipcMain.handle('core-stop', async () => {
    try {
      const core = coreFactory.getCurrentCore();
      const result = await core.stopCore();
      
      // 发送状态更新事件
      if (result.success) {
        const utils = require('./utils');
        const mainWindow = utils.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('core-status-update', { isRunning: false });
        }
      }
      
      return result;
    } catch (error) {
      logger.error('停止内核失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取内核状态
  ipcMain.handle('core-get-status', async () => {
    try {
      const core = coreFactory.getCurrentCore();
      return core.getStatus();
    } catch (error) {
      logger.error('获取内核状态失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取详细状态
  ipcMain.handle('core-get-detailed-status', async () => {
    try {
      const core = coreFactory.getCurrentCore();
      return core.getDetailedStatus();
    } catch (error) {
      logger.error('获取详细状态失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取内核版本
  ipcMain.handle('core-get-version', async () => {
    try {
      const core = coreFactory.getCurrentCore();
      const result = await core.getVersion();
      
      // 发送版本更新事件
      if (result.success) {
        const utils = require('./utils');
        const mainWindow = utils.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('core-version-update', {
            version: result.version,
            fullOutput: result.fullOutput,
            coreType: coreFactory.getCurrentCoreType()
          });
        }
      }
      
      return result;
    } catch (error) {
      logger.error('获取内核版本失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 检查内核是否已安装
  ipcMain.handle('core-check-installed', async () => {
    try {
      const core = coreFactory.getCurrentCore();
      return await core.checkInstalled();
    } catch (error) {
      logger.error('检查内核安装状态失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 检查指定类型内核是否已安装
  ipcMain.handle('core-check-type-installed', async (event, coreType) => {
    try {
      const core = coreFactory.createCore(coreType);
      return await core.checkInstalled();
    } catch (error) {
      logger.error(`检查 ${coreType} 内核安装状态失败:`, error);
      return { success: false, error: error.message };
    }
  });



  // 下载内核
  ipcMain.handle('core-download', async () => {
    try {
      const core = coreFactory.getCurrentCore();
      const result = await core.downloadCore();

      // 确保返回的结果是可序列化的
      return {
        success: Boolean(result.success),
        error: result.error ? String(result.error) : undefined,
        version: result.version ? String(result.version) : undefined
      };
    } catch (error) {
      logger.error('下载内核失败:', error);
      return { success: false, error: String(error.message || '下载失败') };
    }
  });

  // 获取所有内核状态
  ipcMain.handle('core-get-all-status', async () => {
    try {
      const allStatus = coreFactory.getAllCoreStatus();
      const currentType = coreFactory.getCurrentCoreType();
      
      return {
        success: true,
        currentCore: currentType,
        allStatus
      };
    } catch (error) {
      logger.error('获取所有内核状态失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取内核配置信息
  ipcMain.handle('core-get-config-info', async () => {
    try {
      const core = coreFactory.getCurrentCore();
      const coreType = coreFactory.getCurrentCoreType();
      const config = core.getCoreConfig();
      
      // 确保所有返回的配置信息都是可序列化的基本类型
      return {
        success: true,
        coreType: String(coreType),
        config: {
          name: String(config.name || ''),
          displayName: String(config.displayName || ''),
          configFormat: String(config.configFormat || ''),
          configExtensions: Array.isArray(config.configExtensions) ?
            config.configExtensions.map(ext => String(ext)) : [],
          defaultApiAddress: String(config.defaultApiAddress || ''),
          defaultProxyPort: Number(config.defaultProxyPort || 0),
          supportedFeatures: config.supportedFeatures ?
            JSON.parse(JSON.stringify(config.supportedFeatures)) : {}
        }
      };
    } catch (error) {
      logger.error('获取内核配置信息失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 检查内核功能支持
  ipcMain.handle('core-check-feature-support', async (event, feature) => {
    try {
      const core = coreFactory.getCurrentCore();
      const supported = core.supportsFeature(feature);
      
      return {
        success: true,
        feature,
        supported
      };
    } catch (error) {
      logger.error('检查功能支持失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 统一内核 IPC 处理程序已设置
}

/**
 * 清理 IPC 处理程序
 */
function cleanup() {
  const handlers = [
    'core-get-supported-types',
    'core-get-current-type',
    'core-switch-type',
    'core-start',
    'core-stop',
    'core-get-status',
    'core-get-detailed-status',
    'core-get-version',
    'core-check-installed',
    'core-check-config',
    'core-format-config',
    'core-download',
    'core-get-all-status',
    'core-get-config-info',
    'core-check-feature-support'
  ];

  handlers.forEach(handler => {
    ipcMain.removeAllListeners(handler);
  });

  logger.info('统一内核 IPC 处理程序已清理');
}

module.exports = {
  setup,
  cleanup
};
