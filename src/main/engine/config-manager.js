/**
 * 配置管理工具类
 * 提供统一的配置读写、验证和默认值处理功能
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { 
  NETWORK_CONSTANTS, 
  CONFIG_PATHS, 
  DEFAULT_VALUES,
  createConditionalMapping,
  createSimpleMapping 
} = require('./mapping-definition');

class ConfigManager {
  constructor() {
    this.configCache = new Map();
    this.defaultConfigs = this.initializeDefaultConfigs();
  }

  /**
   * 初始化默认配置
   * @returns {Object} 默认配置对象
   */
  initializeDefaultConfigs() {
    return {
      userConfig: {
        settings: {
          allow_lan: false,
          proxy_port: DEFAULT_VALUES.PROXY_PORT,
          api_address: DEFAULT_VALUES.API_ADDRESS,
          tun_mode: false,
          log_enabled: DEFAULT_VALUES.LOG_ENABLED,
          log_level: DEFAULT_VALUES.LOG_LEVEL,
          log_disabled: DEFAULT_VALUES.LOG_DISABLED,
          log_timestamp: DEFAULT_VALUES.LOG_TIMESTAMP
        },
        nodes: []
      },
      appSettings: {
        autoStart: false,
        checkUpdateOnBoot: true,
        nodeAdvancedMonitoring: false,
        nodeExitStatusMonitoring: false,
        nodeExitIPPurity: false,
        keepNodeTrafficHistory: false,
        kernelWatchdog: true,
        logRotationPeriod: 7,
        language: 'zh_CN',
        foregroundOnly: false
      }
    };
  }

  /**
   * 安全读取JSON文件
   * @param {String} filePath 文件路径
   * @param {Object} defaultValue 默认值
   * @returns {Object} 解析后的对象或默认值
   */
  safeReadJsonFile(filePath, defaultValue = {}) {
    try {
      if (!fs.existsSync(filePath)) {
        logger.info(`配置文件不存在，使用默认值: ${filePath}`);
        return defaultValue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      
      // 缓存配置
      this.configCache.set(filePath, {
        data: parsed,
        timestamp: Date.now()
      });
      
      return parsed;
    } catch (error) {
      logger.error(`读取配置文件失败 ${filePath}: ${error.message}`);
      return defaultValue;
    }
  }

  /**
   * 安全写入JSON文件
   * @param {String} filePath 文件路径
   * @param {Object} data 要写入的数据
   * @returns {Boolean} 是否写入成功
   */
  safeWriteJsonFile(filePath, data) {
    try {
      // 确保目录存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      
      // 更新缓存
      this.configCache.set(filePath, {
        data: data,
        timestamp: Date.now()
      });
      
      logger.info(`配置文件写入成功: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`写入配置文件失败 ${filePath}: ${error.message}`);
      return false;
    }
  }

  /**
   * 合并配置对象
   * @param {Object} defaultConfig 默认配置
   * @param {Object} userConfig 用户配置
   * @returns {Object} 合并后的配置
   */
  mergeConfigs(defaultConfig, userConfig) {
    if (!userConfig || typeof userConfig !== 'object') {
      return { ...defaultConfig };
    }

    const merged = { ...defaultConfig };
    
    for (const [key, value] of Object.entries(userConfig)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value) && 
            typeof defaultConfig[key] === 'object' && !Array.isArray(defaultConfig[key])) {
          // 递归合并嵌套对象
          merged[key] = this.mergeConfigs(defaultConfig[key] || {}, value);
        } else {
          merged[key] = value;
        }
      }
    }
    
    return merged;
  }

  /**
   * 验证配置值
   * @param {Object} config 配置对象
   * @param {Object} schema 验证模式
   * @returns {Object} 验证后的配置
   */
  validateConfig(config, schema) {
    const validated = {};
    
    for (const [key, schemaItem] of Object.entries(schema)) {
      const value = config[key];
      
      if (value === undefined || value === null) {
        validated[key] = schemaItem.default;
        continue;
      }
      
      switch (schemaItem.type) {
        case 'number':
          const numValue = Number(value);
          validated[key] = isNaN(numValue) ? schemaItem.default : numValue;
          break;
        case 'boolean':
          validated[key] = Boolean(value);
          break;
        case 'string':
          validated[key] = String(value);
          break;
        case 'array':
          validated[key] = Array.isArray(value) ? value : schemaItem.default;
          break;
        default:
          validated[key] = value;
      }
    }
    
    return validated;
  }

  /**
   * 创建用户配置对象
   * @param {Object} settings 设置对象
   * @param {String} logPath 日志路径
   * @returns {Object} 用户配置对象
   */
  createUserConfig(settings = {}, logPath = '') {
    const defaultSettings = this.defaultConfigs.userConfig.settings;
    const mergedSettings = this.mergeConfigs(defaultSettings, settings);
    
    return {
      settings: {
        allow_lan: mergedSettings.allowLan || mergedSettings.allow_lan || false,
        proxy_port: mergedSettings.proxyPort || mergedSettings.proxy_port || DEFAULT_VALUES.PROXY_PORT,
        api_address: mergedSettings.apiAddress || mergedSettings.api_address || DEFAULT_VALUES.API_ADDRESS,
        tun_mode: mergedSettings.tunMode || mergedSettings.tun_mode || false,
        log_enabled: true, // 强制启用日志
        log_level: mergedSettings.logLevel || mergedSettings.log_level || DEFAULT_VALUES.LOG_LEVEL,
        log_output: logPath || mergedSettings.logOutput || mergedSettings.log_output || '',
        log_disabled: mergedSettings.logDisabled || mergedSettings.log_disabled || DEFAULT_VALUES.LOG_DISABLED,
        log_timestamp: mergedSettings.logTimestamp || mergedSettings.log_timestamp || DEFAULT_VALUES.LOG_TIMESTAMP
      },
      nodes: mergedSettings.nodes || []
    };
  }

  /**
   * 清除配置缓存
   * @param {String} filePath 可选的特定文件路径
   */
  clearCache(filePath = null) {
    if (filePath) {
      this.configCache.delete(filePath);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    return {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys())
    };
  }
}

module.exports = ConfigManager;
