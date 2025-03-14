/**
 * 托盘管理模块
 * 负责创建和管理系统托盘
 */
const { app, Tray, Menu } = require('electron');
const path = require('path');
const logger = require('../utils/logger');
const singbox = require('../utils/sing-box');
const windowManager = require('./window');
const profileManager = require('./profile-manager');

// 托盘实例
let tray = null;

/**
 * 创建系统托盘
 */
const createTray = () => {
  if (tray) return tray;

  // 托盘图标路径，使用 resource/icon/logo.svg
  const iconPath = path.join(__dirname, '../../resource', 'icon', 'tray.png');
  const iconPathActive = path.join(__dirname, '../../resource', 'icon', 'tray.png');
  
  // 创建托盘
  try {
    // 尝试使用PNG图标
    logger.info(`尝试加载托盘图标: ${iconPath}`);
    tray = new Tray(iconPath);
  } catch (error) {
    // 如果失败，尝试使用备用图标
    logger.error(`加载PNG图标失败: ${error.message}`);
    
    try {
      // 尝试使用应用程序图标
      const appIconPath = path.join(app.getAppPath(), 'build', 'icon.png');
      logger.info(`尝试加载备用图标: ${appIconPath}`);
      if (require('fs').existsSync(appIconPath)) {
        tray = new Tray(appIconPath);
      } else {
        throw new Error('备用图标不存在');
      }
    } catch (error2) {
      logger.error(`加载备用图标失败: ${error2.message}`);
      
      // 使用 nativeImage 创建空白图标
      const { nativeImage } = require('electron');
      
      // 创建一个 16x16 的空白图像
      const emptyImage = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABNJREFUOE9jYBgFo2AUjIJRQG8AAAUAAAFq0PP0AAAAAElFTkSuQmCC');
      tray = new Tray(emptyImage);
      logger.info('使用空白图标创建托盘');
    }
  }
  
  tray.setToolTip('LVORY');
  
  // 更新托盘菜单
  const updateTrayMenu = (isRunning = false) => {
    // 根据运行状态更新图标
    try {
      tray.setImage(isRunning ? iconPathActive : iconPath);
    } catch (error) {
      logger.error(`设置托盘图标失败: ${error.message}`);
      // 尝试使用备用方法设置图标
      try {
        const { nativeImage } = require('electron');
        const emptyImage = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABNJREFUOE9jYBgFo2AUjIJRQG8AAAUAAAFq0PP0AAAAAElFTkSuQmCC');
        tray.setImage(emptyImage);
      } catch (e) {
        logger.error(`设置空白托盘图标也失败: ${e.message}`);
      }
    }
    
    // 创建托盘菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'RUN',
        click: async () => {
          if (singbox.isRunning()) return; // 如果已经在运行，不再启动
          
          // 使用已有的启动功能
          const mainWindow = windowManager.getMainWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            try {
              const configPath = profileManager.getConfigPath();
              const proxyConfig = {
                host: '127.0.0.1',
                port: 7890,
                enableSystemProxy: true
              };
              
              logger.info(`从托盘启动sing-box内核，配置文件: ${configPath}`);
              
              // 先发送状态更新，使UI立即响应
              mainWindow.webContents.send('status-update', { isRunning: true });
              
              // 更新托盘菜单以反映状态变化
              updateTrayMenu(true);
              
              // 然后实际启动内核
              const result = await singbox.startCore({ 
                configPath,
                proxyConfig,
                enableSystemProxy: true
              });
              
              if (!result.success) {
                // 如果启动失败，恢复状态
                mainWindow.webContents.send('status-update', { isRunning: false });
                updateTrayMenu(false);
                logger.error('从托盘启动失败:', result.error);
              }
            } catch (error) {
              logger.error('从托盘启动sing-box内核失败:', error);
              // 恢复状态
              mainWindow.webContents.send('status-update', { isRunning: false });
              updateTrayMenu(false);
            }
          }
        },
        enabled: !isRunning // 运行时禁用此选项
      },
      {
        label: 'STOP',
        click: async () => {
          if (!singbox.isRunning()) return; // 如果已经停止，不再执行
          
          // 使用已有的停止功能
          try {
            logger.info('从托盘停止sing-box内核');
            
            // 先发送状态更新，使UI立即响应
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('status-update', { isRunning: false });
            }
            
            // 更新托盘菜单以反映状态变化
            updateTrayMenu(false);
            
            // 然后实际停止内核
            const result = await singbox.stopCore();
            
            if (!result.success) {
              // 如果停止失败，恢复状态
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('status-update', { isRunning: true });
              }
              updateTrayMenu(true);
              logger.error('从托盘停止失败:', result.error);
            }
          } catch (error) {
            logger.error('从托盘停止sing-box内核失败:', error);
            // 恢复状态
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('status-update', { isRunning: true });
            }
            updateTrayMenu(true);
          }
        },
        enabled: isRunning // 未运行时禁用此选项
      },
      { type: 'separator' },
      {
        label: '显示主窗口',
        click: () => {
          windowManager.showWindow();
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: async () => {
          // 先禁用系统代理再退出
          try {
            await singbox.disableSystemProxy();
            await singbox.stopCore();
          } catch (error) {
            logger.error('退出前清理失败:', error);
          }
          global.isQuitting = true;
          app.quit();
        }
      }
    ]);
    
    // 设置托盘上下文菜单
    tray.setContextMenu(contextMenu);
  };
  
  // 初始设置托盘菜单
  updateTrayMenu(singbox.isRunning());
  
  // 点击托盘图标显示主窗口
  tray.on('click', () => {
    windowManager.showWindow();
  });
  
  // 监听 SingBox 状态变化，更新托盘图标和菜单
  singbox.setStatusCallback((isRunning) => {
    updateTrayMenu(isRunning);
  });
  
  return {
    tray,
    updateTrayMenu
  };
};

/**
 * 获取托盘实例
 * @returns {Tray} 托盘实例
 */
const getTray = () => {
  return tray;
};

/**
 * 更新托盘菜单
 * @param {Boolean} isRunning 是否正在运行
 */
const updateTrayMenu = (isRunning) => {
  if (tray) {
    createTray().updateTrayMenu(isRunning);
  }
};

// 导出模块
module.exports = {
  createTray,
  getTray,
  updateTrayMenu
}; 