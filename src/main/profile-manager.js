/**
 * 配置文件管理模块
 * 负责扫描和解析sing-box配置文件
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// 当前配置文件路径
let currentConfigPath = null;

// 用户设置文件路径
const getUserSettingsPath = () => {
  const appDataDir = getAppDataDir();
  return path.join(appDataDir, 'settings.json');
};

// 加载用户设置
const loadUserSettings = () => {
  try {
    const settingsPath = getUserSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(settingsData);
    }
  } catch (error) {
    logger.error(`加载用户设置失败: ${error.message}`);
  }
  return {};
};

// 保存用户设置
const saveUserSettings = (settings) => {
  try {
    const settingsPath = getUserSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    logger.error(`保存用户设置失败: ${error.message}`);
    return false;
  }
};

/**
 * 获取应用数据目录
 * @returns {String} 应用数据目录路径
 */
function getAppDataDir() {
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
 * 扫描应用数据目录中的配置文件并解析
 * @returns {Array} 配置文件中的outbounds数组
 */
const scanProfileConfig = () => {
  try {
    const appDataDir = getAppDataDir();
    const configDir = path.join(appDataDir, 'configs');
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    let fileToUse = null;
    
    // 优先使用已设置的配置文件路径
    if (currentConfigPath && fs.existsSync(currentConfigPath)) {
      fileToUse = currentConfigPath;
      logger.info('使用当前已选择的配置文件:', currentConfigPath);
    } else {
      // 如果没有设置或文件不存在，则尝试从用户设置中加载
      const userSettings = loadUserSettings();
      if (userSettings.lastConfigPath && fs.existsSync(userSettings.lastConfigPath)) {
        fileToUse = userSettings.lastConfigPath;
        currentConfigPath = fileToUse;
        logger.info('从用户设置加载配置文件:', fileToUse);
      } else {
        // 否则使用默认配置文件
        const testConfigPath = path.join(configDir, 'profiles-test.json');
        const configFilePath = path.join(configDir, 'sing-box.json');
        
        // 检查配置文件是否存在
        if (fs.existsSync(testConfigPath)) {
          fileToUse = testConfigPath;
          logger.info('找到测试配置文件:', testConfigPath);
        } else if (fs.existsSync(configFilePath)) {
          fileToUse = configFilePath;
          logger.info('找到标准配置文件:', configFilePath);
        } else {
          logger.info('未找到配置文件');
          return [];
        }
        
        currentConfigPath = fileToUse;
      }
    }
    
    const configContent = fs.readFileSync(fileToUse, 'utf8');
    const config = JSON.parse(configContent);
    
    // 提取outbounds
    if (config && config.outbounds && Array.isArray(config.outbounds)) {
      logger.info('解析到的outbound tags:', config.outbounds.length);
      return config.outbounds;
    }
    
    return [];
  } catch (error) {
    logger.error('扫描配置文件失败:', error);
    return [];
  }
};

/**
 * 获取配置文件路径
 * @returns {String} 配置文件路径
 */
const getConfigPath = () => {
  if (currentConfigPath) {
    return currentConfigPath;
  }
  
  // 尝试从用户设置中加载上次使用的配置路径
  const userSettings = loadUserSettings();
  if (userSettings.lastConfigPath && fs.existsSync(userSettings.lastConfigPath)) {
    currentConfigPath = userSettings.lastConfigPath;
    logger.info(`从用户设置加载配置文件路径: ${currentConfigPath}`);
    return currentConfigPath;
  }
  
  // 否则使用默认配置路径
  const appDataDir = getAppDataDir();
  const configDir = path.join(appDataDir, 'configs');
  const testConfigPath = path.join(configDir, 'profiles-test.json');
  const configFilePath = path.join(configDir, 'sing-box.json');
  
  // 检查配置文件是否存在
  if (fs.existsSync(testConfigPath)) {
    currentConfigPath = testConfigPath;
  } else if (fs.existsSync(configFilePath)) {
    currentConfigPath = configFilePath;
  } else {
    currentConfigPath = configFilePath;
  }
  
  return currentConfigPath;
};

/**
 * 设置当前配置文件路径
 * @param {String} configPath 配置文件路径
 * @returns {Boolean} 是否设置成功
 */
const setConfigPath = (configPath) => {
  if (!configPath || !fs.existsSync(configPath)) {
    return false;
  }
  
  currentConfigPath = configPath;
  logger.info(`当前配置文件路径已设置为: ${configPath}`);
  
  // 保存到用户设置
  const userSettings = loadUserSettings();
  userSettings.lastConfigPath = configPath;
  saveUserSettings(userSettings);
  logger.info(`配置文件路径已保存到用户设置`);
  
  return true;
};

// 获取应用设置
const getAppSettings = () => {
  const userSettings = loadUserSettings();
  return userSettings.appSettings || {};
};

// 保存应用设置
const saveAppSettings = (appSettings) => {
  const userSettings = loadUserSettings();
  userSettings.appSettings = appSettings;
  return saveUserSettings(userSettings);
};

// 更新单个应用设置项
const updateAppSetting = (key, value) => {
  const userSettings = loadUserSettings();
  if (!userSettings.appSettings) {
    userSettings.appSettings = {};
  }
  userSettings.appSettings[key] = value;
  return saveUserSettings(userSettings);
};

module.exports = {
  scanProfileConfig,
  getConfigPath,
  setConfigPath,
  loadUserSettings,
  saveUserSettings,
  getAppSettings,
  saveAppSettings,
  updateAppSetting
}; 