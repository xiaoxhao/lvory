/**
 * 窗口管理模块
 * 负责创建和管理应用的主窗口
 */
const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const logger = require('../utils/logger');
const singbox = require('../utils/sing-box');
const profileManager = require('./profile-manager');

// 判断是否是开发环境
const isDev = process.env.NODE_ENV === 'development';

// 主窗口引用
let mainWindow = null;

/**
 * 创建主窗口
 * @returns {BrowserWindow} 创建的主窗口
 */
const createWindow = () => {
  mainWindow = new BrowserWindow({
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
      spellcheck: false
    },
    resizable: true,
    frame: false,
    titleBarStyle: 'hidden',
    show: false, // 初始隐藏窗口，待内容加载完成后再显示
  });

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

  // 设置主窗口到logger
  logger.setMainWindow(mainWindow);
  
  // 设置主窗口到SingBox模块
  singbox.setMainWindow(mainWindow);

  // 添加错误处理
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error(`Failed to load: ${errorDescription} (${errorCode})`);
    // 尝试重新加载
    setTimeout(() => {
      mainWindow.loadFile(path.join(__dirname, '../../dist', 'index.html'));
    }, 1000);
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

  // 根据环境加载不同的URL或文件
  if (isDev) {
    // 开发环境：连接到webpack-dev-server
    mainWindow.loadURL('http://localhost:3000');
    // 不自动打开开发者工具，需要时可以通过菜单或快捷键打开
    // mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载打包后的文件
    try {
      const indexPath = path.join(__dirname, '../../dist', 'index.html');
      logger.info(`尝试加载HTML文件: ${indexPath}`);
      
      // 检查文件是否存在
      if (!require('fs').existsSync(indexPath)) {
        logger.error(`HTML文件不存在: ${indexPath}`);
        
        // 尝试查找可能的替代路径
        const altPath = path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html');
        if (require('fs').existsSync(altPath)) {
          logger.info(`找到替代HTML文件: ${altPath}`);
          mainWindow.loadFile(altPath);
        } else {
          logger.error(`替代HTML文件也不存在: ${altPath}`);
          mainWindow.loadFile(path.join(__dirname, '../../dist', 'index.html'));
        }
      } else {
        mainWindow.loadFile(indexPath);
      }
    } catch (error) {
      logger.error(`加载HTML文件时出错: ${error.message}`);
      // 备用方案
      mainWindow.loadFile(path.join(__dirname, '../../dist', 'index.html'));
    }
  }

  // 添加IPC事件监听器处理窗口控制
  ipcMain.on('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide(); // 隐藏窗口而非关闭
    }
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  // 添加窗口关闭事件处理，防止直接退出
  mainWindow.on('close', (event) => {
    // 如果不是真正要退出应用，则阻止默认行为
    if (!global.isQuitting) {
      event.preventDefault();
      mainWindow.hide(); // 隐藏窗口而不是关闭
      return false;
    }
    
    return true;
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