/**
 * IPC处理程序公共工具模块
 */
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const windowManager = require('../window');
const { ipcMain, app } = require('electron');
const os = require('os');

/**
 * 获取应用数据目录
 * @returns {String} 应用数据目录路径
 */
function getAppDataDir() {
  // 使用LOCALAPPDATA目录作为数据存储位置
  const appDataDir = process.env.LOCALAPPDATA || '';
  const appDir = path.join(appDataDir, 'lvory');
  
  // 确保目录存在
  if (!fs.existsSync(appDir)) {
    try {
      fs.mkdirSync(appDir, { recursive: true });
    } catch (error) {
      logger.error(`创建应用数据目录失败: ${error.message}`);
    }
  }
  
  return appDir;
}

/**
 * 获取配置文件目录
 * @returns {String} 配置文件目录路径
 */
function getConfigDir() {
  const appDataDir = getAppDataDir();
  const configDir = path.join(appDataDir, 'configs');
  
  // 确保配置目录存在
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
    } catch (error) {
      logger.error(`创建配置目录失败: ${error.message}`);
    }
  }
  
  return configDir;
}

/**
 * 获取主窗口
 * @returns {BrowserWindow|null} 主窗口对象或null
 */
function getMainWindow() {
  return windowManager.getMainWindow();
}

/**
 * 读取元数据缓存文件
 * @returns {Object} 元数据缓存对象
 */
function readMetaCache() {
  try {
    const metaCachePath = path.join(getConfigDir(), 'meta.cache');
    if (fs.existsSync(metaCachePath)) {
      const cacheData = fs.readFileSync(metaCachePath, 'utf8');
      return JSON.parse(cacheData);
    }
  } catch (error) {
    logger.error(`读取meta.cache失败: ${error.message}`);
  }
  return {};
}

/**
 * 写入元数据缓存文件
 * @param {Object} metaCache 元数据缓存对象
 * @returns {Boolean} 是否成功写入
 */
function writeMetaCache(metaCache) {
  try {
    const metaCachePath = path.join(getConfigDir(), 'meta.cache');
    fs.writeFileSync(metaCachePath, JSON.stringify(metaCache, null, 2));
    return true;
  } catch (error) {
    logger.error(`更新meta.cache失败: ${error.message}`);
    return false;
  }
}

// 获取应用版本
function getAppVersion() {
  ipcMain.handle('get-app-version', async () => {
    try {
      // 使用Electron内置app对象获取版本号
      return app.getVersion();
    } catch (error) {
      console.error('获取应用版本失败:', error);
      // 返回默认版本号
      return '0.1.7';
    }
  });
}

// 获取本机所有网络接口
function getNetworkInterfaces() {
  ipcMain.handle('get-network-interfaces', async () => {
    try {
      const networkInterfaces = os.networkInterfaces();
      const result = [];
      
      // 遍历所有网络接口
      Object.keys(networkInterfaces).forEach(interfaceName => {
        // 过滤IPv4地址并排除本地回环
        const interfaces = networkInterfaces[interfaceName]
          .filter(iface => iface.family === 'IPv4' && !iface.internal);
        
        interfaces.forEach(iface => {
          result.push({
            name: interfaceName,
            address: iface.address,
            netmask: iface.netmask,
            mac: iface.mac
          });
        });
      });
      
      return result;
    } catch (error) {
      console.error('获取网络接口信息失败:', error);
      return [];
    }
  });
}

module.exports = {
  getAppDataDir,
  getConfigDir,
  getMainWindow,
  readMetaCache,
  writeMetaCache,
  getNetworkInterfaces,
  getAppVersion
}; 
