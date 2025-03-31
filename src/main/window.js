/**
 * 窗口管理模块
 * 负责创建和管理应用的主窗口
 */
const { BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const singbox = require('../utils/sing-box');
const profileManager = require('./profile-manager');
const ipcManager = require('./ipc-manager');

// 判断是否是开发环境
const isDev = process.env.NODE_ENV === 'development';

// 主窗口引用
let mainWindow = null;

/**
 * 加载应用页面
 */
const loadAppContent = () => {
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    try {
      const indexPath = path.join(__dirname, '../../dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      } else {
        // 尝试查找可能的替代路径
        const altPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
        if (fs.existsSync(altPath)) {
          mainWindow.loadFile(altPath);
        } else {
          mainWindow.loadFile(path.join(__dirname, '../../dist', 'index.html'));
        }
      }
    } catch (error) {
      logger.error(`加载HTML文件时出错: ${error.message}`);
      mainWindow.loadFile(path.join(__dirname, '../../dist', 'index.html'));
    }
  }
};

/**
 * 创建主窗口
 * @returns {BrowserWindow} 创建的主窗口
 */
const createWindow = () => {
  // 确定窗口配置，macOS 下使用系统原生按钮
  const isMacOS = process.platform === 'darwin';
  const windowOptions = {
    width: 1080,
    height: 780,
    minWidth: 800,  // 最小宽度限制
    minHeight: 600, // 最小高度限制
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload.js'),
      v8CacheOptions: 'code',
      backgroundThrottling: false,
      enableBlinkFeatures: 'JSHeavyAdThrottling',
      enablePreferredSizeMode: true,
      spellcheck: false,
      devTools: true,
      webSecurity: true,
    },
    resizable: true,
    frame: false,
    titleBarStyle: isMacOS ? 'hiddenInset' : 'hidden', // macOS 使用 hiddenInset 显示原生控制按钮
    trafficLightPosition: isMacOS ? { x: 10, y: 10 } : undefined, // 调整控制按钮位置
    show: false,
  };

  mainWindow = new BrowserWindow(windowOptions);

  // 设置主窗口到各个模块
  logger.setMainWindow(mainWindow);
  singbox.setMainWindow(mainWindow);
  ipcManager.setMainWindow(mainWindow);
  ipcManager.init();
  
  // 设置CSP策略，允许eval执行（开发模式需要）
  if (isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"]
        }
      });
    });
  }
  
  // 强制应用最小尺寸限制
  mainWindow.setMinimumSize(800, 600);
  
  // 监听窗口大小变化，确保不小于最小尺寸
  mainWindow.on('will-resize', (event, newBounds) => {
    if (newBounds.width < 800 || newBounds.height < 600) {
      event.preventDefault();
    }
  });
  
  // 监听窗口调整大小结束事件，确保最终尺寸不小于最小尺寸
  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getSize();
    if (width < 800 || height < 600) {
      mainWindow.setSize(Math.max(width, 800), Math.max(height, 600));
    }
  });

  // 添加错误处理
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error(`页面加载失败: ${errorCode} - ${errorDescription}`);
    setTimeout(() => loadAppContent(), 1000);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    logger.info('Page loaded successfully');
    
      // 页面加载完成后显示窗口
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    
    // 扫描配置文件并将数据发送到渲染进程
    const profileData = profileManager.scanProfileConfig();
    if (profileData) {
      mainWindow.webContents.send('profile-data', profileData);
    }
  });

  // 加载应用内容
  loadAppContent();

  // 添加窗口关闭事件处理，防止直接退出
  mainWindow.on('close', (event) => {
    if (!global.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  // 添加开发者工具快捷键
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.key.toLowerCase() === 'i')) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
      event.preventDefault();
    }
  });
  
  return mainWindow;
};

/**
 * 获取主窗口实例
 * @returns {BrowserWindow} 主窗口实例
 */
const getMainWindow = () => {
  return mainWindow;
};

/**
 * 显示主窗口
 */
const showWindow = () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
};

// 导出模块
module.exports = {
  createWindow,
  getMainWindow,
  showWindow
}; 