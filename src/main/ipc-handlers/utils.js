/**
 * IPC处理程序公共工具模块
 */
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const windowManager = require('../window');

/**
 * 获取应用数据目录
 * @returns {String} 应用数据目录路径
 */
function getAppDataDir() {
  // 使用LOCALAPPDATA目录作为数据存储位置
  const appDataDir = process.env.LOCALAPPDATA || '';
  const appDir = path.join(appDataDir, 'LVORY');
  
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

module.exports = {
  getAppDataDir,
  getConfigDir,
  getMainWindow,
  readMetaCache,
  writeMetaCache
}; 