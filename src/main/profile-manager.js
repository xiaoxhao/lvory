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
 * 扫描文档目录中的配置文件并解析
 * @returns {Array} 配置文件中的outbounds数组
 */
const scanProfileConfig = () => {
  try {
    const documentsPath = app.getPath('documents');
    
    const testConfigPath = path.join(documentsPath, 'profiles-test.json');
    const configFilePath = path.join(documentsPath, 'sing-box.json');
    
    let fileToUse = null;
    
    // 优先使用 profiles-test.json - 测试配置文件
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

    // 保存当前使用的配置文件路径
    currentConfigPath = fileToUse;
    
    // 读取并解析配置文件
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
  
  // 如果未设置，尝试查找配置文件
  const documentsPath = app.getPath('documents');
  const testConfigPath = path.join(documentsPath, 'profiles-test.json');
  const configFilePath = path.join(documentsPath, 'sing-box.json');
  
  if (fs.existsSync(testConfigPath)) {
    currentConfigPath = testConfigPath;
  } else if (fs.existsSync(configFilePath)) {
    currentConfigPath = configFilePath;
  } else {
    currentConfigPath = configFilePath; // 默认使用标准路径
  }
  
  return currentConfigPath;
};

module.exports = {
  scanProfileConfig,
  getConfigPath
}; 