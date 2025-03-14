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
    
    const testConfigPath = path.join(configDir, 'profiles-test.json');
    const configFilePath = path.join(configDir, 'sing-box.json');
    
    let fileToUse = null;
    
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

module.exports = {
  scanProfileConfig,
  getConfigPath
}; 