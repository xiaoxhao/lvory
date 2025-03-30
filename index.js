const { app, BrowserWindow, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const logger = require('./src/utils/logger');

// 导入拆分后的模块
const windowManager = require('./src/main/window');
const trayManager = require('./src/main/tray');

// 初始化IPC处理程序和配置管理器，这些是必须优先加载的模块
let ipcHandlers = require('./src/main/ipc-handlers');
let profileManager = require('./src/main/profile-manager');
// 懒加载其他非核心模块
let singbox;
let settingsManager;

// 检查是否为第一个实例
const isFirstInstance = app.requestSingleInstanceLock();
const isDev = process.env.NODE_ENV === 'development';

// 如果不是第一个实例且不在开发模式下，则退出
if (!isFirstInstance && !isDev) {
  logger.info('已有一个实例正在运行，退出当前实例');
  app.quit();
} else {
  // 处理第二个实例启动时的行为
  app.on('second-instance', () => {
    logger.info('检测到第二个实例启动，显示主窗口');
    // 显示已有窗口
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 启用V8特性
app.commandLine.appendSwitch('js-flags', '--harmony --max-old-space-size=4096 --optimize-for-size --enable-experimental-webassembly-features');
app.commandLine.appendSwitch('enable-features', 'V8Runtime,V8PerContextHeaps,PartitionedFullCodeCache,V8VmFuture,V8LiftoffForAll');
app.commandLine.appendSwitch('enable-blink-features', 'JSHeavyAdThrottling');

// 懒加载 AdmZip
let AdmZip;
const loadAdmZip = () => {
  try {
    if (!AdmZip) {
      AdmZip = require('adm-zip');
    }
    return AdmZip;
  } catch (error) {
    logger.warn('AdmZip库未安装，解压功能将不可用');
    return null;
  }
};

try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (error) {
  logger.info('electron-squirrel-startup not found, skipping');
}

// 判断是否是开发环境
logger.info(`Running in ${isDev ? 'development' : 'production'} mode`);

logger.logStartup();

global.isQuitting = false;

// 初始化SingBox模块
const initSingBox = () => {
  if (!singbox) {
    singbox = require('./src/utils/sing-box');
  }
  
  if (!singbox.initialized) {
    logger.info('初始化SingBox模块');
    singbox.init();
  }
  
  return singbox;
};

// 初始化设置管理器
const initSettingsManager = () => {
  if (!settingsManager) {
    settingsManager = require('./src/main/settings-manager');
  }
  return settingsManager;
};

// 恢复上次代理状态
const restoreProxyState = async () => {
  // 如果不是第一个实例且不在开发模式，不恢复代理状态
  if (!isFirstInstance && !isDev) return;
  
  try {
    const sb = initSingBox();
    const settings = initSettingsManager();
    await settings.loadSettings();
    
    // 获取存储的sing-box状态
    const state = await sb.loadState();
    
    if (state && state.isRunning && state.configPath) {
      logger.info('恢复上次代理状态，配置文件路径:', state.configPath);
      
      // 延迟启动代理，确保应用界面已经加载
      setTimeout(async () => {
        const mainWindow = windowManager.getMainWindow();
        
        // 启动代理核心
        const result = await sb.startCore({ 
          configPath: state.configPath,
          proxyConfig: state.proxyConfig,
          enableSystemProxy: state.proxyConfig?.enableSystemProxy || false
        });
        
        // 通知UI更新状态
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('proxy-state-restored', {
            success: result.success,
            isRunning: result.success,
            configPath: state.configPath
          });
        }
        
        if (result.success) {
          logger.info('代理状态恢复成功');
        } else {
          logger.error('代理状态恢复失败:', result.error);
        }
      }, 2000);
    } else {
      logger.info('没有找到需要恢复的代理状态或上次未运行代理');
    }
  } catch (error) {
    logger.error('恢复代理状态失败:', error);
  }
};

// 初始化主要模块
const setupApp = () => {
  // 设置IPC处理程序
  ipcHandlers.setupHandlers();
  
  // 初始化配置管理器
  profileManager.getConfigPath();
  
  // 预加载singbox，确保核心功能正常
  initSingBox();
  
  // 加载设置
  initSettingsManager();
  
  // 恢复上次代理状态
  restoreProxyState();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  process.title = 'LVORY';

  // 创建主窗口
  windowManager.createWindow();
  
  // 初始创建托盘
  trayManager.createTray();
  
  // 初始化主要模块
  setupApp();
  
  // 延迟获取版本信息
  setTimeout(() => {
    const sb = initSingBox();
    
    if (sb.checkInstalled()) {
      logger.info('sing-box已安装，正在获取版本信息');
      sb.getVersion().then(result => {
        logger.info('sing-box版本获取结果:', result);
        const mainWindow = windowManager.getMainWindow();
        if (result.success && mainWindow && !mainWindow.isDestroyed()) {
          // 通知渲染进程更新版本信息
          const versionData = {
            version: result.version,
            fullOutput: result.fullOutput
          };
          logger.info('发送版本更新事件到渲染进程:', versionData);
          mainWindow.webContents.send('core-version-update', versionData);
        } else {
          logger.error('获取版本信息失败或窗口已关闭:', result);
        }
      }).catch(err => {
        logger.error('获取sing-box版本失败:', err);
      });
    } else {
      logger.info('sing-box未安装，不获取版本信息');
    }
    
    // 应用初始化完成
    logger.info('应用初始化完成');
  }, 1000);
});

// 劫持窗口关闭行为
app.on('window-all-closed', (e) => {
  if (process.platform !== 'darwin') {
    // 不立即退出
    e.preventDefault();
  }
});

// 设置退出前清理
app.on('before-quit', () => {
  global.isQuitting = true;
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (require('electron').BrowserWindow.getAllWindows().length === 0) {
    windowManager.createWindow();
  }
});