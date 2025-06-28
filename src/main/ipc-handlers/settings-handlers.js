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