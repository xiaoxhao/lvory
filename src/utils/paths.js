const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const logger = require('./logger');

/**
 * 获取应用数据目录
 * @returns {String} 应用数据目录路径
 */
function getAppDataDir() {
  let appDir;
  
  // 根据不同平台获取合适的数据目录
  if (process.platform === 'win32') {
    // Windows平台 - 使用LOCALAPPDATA目录
    const appDataDir = process.env.LOCALAPPDATA || '';
    appDir = path.join(appDataDir, 'lvory');
  } else if (process.platform === 'darwin') {
    // macOS平台 - 使用Library/Application Support目录
    const homeDir = os.homedir();
    appDir = path.join(homeDir, 'Library', 'Application Support', 'lvory');
  } else {
    // Linux平台 - 优先使用XDG_CONFIG_HOME，否则使用~/.config目录
    // 这样可以兼容deb和AppImage两种安装方式
    const homeDir = os.homedir();
    const xdgConfigHome = process.env.XDG_CONFIG_HOME;
    if (xdgConfigHome) {
      appDir = path.join(xdgConfigHome, 'lvory');
    } else {
      appDir = path.join(homeDir, '.config', 'lvory');
    }
  }
  
  // 确保目录存在
  if (!fs.existsSync(appDir)) {
    try {
      fs.mkdirSync(appDir, { recursive: true });
      logger.info(`创建应用数据目录: ${appDir}`);
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
      logger.info(`创建配置目录: ${configDir}`);
    } catch (error) {
      logger.error(`创建配置目录失败: ${error.message}`);
    }
  }
  
  return configDir;
}

/**
 * 获取bin目录
 * @returns {String} bin目录路径
 */
function getBinDir() {
  const appDataDir = getAppDataDir();
  const binDir = path.join(appDataDir, 'bin');
  
  // 确保bin目录存在
  if (!fs.existsSync(binDir)) {
    try {
      fs.mkdirSync(binDir, { recursive: true });
      logger.info(`创建bin目录: ${binDir}`);
    } catch (error) {
      logger.error(`创建bin目录失败: ${error.message}`);
    }
  }
  
  return binDir;
}

/**
 * 获取用户设置文件路径
 * @returns {String} 用户设置文件路径
 */
function getUserSettingsPath() {
  const appDataDir = getAppDataDir();
  return path.join(appDataDir, 'settings.json');
}

/**
 * 获取存储文件路径
 * @returns {String} 存储文件路径
 */
function getStorePath() {
  const appDataDir = getAppDataDir();
  return path.join(appDataDir, 'store.json');
}

/**
 * 获取日志目录
 * @returns {String} 日志目录路径
 */
function getLogDir() {
  const appDataDir = getAppDataDir();
  const logDir = path.join(appDataDir, 'logs');
  
  // 确保日志目录存在
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
      logger.info(`创建日志目录: ${logDir}`);
    } catch (error) {
      logger.error(`创建日志目录失败: ${error.message}`);
    }
  }
  
  return logDir;
}

/**
 * 获取临时日志目录（向后兼容）
 * @returns {String} 临时日志目录路径
 */
function getTempLogDir() {
  return getLogDir();
}

/**
 * 生成默认日志文件路径
 * @returns {String} 日志文件路径
 */
function generateDefaultLogPath() {
  const logDir = getLogDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uuid = crypto.randomUUID().split('-')[0]; // 使用短UUID
  return path.join(logDir, `sing-box-${timestamp}-${uuid}.log`);
}

module.exports = {
  getAppDataDir,
  getConfigDir,
  getBinDir,
  getUserSettingsPath,
  getStorePath,
  getLogDir,
  getTempLogDir,
  generateDefaultLogPath
}; 

