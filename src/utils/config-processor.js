/**
 * 配置文件处理工具
 * 用于处理下载的配置文件，包括验证和基本清理
 */

const logger = require('./logger');
const fs = require('fs');
const path = require('path');

/**
 * 解析配置文件内容
 * 根据文件扩展名自动选择正确的解析器（JSON 或 YAML）
 * @param {String} content 配置文件内容
 * @param {String} filePath 配置文件路径（用于确定文件格式）
 * @returns {Object} 解析后的配置对象
 */
function parseConfigContent(content, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.json') {
    return JSON.parse(content);
  } else if (ext === '.yaml' || ext === '.yml') {
    const yaml = require('js-yaml');
    return yaml.load(content);
  } else {
    return JSON.parse(content);
  }
}

/**
 * 加载并解析配置文件
 * 根据文件扩展名自动选择正确的解析器（JSON 或 YAML）
 * @param {String} filePath 配置文件路径
 * @returns {Object} 解析后的配置对象
 */
function loadAndParseConfigFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`配置文件不存在: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  return parseConfigContent(content, filePath);
}
/**
 * 检测配置是否包含TUN相关配置
 * @param {Object} config 配置对象
 * @returns {Boolean} 是否包含TUN配置
 */
function hasTunConfiguration(config) {
  if (!config || !config.inbounds || !Array.isArray(config.inbounds)) {
    return false;
  }
  
  return config.inbounds.some(inbound => inbound.type === 'tun');
}

/**
 * 从配置中移除所有TUN相关配置（仅在特定情况下使用）
 * @param {Object} config 配置对象
 * @returns {Object} 清理后的配置对象
 */
function removeTunConfiguration(config) {
  if (!config || typeof config !== 'object') {
    return config;
  }
  
  // 深拷贝配置以避免修改原始对象
  const cleanedConfig = JSON.parse(JSON.stringify(config));
  
  // 移除TUN入站配置
  if (cleanedConfig.inbounds && Array.isArray(cleanedConfig.inbounds)) {
    const originalLength = cleanedConfig.inbounds.length;
    cleanedConfig.inbounds = cleanedConfig.inbounds.filter(inbound => {
      if (inbound.type === 'tun') {
        logger.info(`移除TUN入站配置: ${inbound.tag || 'unnamed'}`);
        return false;
      }
      return true;
    });
    
    const removedCount = originalLength - cleanedConfig.inbounds.length;
    if (removedCount > 0) {
      logger.info(`共移除 ${removedCount} 个TUN入站配置`);
    }
  }
  
  // 移除路由中的TUN相关规则
  if (cleanedConfig.route && cleanedConfig.route.rules && Array.isArray(cleanedConfig.route.rules)) {
    const originalLength = cleanedConfig.route.rules.length;
    cleanedConfig.route.rules = cleanedConfig.route.rules.filter(rule => {
      if (rule.inbound && Array.isArray(rule.inbound)) {
        rule.inbound = rule.inbound.filter(inbound => inbound !== 'tun-in' && inbound !== 'tun');
        return rule.inbound.length > 0;
      } else if (rule.inbound === 'tun-in' || rule.inbound === 'tun') {
        logger.info('移除指向TUN的路由规则');
        return false;
      }
      return true;
    });
    
    const removedRules = originalLength - cleanedConfig.route.rules.length;
    if (removedRules > 0) {
      logger.info(`移除 ${removedRules} 个TUN相关路由规则`);
    }
  }
  
  // 移除实验性配置中的TUN相关项
  if (cleanedConfig.experimental) {
    if (cleanedConfig.experimental.clash_api && cleanedConfig.experimental.clash_api.tun) {
      delete cleanedConfig.experimental.clash_api.tun;
      logger.info('移除实验性配置中的TUN设置');
    }
  }
  
  return cleanedConfig;
}

/**
 * 处理下载的配置文件
 * @param {String} content 配置文件内容
 * @param {String} fileName 文件名
 * @returns {Object} 处理结果
 */
function processDownloadedConfig(content, fileName) {
  try {
    // 尝试解析JSON配置
    let config;
    try {
      config = JSON.parse(content);
    } catch (parseError) {
      // 不是JSON格式，可能是YAML或其他格式
      logger.info(`文件 ${fileName} 不是JSON格式，跳过处理`);
      return {
        success: true,
        content: content,
        modified: false,
        message: '非JSON格式，跳过处理'
      };
    }
    
    // 注意：不再自动清理TUN配置
    // TUN配置现在由映射引擎根据用户设置动态管理
    logger.info(`配置文件 ${fileName} 处理完成，TUN配置由系统设置管控`);
    
    return {
      success: true,
      content: content,
      modified: false,
      message: 'TUN配置由程序设置管控'
    };
    
  } catch (error) {
    logger.error(`处理配置文件 ${fileName} 时出错: ${error.message}`);
    return {
      success: false,
      content: content,
      modified: false,
      error: error.message
    };
  }
}

module.exports = {
  hasTunConfiguration,
  removeTunConfiguration,
  processDownloadedConfig,
  parseConfigContent,
  loadAndParseConfigFile
};