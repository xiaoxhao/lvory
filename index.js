const { app, BrowserWindow, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const logger = require('./src/utils/logger');
const singbox = require('./src/utils/sing-box');

// 导入拆分后的模块
const windowManager = require('./src/main/window');
const trayManager = require('./src/main/tray');
const ipcHandlers = require('./src/main/ipc-handlers');
const profileManager = require('./src/main/profile-manager');

// 启用V8特性
app.commandLine.appendSwitch('js-flags', '--harmony --max-old-space-size=4096 --optimize-for-size --enable-experimental-webassembly-features');
app.commandLine.appendSwitch('enable-features', 'V8Runtime,V8PerContextHeaps,PartitionedFullCodeCache,V8VmFuture,V8LiftoffForAll');
app.commandLine.appendSwitch('enable-blink-features', 'JSHeavyAdThrottling');

let AdmZip;
try {
  AdmZip = require('adm-zip');
} catch (error) {
  logger.warn('AdmZip库未安装，解压功能将不可用');
}

try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (error) {
  logger.info('electron-squirrel-startup not found, skipping');
}

// 判断是否是开发环境
const isDev = process.env.NODE_ENV === 'development';
logger.info(`Running in ${isDev ? 'development' : 'production'} mode`);

logger.logStartup();

global.isQuitting = false;

ipcHandlers.setupIpcHandlers();

// 初始化SingBox模块
singbox.init();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  // 设置进程标题
  process.title = 'LVORY';
  
  // 创建主窗口
  windowManager.createWindow();
  
  // 初始创建托盘
  trayManager.createTray();
  
  // 确保加载用户配置
  profileManager.getConfigPath();
  
  logger.info('初始化SingBox模块');
  singbox.init();
  
  // 为了确保正确注册处理程序，等待应用初始化完成后延迟注册
  setTimeout(() => {
    if (singbox.checkInstalled()) {
      logger.info('sing-box已安装，正在获取版本信息');
      singbox.getVersion().then(result => {
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