/**
 * 配置文件管理模块
 * 负责扫描和解析sing-box配置文件
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { getAppDataDir, getConfigDir, getUserSettingsPath } = require('../utils/paths');
const profileEngine = require('./engine/profiles-engine');
const mappingDefinition = require('./engine/mapping-definition');
const LvorySyncProcessor = require('./adapters/lvory-sync-processor');

let currentConfigPath = null;

// 映射定义缓存
let mappingDefinitionCache = null;

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
 * 获取映射定义文件路径
 * @returns {String} 映射定义文件路径
 */
function getMappingDefinitionPath() {
  const appDataDir = getAppDataDir();
  return path.join(appDataDir, 'mapping-definition.json');
}

/**
 * 加载映射定义
 * @returns {Array} 映射规则数组
 */
function loadMappingDefinition() {
  if (mappingDefinitionCache) {
    return mappingDefinitionCache;
  }
  
  const mappingPath = getMappingDefinitionPath();
  
  // 如果映射定义文件不存在，创建默认映射定义
  if (!fs.existsSync(mappingPath)) {
    createDefaultMappingDefinition();
  }
  
  mappingDefinitionCache = profileEngine.loadMappingDefinition(mappingPath);
  return mappingDefinitionCache;
}

/**
 * 创建默认映射定义文件
 */
function createDefaultMappingDefinition() {
  try {
    const mappingPath = getMappingDefinitionPath();
    const defaultDefinition = mappingDefinition.getDefaultMappingDefinition();
    
    fs.writeFileSync(mappingPath, JSON.stringify(defaultDefinition, null, 2), 'utf8');
    logger.info(`已创建默认映射定义文件: ${mappingPath}`);
  } catch (error) {
    logger.error(`创建默认映射定义文件失败: ${error.message}`);
  }
}

/**
 * 应用配置映射，将用户配置转换为sing-box配置
 * @param {Object} userConfig 用户配置
 * @param {Object} targetConfig 现有sing-box配置（可选）
 * @returns {Object} 处理后的sing-box配置
 */
function applyConfigMapping(userConfig, targetConfig = {}) {
  try {
    const mappings = loadMappingDefinition();
    if (!mappings || mappings.length === 0) {
      logger.warn('未找到有效的映射定义，无法应用配置映射');
      return targetConfig;
    }
    
    const result = profileEngine.applyMappings(userConfig, targetConfig, mappings);
    logger.info('配置映射应用成功');
    return result;
  } catch (error) {
    logger.error(`应用配置映射失败: ${error.message}`);
    return targetConfig;
  }
}

/**
 * 保存用户配置并应用映射到sing-box配置
 * @param {Object} userConfig 用户配置
 * @returns {Boolean} 是否保存成功
 */
function saveUserConfig(userConfig) {
  try {
    const appDataDir = getAppDataDir();
    const userConfigPath = path.join(appDataDir, 'user-config.json');
    
    // 保存用户配置
    fs.writeFileSync(userConfigPath, JSON.stringify(userConfig, null, 2), 'utf8');
    
    // 获取当前sing-box配置（如果存在）
    let targetConfig = {};
    const configPath = getConfigPath();
    
    // 只有当配置文件存在时才应用映射，避免自动创建默认配置
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      targetConfig = JSON.parse(configContent);
      
      // 应用映射
      const mappedConfig = applyConfigMapping(userConfig, targetConfig);
      
      // 保存映射后的sing-box配置
      fs.writeFileSync(configPath, JSON.stringify(mappedConfig, null, 2), 'utf8');
      
      logger.info(`用户配置已保存，映射已应用到现有配置文件: ${configPath}`);
    } else {
      logger.info(`用户配置已保存，但未找到配置文件，跳过映射应用`);
    }
    
    return true;
  } catch (error) {
    logger.error(`保存用户配置并应用映射失败: ${error.message}`);
    return false;
  }
}

/**
 * 加载用户配置
 * @returns {Object} 用户配置
 */
function loadUserConfig() {
  try {
    const appDataDir = getAppDataDir();
    const userConfigPath = path.join(appDataDir, 'user-config.json');
    
    if (fs.existsSync(userConfigPath)) {
      const content = fs.readFileSync(userConfigPath, 'utf8');
      return JSON.parse(content);
    }
    
    // 返回默认用户配置
    return {
      settings: {
        allow_lan: false
      },
      nodes: []
    };
  } catch (error) {
    logger.error(`加载用户配置失败: ${error.message}`);
    return {
      settings: {
        allow_lan: false
      },
      nodes: []
    };
  }
}

/**
 * 扫描应用数据目录中的配置文件并解析
 * @returns {Array} 配置文件中的outbounds数组
 */
const scanProfileConfig = () => {
  try {
    const configDir = getConfigDir();
    
    let fileToUse = null;
    
    // 优先使用已设置的配置文件路径
    if (currentConfigPath && fs.existsSync(currentConfigPath)) {
      fileToUse = currentConfigPath;
    } else {
      // 如果没有设置或文件不存在，则尝试从用户设置中加载
      const userSettings = loadUserSettings();
      if (userSettings.lastConfigPath && fs.existsSync(userSettings.lastConfigPath)) {
        fileToUse = userSettings.lastConfigPath;
        currentConfigPath = fileToUse;
        logger.info('从用户设置加载配置文件:', fileToUse);
      } else {
        // 否则使用默认配置文件
        const configFilePath = path.join(configDir, 'sing-box.json');
        
        // 检查配置文件是否存在
        if (fs.existsSync(configFilePath)) {
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
  const configDir = getConfigDir();
  const configFilePath = path.join(configDir, 'sing-box.json');
  
  // 使用标准配置文件
  currentConfigPath = configFilePath;
  
  return currentConfigPath;
};

/**
 * 设置当前配置文件路径
 * @param {String} configPath 配置文件路径
 * @returns {Boolean} 是否设置成功
 */
const setConfigPath = async (configPath) => {
  if (!configPath || !fs.existsSync(configPath)) {
    return false;
  }
  
  // 预处理配置文件，确保日志配置正确注入
  await preprocessConfig(configPath);
  
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

/**
 * 检测配置文件是否为 Lvory 同步协议
 * @param {String} configPath 配置文件路径
 * @returns {Boolean} 是否为 Lvory 同步协议
 */
function isLvorySyncConfig(configPath) {
  try {
    if (!fs.existsSync(configPath)) {
      return false;
    }

    const content = fs.readFileSync(configPath, 'utf8');
    const isYaml = configPath.endsWith('.yaml') || configPath.endsWith('.yml');
    
    if (isYaml) {
      const yaml = require('js-yaml');
      const config = yaml.load(content);
      return config && config.lvory_sync;
    }
    
    return false;
  } catch (error) {
    logger.error(`检测 Lvory 同步协议失败: ${error.message}`);
    return false;
  }
}

/**
 * 生成Lvory配置的缓存文件名
 * @param {String} lvorySyncPath Lvory同步配置文件路径
 * @returns {String} 缓存文件名
 */
function generateLvoryCacheFileName(lvorySyncPath) {
  const crypto = require('crypto');
  // 生成随机UUID作为文件名
  const uuid = crypto.randomUUID();
  const cacheFileName = `${uuid}.json`;
  return cacheFileName;
}

/**
 * 检查Lvory配置是否有有效缓存
 * @param {String} syncConfigPath 同步配置文件路径
 * @returns {Object|null} 缓存信息或null
 */
function checkLvoryCache(syncConfigPath) {
  try {
    const { readMetaCache } = require('./ipc-handlers/utils');
    const metaCache = readMetaCache();
    const fileName = path.basename(syncConfigPath);
    
    if (metaCache[fileName] && metaCache[fileName].singboxCache) {
      const cacheFileName = metaCache[fileName].singboxCache;
      const configDir = getConfigDir();
      const cachePath = path.join(configDir, cacheFileName);
      
      // 检查缓存文件是否存在
      if (fs.existsSync(cachePath)) {
        const lvoryStat = fs.statSync(syncConfigPath);
        const cacheStat = fs.statSync(cachePath);
        
        // 如果缓存文件比原文件新，说明缓存有效
        if (cacheStat.mtime >= lvoryStat.mtime) {
          logger.info(`找到有效的Lvory缓存文件: ${cacheFileName}`);
          return {
            cachePath: cachePath,
            cacheFileName: cacheFileName,
            isValid: true
          };
        } else {
          logger.info(`Lvory缓存文件已过期: ${cacheFileName}`);
        }
      }
    }
    
    return null;
  } catch (error) {
    logger.error(`检查Lvory缓存失败: ${error.message}`);
    return null;
  }
}

/**
 * 处理 Lvory 同步协议配置
 * @param {String} syncConfigPath 同步配置文件路径
 * @param {Boolean} forceRefresh 是否强制刷新缓存
 * @returns {Object|null} 处理结果包含配置和缓存路径，失败时返回 null
 */
async function processLvorySyncConfig(syncConfigPath, forceRefresh = false) {
  try {
    logger.info(`开始处理 Lvory 同步配置: ${syncConfigPath}`);
    
    // 检查是否有有效缓存
    const cacheInfo = !forceRefresh ? checkLvoryCache(syncConfigPath) : null;
    
    let mergedConfig;
    let cacheFileName;
    let cachePath;
    
    if (cacheInfo && cacheInfo.isValid) {
      // 使用缓存
      logger.info(`使用缓存的SingBox配置: ${cacheInfo.cacheFileName}`);
      const cacheContent = fs.readFileSync(cacheInfo.cachePath, 'utf8');
      mergedConfig = JSON.parse(cacheContent);
      cacheFileName = cacheInfo.cacheFileName;
      cachePath = cacheInfo.cachePath;
    } else {
      // 重新处理并创建缓存
      logger.info(`重新处理Lvory同步配置并创建缓存`);
      mergedConfig = await LvorySyncProcessor.processSync(syncConfigPath);
      
      // 生成缓存文件
      const configDir = getConfigDir();
      cacheFileName = generateLvoryCacheFileName(syncConfigPath);
      cachePath = path.join(configDir, cacheFileName);
      
      // 保存缓存文件
      fs.writeFileSync(cachePath, JSON.stringify(mergedConfig, null, 2), 'utf8');
      logger.info(`Lvory缓存文件已创建: ${cacheFileName}`);
      
      // 更新meta.cache映射关系
      const { readMetaCache, writeMetaCache } = require('./ipc-handlers/utils');
      const metaCache = readMetaCache();
      const originalFileName = path.basename(syncConfigPath);
      
      // 清理旧的缓存文件（如果存在）
      if (metaCache[originalFileName] && metaCache[originalFileName].singboxCache) {
        const oldCacheFile = metaCache[originalFileName].singboxCache;
        const oldCachePath = path.join(configDir, oldCacheFile);
        if (fs.existsSync(oldCachePath)) {
          try {
            fs.unlinkSync(oldCachePath);
            logger.info(`已删除旧的缓存文件: ${oldCacheFile}`);
            // 清理meta中的旧缓存记录
            if (metaCache[oldCacheFile]) {
              delete metaCache[oldCacheFile];
            }
          } catch (err) {
            logger.warn(`删除旧缓存文件失败: ${err.message}`);
          }
        }
      }
      
      // 更新原始Lvory文件的meta信息
      metaCache[originalFileName] = {
        status: 'active',
        protocol: 'lvory',
        lastProcessed: new Date().toISOString(),
        singboxCache: cacheFileName,
        source: 'loaded'
      };
      
      // 添加缓存文件的meta信息
      metaCache[cacheFileName] = {
        status: 'cached',
        protocol: 'singbox',
        generatedFrom: originalFileName,
        lastGenerated: new Date().toISOString(),
        source: 'lvory_processed',
        isCache: true
      };
      
      writeMetaCache(metaCache);
      logger.info(`已更新meta.cache映射关系: ${originalFileName} -> ${cacheFileName}`);
    }
    
    logger.info(`Lvory 同步配置处理完成，缓存文件: ${cacheFileName}`);
    return {
      config: mergedConfig,
      cachePath: cachePath,
      cacheFileName: cacheFileName,
      originalPath: syncConfigPath
    };
  } catch (error) {
    logger.error(`处理 Lvory 同步配置失败: ${error.message}`);
    return null;
  }
}

/**
 * 智能设置配置文件路径（支持 Lvory 同步协议）
 * @param {String} configPath 配置文件路径
 * @param {Boolean} forceRefresh 是否强制刷新Lvory缓存
 * @returns {Boolean} 是否设置成功
 */
async function setConfigPathSmart(configPath, forceRefresh = false) {
  if (!configPath || !fs.existsSync(configPath)) {
    return false;
  }

  // 检测是否为 Lvory 同步协议
  if (isLvorySyncConfig(configPath)) {
    logger.info(`检测到 Lvory 同步协议配置文件: ${configPath}`);
    
    // 处理同步配置
    const result = await processLvorySyncConfig(configPath, forceRefresh);
    if (!result || !result.config) {
      logger.error('Lvory 同步配置处理失败');
      return false;
    }
    
    // 使用缓存配置文件作为当前配置路径
    currentConfigPath = result.cachePath;
    
    // 预处理缓存配置文件，确保日志配置正确注入
    await preprocessConfig(result.cachePath);
    
    // 保存同步配置文件路径到用户设置
    const userSettings = loadUserSettings();
    userSettings.lastSyncConfigPath = configPath;
    userSettings.lastCacheConfigPath = result.cachePath; // 保存缓存路径
    userSettings.lastConfigPath = result.cachePath; // 设置当前配置路径为缓存路径
    saveUserSettings(userSettings);
    
    logger.info(`Lvory 同步配置已成功应用，当前配置路径: ${result.cachePath}`);
    return true;
  } else {
    // 普通配置文件，使用原有逻辑
    return await setConfigPath(configPath);
  }
}

/**
 * 刷新 Lvory 同步配置（手动触发同步）
 * @param {Boolean} forceRefresh 是否强制刷新缓存
 * @returns {Boolean} 是否刷新成功
 */
async function refreshLvorySyncConfig(forceRefresh = true) {
  try {
    const userSettings = loadUserSettings();
    const syncConfigPath = userSettings.lastSyncConfigPath;
    
    if (!syncConfigPath || !fs.existsSync(syncConfigPath)) {
      logger.warn('未找到 Lvory 同步配置文件');
      return false;
    }
    
    if (!isLvorySyncConfig(syncConfigPath)) {
      logger.warn('指定的文件不是有效的 Lvory 同步配置');
      return false;
    }
    
    logger.info('开始刷新 Lvory 同步配置...');
    const result = await processLvorySyncConfig(syncConfigPath, forceRefresh);
    
    if (result && result.config) {
      // 更新用户设置中的缓存路径
      userSettings.lastCacheConfigPath = result.cachePath;
      saveUserSettings(userSettings);
      
      logger.info(`Lvory 同步配置刷新成功，新缓存: ${result.cacheFileName}`);
      return true;
    } else {
      logger.error('Lvory 同步配置刷新失败');
      return false;
    }
  } catch (error) {
    logger.error(`刷新 Lvory 同步配置失败: ${error.message}`);
    return false;
  }
}

/**
 * 预处理配置文件，确保日志配置正确注入
 * @param {String} configPath 配置文件路径
 * @returns {Promise<Boolean>} 是否处理成功
 */
async function preprocessConfig(configPath) {
  try {
    if (!configPath || !fs.existsSync(configPath)) {
      logger.error('预处理配置失败：配置文件不存在');
      return false;
    }

    // 读取配置文件
    const configContent = fs.readFileSync(configPath, 'utf8');
    let targetConfig = JSON.parse(configContent);
    
    // 获取设置管理器并确保设置已加载
    const settingsManager = require('./settings-manager');
    let settings;
    let logPath;
    
    try {
      await settingsManager.loadSettings(); // 确保设置已加载
      settings = settingsManager.getSettings();
      logPath = settingsManager.getLogPath();
    } catch (settingsError) {
      logger.warn(`设置管理器初始化失败，使用默认值: ${settingsError.message}`);
      // 使用默认设置
      settings = {
        proxyPort: '7890',
        allowLan: false,
        apiAddress: '127.0.0.1:9090',
        tunMode: false,
        logLevel: 'info',
        logDisabled: false
      };
      // 使用默认日志路径
      const { generateDefaultLogPath } = require('../utils/paths');
      logPath = generateDefaultLogPath();
    }
    
    // 构建用户配置对象
    const userConfig = {
      settings: {
        allow_lan: settings.allowLan || false,
        api_address: settings.apiAddress || '127.0.0.1:9090',
        tun_mode: settings.tunMode || false,
        log_enabled: true, // 强制启用日志配置注入
        log_level: settings.logLevel || 'info',
        log_output: logPath,
        log_disabled: settings.logDisabled || false,
        log_timestamp: true
      }
    };
    
    logger.info(`预处理配置文件: ${configPath}`);
    logger.info(`强制注入日志配置: ${userConfig.settings.log_output}`);
    
    // 应用配置映射
    const mappedConfig = applyConfigMapping(userConfig, targetConfig);
    
    // 验证日志配置是否正确注入
    if (!mappedConfig.log || !mappedConfig.log.output) {
      logger.warn('映射引擎注入失败，手动强制设置日志配置');
      mappedConfig.log = {
        level: userConfig.settings.log_level,
        output: userConfig.settings.log_output,
        disabled: userConfig.settings.log_disabled,
        timestamp: userConfig.settings.log_timestamp
      };
    }
    
    // 确保日志文件的父目录存在
    try {
      const logOutputPath = mappedConfig.log.output;
      if (logOutputPath) {
        const logDir = path.dirname(logOutputPath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
          logger.info(`创建日志目录: ${logDir}`);
        }
      }
    } catch (dirError) {
      logger.error(`创建日志目录失败: ${dirError.message}`);
    }
    
    // 将处理后的配置写回文件
    fs.writeFileSync(configPath, JSON.stringify(mappedConfig, null, 2), 'utf8');
    
    logger.info(`配置文件预处理完成，日志配置已强制注入: ${mappedConfig.log.output}`);
    return true;
    
  } catch (error) {
    logger.error(`预处理配置文件失败: ${error.message}`);
    return false;
  }
}

module.exports = {
  scanProfileConfig,
  getConfigPath,
  setConfigPath,
  setConfigPathSmart,
  loadUserSettings,
  saveUserSettings,
  getAppSettings,
  saveAppSettings,
  updateAppSetting,
  loadUserConfig,
  saveUserConfig,
  applyConfigMapping,
  loadMappingDefinition,
  getMappingDefinitionPath,
  isLvorySyncConfig,
  processLvorySyncConfig,
  refreshLvorySyncConfig,
  preprocessConfig
}; 