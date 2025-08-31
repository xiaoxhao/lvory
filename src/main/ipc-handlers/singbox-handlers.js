/**
 * SingBox相关IPC处理程序
 */
const { ipcMain } = require('electron');
const logger = require('../../utils/logger');
const utils = require('./utils');
const singbox = require('../../utils/sing-box');
const profileManager = require('../profile-manager');
const { downloadCore: coreDownloader } = require('../core-downloader-universal');
const fs = require('fs');
const path = require('path');

/**
 * 设置SingBox相关IPC处理程序
 */
function setup() {
  // 检查sing-box是否安装
  ipcMain.handle('singbox-check-installed', async () => {
    try {
      const result = singbox.checkInstalled();
      return { success: true, installed: result };
    } catch (error) {
      logger.error('检查sing-box安装状态失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取sing-box版本
  ipcMain.handle('singbox-get-version', async () => {
    try {
      const result = await singbox.getVersion();
      return result;
    } catch (error) {
      logger.error('获取sing-box版本失败:', error);
      return { success: false, error: error.message };
    }
  });
  

  
  // 启动sing-box内核
  ipcMain.handle('singbox-start-core', async (event, options) => {
    try {
      let configPath;
      if (options && options.configPath) {
        configPath = options.configPath;
      } else {
        configPath = profileManager.getConfigPath();
      }
      
      if (!configPath) {
        return { success: false, error: '无法获取配置文件路径' };
      }
      
      if (!fs.existsSync(configPath)) {
        return { success: false, error: `配置文件不存在: ${configPath}` };
      }
      
      // 获取设置管理器
      const settingsManager = require('../settings-manager');
      const settings = settingsManager.getSettings();
      
      // 从设置管理器获取统一的代理配置
      const proxyConfig = options && options.proxyConfig ? 
        { ...settingsManager.getProxyConfig(configPath), ...options.proxyConfig } : 
        settingsManager.getProxyConfig(configPath);
      
      // 获取 TUN 模式设置
      const tunMode = settings.tunMode || false;
      
      // 确保配置文件已经预处理（包含正确的日志配置）
      await profileManager.preprocessConfig(configPath);
      
      // 验证日志配置是否正确注入
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        if (!config.log?.output) {
          logger.warn('配置文件中未发现日志配置，这可能影响内核监控');
        }
      } catch (verifyError) {
        logger.warn(`验证配置文件失败: ${verifyError.message}`);
      }
      
      // 启动内核前检查版本
      logger.info('启动内核前检查版本');
      const versionResult = await singbox.getVersion();
      if (versionResult.success) {
        const mainWindow = utils.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('core-version-update', {
            version: versionResult.version,
            fullOutput: versionResult.fullOutput
          });
        }
      }
      
      logger.info(`启动sing-box内核，配置文件: ${configPath}${tunMode ? ' (TUN模式)' : ''}`);
      
      // 启动内核
      const result = await singbox.startCore({ 
        configPath,
        proxyConfig,
        enableSystemProxy: proxyConfig.enableSystemProxy,
        tunMode
      });
      
      return result;
    } catch (error) {
      logger.error('启动sing-box内核失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 停止sing-box内核
  ipcMain.handle('singbox-stop-core', async () => {
    try {
      const result = await singbox.stopCore();
      return result;
    } catch (error) {
      logger.error('停止sing-box内核失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取sing-box状态
  ipcMain.handle('singbox-get-status', async () => {
    try {
      const result = singbox.getStatus();
      return result;
    } catch (error) {
      logger.error('获取sing-box状态失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取sing-box详细状态
  ipcMain.handle('singbox-get-detailed-status', async () => {
    try {
      const result = singbox.getDetailedStatus();
      return result;
    } catch (error) {
      logger.error('获取sing-box详细状态失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 检查停止权限
  ipcMain.handle('singbox-check-stop-permission', async () => {
    try {
      const result = await singbox.checkStopPermission();
      return { success: true, ...result };
    } catch (error) {
      logger.error('检查停止权限失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 下载sing-box核心
  ipcMain.handle('singbox-download-core', async () => {
    try {
      const result = await singbox.downloadCore();

      // 确保返回的结果是可序列化的
      return {
        success: Boolean(result.success),
        error: result.error ? String(result.error) : undefined,
        version: result.version ? String(result.version) : undefined
      };
    } catch (error) {
      logger.error('下载sing-box内核失败:', error);
      return { success: false, error: String(error.message || '下载失败') };
    }
  });
  
  // 下载核心
  ipcMain.handle('download-core', async (event) => {
    try {
      const mainWindow = utils.getMainWindow();
      const result = await coreDownloader(mainWindow);

      // 确保返回的结果是可序列化的
      const serializableResult = {
        success: Boolean(result.success),
        error: result.error ? String(result.error) : undefined,
        version: result.version ? String(result.version) : undefined
      };

      // 如果下载成功，尝试获取版本信息
      if (result.success) {
        setTimeout(async () => {
          const versionInfo = await singbox.getVersion();
          if (versionInfo.success && mainWindow && !mainWindow.isDestroyed()) {
            // 通知渲染进程更新版本信息
            mainWindow.webContents.send('core-version-update', {
              version: versionInfo.version ? String(versionInfo.version) : '',
              fullOutput: versionInfo.fullOutput ? String(versionInfo.fullOutput) : ''
            });
          }
        }, 500); // 稍微延迟以确保文件已正确解压并可访问
      }

      return serializableResult;
    } catch (error) {
      logger.error('下载内核处理器错误:', error);
      return { success: false, error: String(error.message || '下载失败') };
    }
  });
  
  // 注册sing-box运行服务的IPC处理程序
  ipcMain.handle('singbox-run', async (event, data) => {
    try {
      if (!data || !data.configPath) {
        return { success: false, error: '配置文件路径不能为空' };
      }
      
      const result = await singbox.run(data.configPath);
      return result;
    } catch (error) {
      logger.error('运行sing-box失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 停止运行的sing-box服务
  ipcMain.handle('singbox-stop', async () => {
    try {
      const result = await singbox.stop();
      return result;
    } catch (error) {
      logger.error('停止sing-box失败:', error);
      return { success: false, error: error.message };
    }
  });


}

module.exports = {
  setup
}; 