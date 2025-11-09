/**
 * 设置相关IPC处理程序
 */
const { ipcMain } = require('electron');
const logger = require('../../utils/logger');
const connectionLogger = require('../../utils/connection-logger');
const settingsManager = require('../settings-manager');
const fs = require('fs');
const path = require('path');
const { getLogDir } = require('../../utils/paths');

/**
 * 判断日志文件是否是当前活动的日志文件
 * @param {String} filePath 日志文件路径
 * @returns {Boolean} 是否是活动文件
 */
function isActiveLogFile(filePath) {
  try {
    const currentLogPath = settingsManager.getLogPath();
    return filePath === currentLogPath;
  } catch (error) {
    return false;
  }
}

/**
 * 设置设置相关IPC处理程序
 */
function setup() {
  // 日志系统IPC处理程序
  ipcMain.handle('get-log-history', () => {
    return logger.getHistory();
  });

  ipcMain.handle('clear-logs', () => {
    return logger.clearHistory();
  });

  // 连接日志系统IPC处理程序
  ipcMain.handle('get-connection-log-history', () => {
    return connectionLogger.getConnectionLogHistory();
  });

  ipcMain.handle('clear-connection-logs', () => {
    return connectionLogger.clearConnectionHistory();
  });

  // 连接监听控制IPC处理程序
  ipcMain.handle('start-connection-monitoring', () => {
    return connectionLogger.startMonitoring();
  });

  ipcMain.handle('stop-connection-monitoring', () => {
    connectionLogger.stopMonitoring();
    return true;
  });
  
  // 设置开机自启动
  ipcMain.handle('set-auto-launch', async (event, enable) => {
    return settingsManager.setAutoLaunch(enable);
  });

  // 获取开机自启动状态
  ipcMain.handle('get-auto-launch', async () => {
    return settingsManager.getAutoLaunch();
  });
  
  // 保存设置
  ipcMain.handle('save-settings', async (event, settings) => {
    return settingsManager.saveSettings(settings);
  });

  // 加载设置
  ipcMain.handle('get-settings', async () => {
    const settings = await settingsManager.loadSettings();
    return { success: true, settings };
  });

  // 清理应用缓存和数据
  ipcMain.handle('clear-app-cache', async () => {
    try {
      const { getAppDataDir, getConfigDir, getLogDir, getStorePath } = require('../../utils/paths');
      
      let clearedItems = [];
      let errors = [];
      
      // 1. 清理store.json
      try {
        const storePath = getStorePath();
        if (fs.existsSync(storePath)) {
          fs.unlinkSync(storePath);
          clearedItems.push('应用数据存储 (store.json)');
        }
      } catch (error) {
        errors.push(`清理应用数据存储失败: ${error.message}`);
      }
      
      // 2. 清理日志目录
      try {
        const logDir = getLogDir();
        if (fs.existsSync(logDir)) {
          const logFiles = fs.readdirSync(logDir);
          let logCount = 0;
          for (const file of logFiles) {
            const filePath = path.join(logDir, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              fs.unlinkSync(filePath);
              logCount++;
            }
          }
          if (logCount > 0) {
            clearedItems.push(`应用日志文件 (${logCount} 个文件)`);
          }
        }
      } catch (error) {
        errors.push(`清理应用日志失败: ${error.message}`);
      }
      
      // 3. 清理Lvory缓存文件和meta.cache
      try {
        const configDir = getConfigDir();
        if (fs.existsSync(configDir)) {
          const subscriptionManager = require('../data-managers/subscription-manager');
          const { readMetaCache } = require('./utils');
          const metaCache = readMetaCache();

          let cacheCount = 0;
          // 遍历meta.cache找到所有缓存文件并删除
          Object.keys(metaCache).forEach(key => {
            const meta = metaCache[key];
            if (meta && meta.isCache === true) {
              const cachePath = path.join(configDir, key);
              if (fs.existsSync(cachePath)) {
                fs.unlinkSync(cachePath);
                cacheCount++;
              }
              // 删除缓存文件的订阅记录
              subscriptionManager.deleteSubscription(key);
            }
          });

          // 清理非缓存文件的缓存相关字段
          Object.keys(metaCache).forEach(key => {
            const meta = metaCache[key];
            if (meta && meta.isCache !== true && meta.singboxCache) {
              // 更新订阅记录,移除singboxCache字段
              subscriptionManager.updateSubscription(key, {
                singboxCache: null
              });
            }
          });

          if (cacheCount > 0) {
            clearedItems.push(`配置缓存文件 (${cacheCount} 个文件)`);
          }
          clearedItems.push('元数据缓存 (meta.cache)');
        }
      } catch (error) {
        errors.push(`清理配置缓存失败: ${error.message}`);
      }
      
      // 4. 清理内存中的日志历史
      try {
        logger.clearHistory();
        clearedItems.push('内存日志历史');
      } catch (error) {
        errors.push(`清理内存日志失败: ${error.message}`);
      }
      
      // 5. 清理连接日志历史
      try {
        connectionLogger.clearConnectionHistory();
        clearedItems.push('连接日志历史');
      } catch (error) {
        errors.push(`清理连接日志失败: ${error.message}`);
      }
      
      // 6. 清理cache.db (SQLite数据库)
      try {
        const appDataDir = getAppDataDir();
        const cacheDbPath = path.join(appDataDir, '..', 'cache.db'); // cache.db在项目根目录
        if (fs.existsSync(cacheDbPath)) {
          fs.unlinkSync(cacheDbPath);
          clearedItems.push('SQLite缓存数据库 (cache.db)');
        }
      } catch (error) {
        errors.push(`清理SQLite缓存失败: ${error.message}`);
      }
      
      logger.info(`缓存清理完成，已清理: ${clearedItems.join(', ')}`);
      if (errors.length > 0) {
        logger.warn(`缓存清理中的错误: ${errors.join('; ')}`);
      }
      
      return {
        success: true,
        clearedItems,
        errors,
        message: `成功清理 ${clearedItems.length} 项缓存数据${errors.length > 0 ? `，但有 ${errors.length} 项清理失败` : ''}`
      };
    } catch (error) {
      logger.error(`清理应用缓存失败: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // 获取SingBox日志文件列表
  ipcMain.handle('get-singbox-log-files', async () => {
    try {
      const logDir = getLogDir();
      if (!fs.existsSync(logDir)) {
        return { success: true, files: [] };
      }

      const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith('sing-box-') && file.endsWith('.log'))
        .map(file => {
          const filePath = path.join(logDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            mtime: stats.mtime,
            isActive: isActiveLogFile(filePath)
          };
        })
        .sort((a, b) => b.mtime - a.mtime); // 按修改时间降序排列

      return { success: true, files };
    } catch (error) {
      logger.error(`获取SingBox日志文件列表失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // 读取SingBox日志文件内容
  ipcMain.handle('read-singbox-log-file', async (event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '日志文件不存在' };
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      return { success: true, content: lines };
    } catch (error) {
      logger.error(`读取SingBox日志文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // 获取当前活动的SingBox日志文件路径
  ipcMain.handle('get-current-singbox-log', async () => {
    try {
      // 从配置中获取当前日志路径
      const logPath = settingsManager.getLogPath();
      if (fs.existsSync(logPath)) {
        const stats = fs.statSync(logPath);
        return {
          success: true,
          logFile: {
            name: path.basename(logPath),
            path: logPath,
            size: stats.size,
            mtime: stats.mtime,
            isActive: true
          }
        };
      }
      return { success: false, error: '当前日志文件不存在' };
    } catch (error) {
      logger.error(`获取当前SingBox日志失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  setup
}; 