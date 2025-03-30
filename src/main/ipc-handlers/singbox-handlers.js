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

/**
 * 设置SingBox相关IPC处理程序
 */
function setup() {
  // 检查sing-box是否安装
  ipcMain.handle('singbox-check-installed', () => {
    return { installed: singbox.checkInstalled() };
  });
  
  // 获取sing-box版本
  ipcMain.handle('singbox-get-version', async () => {
    try {
      return await singbox.getVersion();
    } catch (error) {
      logger.error('获取sing-box版本失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 检查配置
  ipcMain.handle('singbox-check-config', async (event, { configPath }) => {
    try {
      return await singbox.checkConfig(configPath);
    } catch (error) {
      logger.error('检查配置错误:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 格式化配置
  ipcMain.handle('singbox-format-config', async (event, { configPath }) => {
    try {
      return await singbox.formatConfig(configPath);
    } catch (error) {
      logger.error('格式化配置错误:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 启动sing-box内核
  ipcMain.handle('singbox-start-core', async (event, options) => {
    try {
      let configPath;
      if (options && options.configPath) {
        // 创建配置副本
        const originalPath = options.configPath;
        if (fs.existsSync(originalPath)) {
          profileManager.updateConfigCopy();
          configPath = profileManager.getConfigCopyPath();
        } else {
          configPath = originalPath;
        }
      } else {
        // 使用默认配置的副本
        configPath = profileManager.getConfigCopyPath();
      }
      
      const proxyConfig = options && options.proxyConfig ? options.proxyConfig : {
        host: '127.0.0.1',
        port: 7890,
        enableSystemProxy: true  // 默认启用系统代理
      };
      
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
      
      logger.info(`启动sing-box内核，使用配置文件副本: ${configPath}`);
      
      // 启动内核
      const result = await singbox.startCore({ 
        configPath,
        proxyConfig,
        enableSystemProxy: proxyConfig.enableSystemProxy
      });
      
      // 成功启动后保存状态，但在开发模式下不保存
      if (result.success && process.env.NODE_ENV !== 'development') {
        try {
          await singbox.saveState();
          logger.info('已保存sing-box状态');
        } catch (err) {
          logger.error('保存sing-box状态失败:', err);
        }
      } else if (result.success) {
        logger.info('开发模式下不保存sing-box状态');
      }
      
      return result;
    } catch (error) {
      logger.error('启动sing-box内核失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 停止sing-box内核
  ipcMain.handle('singbox-stop-core', async () => {
    try {
      logger.info('停止sing-box内核');
      return singbox.stopCore();
    } catch (error) {
      logger.error('停止sing-box内核失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取sing-box状态
  ipcMain.handle('singbox-get-status', async () => {
    try {
      return singbox.getStatus();
    } catch (error) {
      logger.error('获取sing-box状态失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 下载sing-box核心
  ipcMain.handle('singbox-download-core', async () => {
    try {
      const mainWindow = utils.getMainWindow();
      return await coreDownloader.downloadCore(mainWindow);
    } catch (error) {
      logger.error('下载sing-box核心失败:', error);
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
  ipcMain.handle('singbox-run', async (event, args) => {
    try {
      const { configPath } = args;
      const mainWindow = utils.getMainWindow();
      
      // 检查是否已有运行的进程
      if (singbox.process) {
        logger.info('检测到已有运行的sing-box进程，正在终止');
        try {
          await singbox.stopCore();
        } catch (e) {
          logger.error('终止旧进程失败:', e);
        }
      }
      
      // 定义输出回调，将sing-box输出传递给渲染进程
      const outputCallback = (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('singbox-output', data);
        }
      };
      
      // 定义退出回调
      const exitCallback = (code, error) => {
        logger.info(`sing-box进程退出，退出码: ${code}${error ? ', 错误: ' + error : ''}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('singbox-exit', { code, error });
        }
      };
      
      // 解析配置文件中的端口
      const configInfo = singbox.parseConfigFile(configPath);
      if (configInfo && configInfo.port) {
        logger.info(`从配置文件解析到代理端口: ${configInfo.port}`);
        // 只更新端口，保持其他设置不变
        singbox.setProxyConfig({
          ...singbox.proxyConfig,
          port: configInfo.port
        });
      }
      
      logger.info(`启动sing-box服务，配置文件: ${configPath}, 代理端口: ${singbox.proxyConfig.port}`);
      
      const result = await singbox.run(configPath, outputCallback, exitCallback);
      return result;
    } catch (error) {
      logger.error('运行服务错误:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 停止运行的sing-box服务
  ipcMain.handle('singbox-stop', async () => {
    try {
      // 先禁用系统代理
      await singbox.disableSystemProxy();
      
      return await singbox.stopCore();
    } catch (error) {
      logger.error('停止服务错误:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  setup
}; 