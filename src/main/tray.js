/**
 * 托盘管理模块
 * 负责创建和管理系统托盘
 */
const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const singbox = require('../utils/sing-box');
const windowManager = require('./window');
const profileManager = require('./profile-manager');

// 托盘实例
let tray = null;
let updateTrayMenuCallback = null;

/**
 * 获取托盘图标
 */
const getTrayIcon = (isActive = false) => {
  try {
    let iconPath;
    
    // 根据是否为 macOS 和是否打包来确定正确的图标路径
    if (process.platform === 'darwin' && process.env.NODE_ENV !== 'development') {
      // macOS 打包后的路径处理
      const resourcesPath = process.resourcesPath || path.join(process.cwd(), 'resources');
      const asarPath = path.join(resourcesPath, 'app.asar', 'resource', 'icon', 'tray.png');
      const unpackedPath = path.join(resourcesPath, 'icon', 'tray.png');
      
      // 优先使用 extraResources 中的图标
      if (fs.existsSync(unpackedPath)) {
        iconPath = unpackedPath;
      } else if (fs.existsSync(asarPath)) {
        // 如果 asar 内的文件存在，需要将其复制到临时位置
        const tempPath = path.join(app.getPath('temp'), 'lvory-tray.png');
        try {
          const iconData = fs.readFileSync(asarPath);
          fs.writeFileSync(tempPath, iconData);
          iconPath = tempPath;
        } catch (error) {
          logger.error(`复制托盘图标到临时目录失败: ${error.message}`);
          throw error;
        }
      } else {
        throw new Error('托盘图标文件不存在');
      }
    } else {
      // 开发环境或其他平台的路径
      iconPath = path.join(__dirname, '../../resource', 'icon', 'tray.png');
    }
    
    // 验证文件是否存在
    if (!fs.existsSync(iconPath)) {
      throw new Error(`托盘图标文件不存在: ${iconPath}`);
    }
    
    return iconPath;
  } catch (error) {
    logger.error(`获取托盘图标失败: ${error.message}`);
    // 创建一个空白图像作为备用
    return nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABBJREFUOE9jYBgFo2AUjIJRQG8AAAUAAAFq0PP0AAAAAElFTkSuQmCC');
  }
};

/**
 * 创建系统托盘
 */
const createTray = () => {
  if (tray) return { tray, updateTrayMenu: updateTrayMenuCallback };

  try {
    const iconPath = getTrayIcon();
    tray = new Tray(iconPath);
  } catch (error) {
    logger.error(`创建托盘失败: ${error.message}`);
    const emptyImage = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABNJREFUOE9jYBgFo2AUjIJRQG8AAAUAAAFq0PP0AAAAAElFTkSuQmCC');
    tray = new Tray(emptyImage);
  }
  
  tray.setToolTip('LVORY');
  
  // 更新托盘菜单函数
  updateTrayMenuCallback = (isRunning = false) => {
    // 根据运行状态更新图标
    try {
      const iconPath = getTrayIcon(isRunning);
      tray.setImage(iconPath);
    } catch (error) {
      logger.error(`设置托盘图标失败: ${error.message}`);
    }
    
    // 创建托盘菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'RUN',
        click: async () => {
          if (singbox.isRunning()) return;
          
          const mainWindow = windowManager.getMainWindow();
          if (!mainWindow || mainWindow.isDestroyed()) return;
          
          try {
            const configPath = profileManager.getConfigPath();
            const proxyConfig = {
              host: '127.0.0.1',
              port: 7890,
              enableSystemProxy: true
            };
            
            logger.info(`从托盘启动sing-box内核，配置文件: ${configPath}`);
            
            // 先更新UI状态
            mainWindow.webContents.send('status-update', { isRunning: true });
            updateTrayMenuCallback(true);
            
            // 启动内核
            const result = await singbox.startCore({ 
              configPath,
              proxyConfig,
              enableSystemProxy: true
            });
            
            if (!result.success) {
              // 启动失败，恢复状态
              mainWindow.webContents.send('status-update', { isRunning: false });
              updateTrayMenuCallback(false);
              logger.error('从托盘启动失败:', result.error);
            }
          } catch (error) {
            logger.error('从托盘启动sing-box内核失败:', error);
            // 恢复状态
            mainWindow.webContents.send('status-update', { isRunning: false });
            updateTrayMenuCallback(false);
          }
        },
        enabled: !isRunning
      },
      {
        label: 'STOP',
        click: async () => {
          if (!singbox.isRunning()) return;
          
          try {
            logger.info('从托盘停止sing-box内核');
            
            // 先更新UI状态
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('status-update', { isRunning: false });
            }
            
            updateTrayMenuCallback(false);
            
            // 停止内核
            const result = await singbox.stopCore();
            
            if (!result.success) {
              // 停止失败，恢复状态
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('status-update', { isRunning: true });
              }
              updateTrayMenuCallback(true);
              logger.error('从托盘停止失败:', result.error);
            }
          } catch (error) {
            logger.error('从托盘停止sing-box内核失败:', error);
            // 恢复状态
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('status-update', { isRunning: true });
            }
            updateTrayMenuCallback(true);
          }
        },
        enabled: isRunning
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
    
    tray.setContextMenu(contextMenu);
  };
  
  // 初始设置托盘菜单
  updateTrayMenuCallback(singbox.isRunning());
  
  // 点击托盘图标显示主窗口
  tray.on('click', () => {
    windowManager.showWindow();
  });
  
  // 监听 SingBox 状态变化，更新托盘图标和菜单
  singbox.setStatusCallback((isRunning) => {
    logger.info(`[Tray] 收到状态回调: isRunning=${isRunning}`);
    updateTrayMenuCallback(isRunning);
    
    // 同时通知前端 UI 更新状态
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      logger.info(`[Tray] 向前端发送状态更新: isRunning=${isRunning}`);
      mainWindow.webContents.send('status-update', { isRunning });
    } else {
      logger.warn(`[Tray] 主窗口不存在或已销毁，无法发送状态更新`);
    }
  });
  
  return {
    tray,
    updateTrayMenu: updateTrayMenuCallback
  };
};

/**
 * 获取托盘实例
 * @returns {Tray} 托盘实例
 */
const getTray = () => tray;

/**
 * 更新托盘菜单
 * @param {Boolean} isRunning 是否正在运行
 */
const updateTrayMenu = (isRunning) => {
  if (tray && updateTrayMenuCallback) {
    updateTrayMenuCallback(isRunning);
  }
};

// 导出模块
module.exports = {
  createTray,
  getTray,
  updateTrayMenu
}; 