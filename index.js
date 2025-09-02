const { app, BrowserWindow, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const logger = require('./src/utils/logger');

// 导入拆分后的模块
const windowManager = require('./src/main/window');
const trayManager = require('./src/main/tray');

let ipcHandlers = require('./src/main/ipc-handlers');
let profileManager = require('./src/main/profile-manager');
let singbox;
let settingsManager;

// 检查是否为第一个实例
const isFirstInstance = app.requestSingleInstanceLock();
const isDev = process.env.NODE_ENV === 'development';

if (!isFirstInstance && !isDev) {
  logger.info('已有一个实例正在运行，退出当前实例');
  app.quit();
} else {
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

app.commandLine.appendSwitch('js-flags', '--harmony --max-old-space-size=256 --optimize-for-size --memory-pressure-threshold=512');
app.commandLine.appendSwitch('enable-features', 'V8Runtime,V8PerContextHeaps,PartitionedFullCodeCache,V8VmFuture,V8LiftoffForAll');
app.commandLine.appendSwitch('enable-blink-features', 'JSHeavyAdThrottling');
app.commandLine.appendSwitch('js-flags', '--gc-interval=5000 --max-semi-space-size=1');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor,AudioServiceOutOfProcess');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('max-active-webgl-contexts', '1');
app.commandLine.appendSwitch('disable-background-networking');

let AdmZip;
const loadAdmZip = () => {
  if (!AdmZip) {
    AdmZip = require('adm-zip');
  }
  return AdmZip;
};

// 检查 electron-squirrel-startup
const electronSquirrelStartup = require('electron-squirrel-startup');
if (electronSquirrelStartup) {
  app.quit();
}

logger.logStartup();

global.isQuitting = false;

const initSingBox = () => {
  if (!singbox) {
    try {
      singbox = require('./src/utils/sing-box');
    } catch (error) {
      logger.error('加载SingBox模块失败:', error);
      return {
        initialized: false,
        init: () => { },
        loadState: async () => null,
        checkInstalled: () => false,
        getVersion: async () => ({ success: false })
      };
    }
  }

  if (!singbox.initialized) {
    logger.info('初始化SingBox模块');
    try {
      singbox.init();
    } catch (error) {
      logger.error('初始化SingBox失败:', error);
    }
  }

  return singbox;
};

// 初始化设置管理器 - 增加错误处理
const initSettingsManager = () => {
  if (!settingsManager) {
    try {
      settingsManager = require('./src/main/settings-manager');
    } catch (error) {
      logger.error('加载设置管理器失败:', error);
      return { loadSettings: async () => ({}) };
    }
  }
  return settingsManager;
};

// 恢复上次代理状态
const restoreProxyState = async () => {
  // 如果不是第一个实例不恢复代理状态
  if (!isFirstInstance) return;
  if (isDev) return;

  try {
    const sb = initSingBox();
    const settings = initSettingsManager();
    await settings.loadSettings();

    // 获取存储的sing-box状态
    const state = await sb.loadState();

    if (state?.isRunning && state.configPath) {
      // 恢复上次代理状态

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
        if (mainWindow?.isDestroyed?.() === false) {
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
  try {
    ipcHandlers.setupHandlers();
    profileManager.getConfigPath();
    initSingBox();
    initSettingsManager();
    restoreProxyState().catch(err => {
      logger.error('恢复代理状态过程中出错:', err);
    });
  } catch (error) {
    logger.error('设置应用程序时出错:', error);
  }
};

// 优化内存使用的辅助函数
const optimizeMemory = () => {
  if (global.gc) {
    try {
      global.gc();
      // 手动执行垃圾回收
    } catch (e) {
      logger.warn('手动垃圾回收失败:', e);
    }
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  process.title = 'lvory';

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
        logger.info(`sing-box版本获取结果: success=${result.success}, version=${result.version || 'N/A'}`);
        const mainWindow = windowManager.getMainWindow();
        if (result.success && mainWindow?.isDestroyed?.() === false) {
          // 通知渲染进程更新版本信息
          const versionData = {
            version: result.version,
            fullOutput: result.fullOutput
          };
          logger.info(`发送版本更新事件到渲染进程: version=${versionData.version}`);
          mainWindow.webContents.send('core-version-update', versionData);
        } else {
          logger.error(`获取版本信息失败或窗口已关闭: success=${result.success}, error=${result.error || 'N/A'}`);
        }
      }).catch(err => {
        logger.error('获取sing-box版本失败:', err.message || err);
      });
    } else {
      logger.info('sing-box未安装，不获取版本信息');
    }
    
    // 应用初始化完成
  }, 1000);
});

// 劫持窗口关闭行为
app.on('window-all-closed', (e) => {
  if (process.platform !== 'darwin') {
    e.preventDefault();
  }
});

// 设置退出前清理
app.on('before-quit', () => {
  global.isQuitting = true;
  // 清理IPC处理器
  if (ipcHandlers && typeof ipcHandlers.cleanupHandlers === 'function') {
    ipcHandlers.cleanupHandlers();
  }
  // 执行最后的内存优化
  optimizeMemory();
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (require('electron').BrowserWindow.getAllWindows().length === 0) {
    windowManager.createWindow();
  }
});