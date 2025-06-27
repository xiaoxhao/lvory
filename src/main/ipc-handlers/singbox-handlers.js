/**
 * SingBox相关IPC处理程序
 */
const { ipcMain } = require('electron');
const logger = require('../../utils/logger');
const utils = require('./utils');
const singbox = require('../../utils/sing-box');
const profileManager = require('../profile-manager');
const coreDownloader = require('../core-downloader');
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
  
  // 检查配置
  ipcMain.handle('singbox-check-config', async (event, data) => {
    try {
      if (!data || !data.configPath) {
        return { success: false, error: '配置文件路径不能为空' };
      }
      
      const result = await singbox.checkConfig(data.configPath);
      return result;
    } catch (error) {
      logger.error('检查配置文件失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 格式化配置
  ipcMain.handle('singbox-format-config', async (event, data) => {
    try {
      if (!data || !data.configPath) {
        return { success: false, error: '配置文件路径不能为空' };
      }
      
      const result = await singbox.formatConfig(data.configPath);
      return result;
    } catch (error) {
      logger.error('格式化配置文件失败:', error);
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
      
      const proxyConfig = options && options.proxyConfig ? options.proxyConfig : {
        host: '127.0.0.1',
        port: 7890,
        enableSystemProxy: true  // 默认启用系统代理
      };
      
      // 获取 TUN 模式设置
      const settingsManager = require('../settings-manager');
      const settings = settingsManager.getSettings();
      const tunMode = settings.tunMode || false;
      
      // 在启动前应用配置映射
      logger.info('启动前应用配置映射...');
      
      try {
        // 读取当前配置文件
        const configContent = fs.readFileSync(configPath, 'utf8');
        let targetConfig = JSON.parse(configContent);
        
        // 构建用户配置对象
        const userConfig = {
          settings: {
            proxy_port: parseInt(proxyConfig.port) || 7890,
            allow_lan: settings.allowLan || false,
            api_address: settings.apiAddress || '127.0.0.1:9090',
            tun_mode: tunMode
          }
        };
        
        // 应用配置映射
        const mappedConfig = profileManager.applyConfigMapping(userConfig, targetConfig);
        
        // 创建临时配置文件副本用于启动
        const tempConfigPath = profileManager.getConfigCopyPath() || configPath;
        profileManager.updateConfigCopy(mappedConfig);
        
        logger.info(`配置映射已应用，TUN模式: ${tunMode ? '启用' : '禁用'}`);
        
        // 使用映射后的配置文件启动
        configPath = tempConfigPath;
        
      } catch (mappingError) {
        logger.error(`应用配置映射失败: ${mappingError.message}`);
        // 继续使用原始配置文件启动
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
  
  // 下载sing-box核心
  ipcMain.handle('singbox-download-core', async () => {
    try {
      const result = await singbox.downloadCore();
      return result;
    } catch (error) {
      logger.error('下载sing-box内核失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 下载核心
  ipcMain.handle('download-core', async (event) => {
    try {
      const mainWindow = utils.getMainWindow();
      const result = await coreDownloader.downloadCore(mainWindow);
      // 如果下载成功，尝试获取版本信息
      if (result.success) {
        setTimeout(async () => {
          const versionInfo = await singbox.getVersion();
          if (versionInfo.success && mainWindow && !mainWindow.isDestroyed()) {
            // 通知渲染进程更新版本信息
            mainWindow.webContents.send('core-version-update', {
              version: versionInfo.version,
              fullOutput: versionInfo.fullOutput
            });
          }
        }, 500); // 稍微延迟以确保文件已正确解压并可访问
      }
      return result;
    } catch (error) {
      logger.error('下载内核处理器错误:', error);
      return { success: false, error: error.message };
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