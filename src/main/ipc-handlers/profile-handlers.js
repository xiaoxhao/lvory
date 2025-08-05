/**
 * 配置文件相关IPC处理程序
 */
const { ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const utils = require('./utils');
const profileManager = require('../profile-manager');
const mappingDefinition = require('../engine/mapping-definition');
const profileEngine = require('../engine/profiles-engine');

/**
 * 设置配置文件相关IPC处理程序
 */
function setup() {
  // 获取配置文件路径
  ipcMain.handle('get-config-path', async () => {
    try {
      return profileManager.getConfigPath();
    } catch (error) {
      logger.error('获取配置文件路径失败:', error);
      return null;
    }
  });
  
  // 获取配置目录路径
  ipcMain.handle('get-config-dir', async () => {
    try {
      return utils.getConfigDir();
    } catch (error) {
      logger.error('获取配置目录路径失败:', error);
      return null;
    }
  });
  
  // 设置配置文件路径
  ipcMain.handle('set-config-path', async (event, filePath, options = {}) => {
    try {
      if (!filePath) {
        return { success: false, error: '文件路径不能为空' };
      }

      const configDir = utils.getConfigDir();
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(configDir, filePath);

      // 检查文件是否存在
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `文件不存在: ${fullPath}` };
      }

      // 如果指定了内核类型，先切换内核
      if (options.coreType) {
        const coreFactory = require('../../utils/core-manager/core-factory');
        const currentCoreType = coreFactory.getCurrentCoreType();

        if (currentCoreType !== options.coreType) {
          logger.info(`切换内核类型: ${currentCoreType} -> ${options.coreType}`);
          const switchResult = await coreFactory.switchCore(options.coreType);
          if (!switchResult.success && !switchResult.warning) {
            logger.warn(`内核切换失败: ${switchResult.error}`);
            // 继续执行，但记录警告
          }
        }
      }

      // 获取SingBox实例检查是否正在运行
      const singbox = require('../../utils/sing-box');
      const isRunning = singbox.isRunning();

      // 使用profileManager的智能设置方法处理Lvory和SingBox配置
      const success = await profileManager.setConfigPathSmart(fullPath);
      if (success) {
        logger.info(`配置文件已成功设置: ${fullPath} (协议: ${options.protocol || 'auto'})`);
        
        // 如果内核正在运行，需要重启以应用新配置
        if (isRunning) {
          logger.info('检测到内核正在运行，重启内核以应用新配置');
          try {
            // 先停止内核
            logger.info('正在停止当前运行的内核...');
            const stopResult = await singbox.stopCore();
            if (!stopResult.success) {
              logger.warn(`停止内核时出现警告: ${stopResult.error}`);
            }
            
            // 等待停止完成并确认状态
            let stopAttempts = 0;
            const maxStopAttempts = 10;
            while (singbox.isRunning() && stopAttempts < maxStopAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500));
              stopAttempts++;
            }
            
            if (singbox.isRunning()) {
              logger.warn('内核停止超时，强制继续启动新配置');
            } else {
              logger.info('内核已成功停止');
            }
            
            // 获取设置管理器用于启动内核
            const settingsManager = require('../settings-manager');
            const settings = settingsManager.getSettings();
            const proxyConfig = settingsManager.getProxyConfig(fullPath);
            
            // 使用新配置重新启动内核
            logger.info(`正在使用新配置启动内核: ${fullPath}`);
            const startResult = await singbox.startCore({ 
              configPath: fullPath,
              proxyConfig,
              enableSystemProxy: proxyConfig.enableSystemProxy,
              tunMode: settings.tunMode || false
            });
            
            if (!startResult.success) {
              logger.error(`重启内核失败: ${startResult.error}`);
              return { 
                success: false, 
                error: `配置已切换但重启内核失败: ${startResult.error}`,
                configPath: fullPath 
              };
            }
            
            logger.info('内核已成功重启并应用新配置');
          } catch (restartError) {
            logger.error('重启内核过程中发生错误:', restartError);
            return { 
              success: false, 
              error: `配置已切换但重启内核失败: ${restartError.message}`,
              configPath: fullPath 
            };
          }
        }
        
        // 通知前端配置文件已切换 - 使用多个事件确保所有组件都能收到通知
        const mainWindow = utils.getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('profiles-changed');
          mainWindow.webContents.send('config-changed');
          mainWindow.webContents.send('dashboard-refresh');
        }
        
        return { success: true, configPath: fullPath };
      } else {
        return { success: false, error: '设置配置文件路径失败' };
      }
    } catch (error) {
      logger.error('设置配置文件路径失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取profiles数据
  ipcMain.handle('get-profile-data', async () => {
    try {
      const outbounds = profileManager.scanProfileConfig();
      
      // 转换为前端需要的格式
      const profileData = outbounds.map(item => ({
        tag: item.tag,
        type: item.type,
        server: item.server || '',
        description: `${item.type || 'Unknown'} - ${item.server || 'N/A'}`
      }));
      
      // 保持与原有API格式一致，返回对象而不是直接返回数组
      return {
        success: true,
        profiles: profileData
      };
    } catch (error) {
      logger.error('获取配置文件数据失败:', error);
      return {
        success: false,
        error: error.message,
        profiles: []
      };
    }
  });
  
  // 获取配置文件列表
  ipcMain.handle('getProfileFiles', async () => {
    try {
      const configDir = utils.getConfigDir();
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        return { success: true, files: [] };
      }
      
      const metaCache = utils.readMetaCache();
      
      const files = fs.readdirSync(configDir)
        // 显示JSON和YAML配置文件，但排除缓存文件
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          const isConfigFile = ext === '.json' || ext === '.yaml' || ext === '.yml';
          
          // 排除Lvory缓存文件（通过meta标记识别）
          if (metaCache[file] && metaCache[file].isCache) {
            return false;
          }
          
          return isConfigFile;
        })
        .map(file => {
          const filePath = path.join(configDir, file);
          const stats = fs.statSync(filePath);
          
          // 尝试获取元数据
          let status = 'active';
          let protocol = 'singbox'; // 默认协议
          let hasCache = false;
          let cacheInfo = null;

          try {
            if (metaCache[file]) {
              status = metaCache[file].status || 'active';
              protocol = metaCache[file].protocol || 'singbox';
            } else {
              // 如果没有元数据，尝试根据文件内容自动检测协议类型
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                const ext = path.extname(file).toLowerCase();

                if (ext === '.json') {
                  // JSON文件默认为 singbox
                  protocol = 'singbox';
                } else if (ext === '.yaml' || ext === '.yml') {
                  // YAML文件根据内容判断
                  if (content.includes('lvory_sync:')) {
                    protocol = 'lvory';
                  } else if (content.includes('proxies:') || content.includes('proxy-groups:')) {
                    protocol = 'mihomo';
                  } else {
                    protocol = 'mihomo'; // YAML文件默认为 mihomo
                  }
                }
              } catch (err) {
                logger.warn(`自动检测协议类型失败: ${err.message}`);
              }
            }
              
              // 检查是否有缓存文件
              if (metaCache[file].singboxCache) {
                hasCache = true;
                const cacheFileName = metaCache[file].singboxCache;
                const cachePath = path.join(configDir, cacheFileName);
                
                if (fs.existsSync(cachePath)) {
                  const cacheStats = fs.statSync(cachePath);
                  cacheInfo = {
                    fileName: cacheFileName,
                    size: `${Math.round(cacheStats.size / 1024)} KB`,
                    lastGenerated: metaCache[cacheFileName] ? metaCache[cacheFileName].lastGenerated : null
                  };
                } else {
                  hasCache = false; // 缓存文件不存在
                }
              }
            }
          } catch (err) {
            logger.error(`读取文件状态失败: ${err.message}`);
          }
          
          // 检查文件是否包含必要字段
          let isComplete = true;
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const ext = path.extname(file).toLowerCase();

            if (ext === '.json') {
              // JSON文件检查inbounds字段 (SingBox)
              const configObj = JSON.parse(content);
              if (!configObj.inbounds || configObj.inbounds.length === 0) {
                isComplete = false;
              }
            } else if (ext === '.yaml' || ext === '.yml') {
              // YAML文件根据协议类型检查不同字段
              if (protocol === 'lvory') {
                // Lvory协议检查lvory_sync字段
                if (!content.includes('lvory_sync:')) {
                  isComplete = false;
                }
              } else if (protocol === 'mihomo') {
                // Mihomo协议检查proxies字段
                if (!content.includes('proxies:')) {
                  isComplete = false;
                }
              } else {
                // 通用检查
                if (!content.includes('lvory_sync:') && !content.includes('proxies:')) {
                  isComplete = false;
                }
              }
            }
          } catch (err) {
            logger.error(`检查配置文件结构失败: ${err.message}`);
            isComplete = false;
          }
          
          return {
            name: file,
            path: filePath,
            size: `${Math.round(stats.size / 1024)} KB`,
            createDate: new Date(stats.birthtime).toLocaleDateString(),
            modifiedDate: new Date(stats.mtime).toLocaleDateString(),
            status: status,
            protocol: protocol,
            isComplete: isComplete,
            hasCache: hasCache,
            cacheInfo: cacheInfo
          };
        });
      
      return { success: true, files };
    } catch (error) {
      logger.error(`获取配置文件列表失败: ${error.message}`);
      return { success: false, error: error.message, files: [] };
    }
  });
  
  // 获取配置文件元数据
  ipcMain.handle('getProfileMetadata', async (event, fileName) => {
    try {
      if (!fileName) {
        return {
          success: false,
          error: 'File name is required'
        };
      }
      
      // 从meta.cache读取
      const metaCache = utils.readMetaCache();
      if (metaCache[fileName]) {
        logger.info(`从meta.cache获取元数据: ${fileName}`);
        return {
          success: true,
          metadata: metaCache[fileName]
        };
      }
      
      // 如果没有找到元数据
      return {
        success: false,
        error: 'Metadata not found for this file'
      };
    } catch (error) {
      logger.error(`获取配置文件元数据失败: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  // 删除配置文件
  ipcMain.handle('deleteProfile', async (event, fileName) => {
    try {
      const configDir = utils.getConfigDir();
      const filePath = path.join(configDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }
      
      fs.unlinkSync(filePath);
      
      // 更新meta.cache
      const metaCache = utils.readMetaCache();
      if (metaCache[fileName]) {
        delete metaCache[fileName];
        utils.writeMetaCache(metaCache);
      }
      
      // 触发配置文件变更事件
      const mainWindow = utils.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('profiles-changed');
      }
      
      return { success: true };
    } catch (error) {
      logger.error(`删除配置文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 使用默认编辑器打开配置文件
  ipcMain.handle('openFileInEditor', async (event, fileName) => {
    try {
      const configDir = utils.getConfigDir();
      const filePath = path.join(configDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }
      
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      logger.error(`打开编辑器失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 打开配置文件所在目录
  ipcMain.handle('openConfigDir', async () => {
    try {
      const configDir = utils.getConfigDir();
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      shell.openPath(configDir);
      return { success: true };
    } catch (error) {
      logger.error(`打开配置目录失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 配置文件变更事件处理
  const profileChangedHandler = (webContents) => {
    if (!webContents.isDestroyed()) {
      webContents.send('profiles-changed');
    }
  };

  ipcMain.on('profiles-changed-listen', (event) => {
    const webContents = event.sender;
    
    // 先移除该 webContents 可能存在的旧监听器
    ipcMain.removeAllListeners('profiles-changed-notify');
    
    // 添加新的监听器
    const handler = () => profileChangedHandler(webContents);
    ipcMain.on('profiles-changed-notify', handler);
    
    // 当 webContents 被销毁时自动清理监听器
    webContents.on('destroyed', () => {
      ipcMain.removeListener('profiles-changed-notify', handler);
    });
  });
  
  // 移除配置文件变更监听
  ipcMain.on('profiles-changed-unlisten', () => {
    ipcMain.removeAllListeners('profiles-changed-notify');
  });

  // 重新预处理当前配置文件
  ipcMain.handle('reprocess-current-config', async () => {
    try {
      const configPath = profileManager.getConfigPath();
      if (!configPath) {
        return { success: false, error: '没有当前配置文件' };
      }
      
      const success = await profileManager.preprocessConfig(configPath);
      if (success) {
        logger.info('当前配置文件已重新预处理');
        return { success: true };
      } else {
        return { success: false, error: '重新预处理配置文件失败' };
      }
    } catch (error) {
      logger.error('重新预处理配置文件失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取用户配置
  ipcMain.handle('get-user-config', async () => {
    try {
      const userConfig = profileManager.loadUserConfig();
      return { success: true, config: userConfig };
    } catch (error) {
      logger.error('获取用户配置失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 保存用户配置
  ipcMain.handle('save-user-config', async (event, config) => {
    try {
      if (!config) {
        return { success: false, error: '配置不能为空' };
      }
      
      const success = profileManager.saveUserConfig(config);
      if (success) {
        logger.info('用户配置已保存并应用映射');
        
        // 通知前端配置已更新
        const mainWindow = utils.getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('user-config-updated');
        }
        
        return { success: true };
      } else {
        return { success: false, error: '保存用户配置失败' };
      }
    } catch (error) {
      logger.error('保存用户配置失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取映射定义
  ipcMain.handle('get-mapping-definition', async () => {
    try {
      const mappings = profileManager.loadMappingDefinition();
      return { success: true, mappings };
    } catch (error) {
      logger.error('获取映射定义失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 保存映射定义
  ipcMain.handle('save-mapping-definition', async (event, mappings) => {
    try {
      const mappingPath = profileManager.getMappingDefinitionPath();
      
      const definition = { mappings };
      fs.writeFileSync(mappingPath, JSON.stringify(definition, null, 2), 'utf8');
      
      // 清除缓存，下次加载时会重新读取
      profileManager.loadMappingDefinition();
      
      logger.info('映射定义已保存');
      return { success: true };
    } catch (error) {
      logger.error('保存映射定义失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取默认映射定义
  ipcMain.handle('get-default-mapping-definition', async () => {
    try {
      const defaultDefinition = mappingDefinition.getDefaultMappingDefinition();
      return { success: true, definition: defaultDefinition };
    } catch (error) {
      logger.error('获取默认映射定义失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取特定协议的映射模板
  ipcMain.handle('get-protocol-template', async (event, protocol) => {
    try {
      if (!protocol) {
        return { success: false, error: '协议类型不能为空' };
      }
      
      const template = mappingDefinition.getProtocolTemplate(protocol);
      return { success: true, template };
    } catch (error) {
      logger.error(`获取协议模板失败 (${protocol}): ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 创建特定协议的映射定义
  ipcMain.handle('create-protocol-mapping', async (event, protocol) => {
    try {
      if (!protocol) {
        return { success: false, error: '协议类型不能为空' };
      }
      
      const mapping = mappingDefinition.createProtocolMapping(protocol);
      return { success: true, mapping };
    } catch (error) {
      logger.error(`创建协议映射失败 (${protocol}): ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 应用映射到现有配置
  ipcMain.handle('apply-config-mapping', async () => {
    try {
      const userConfig = profileManager.loadUserConfig();
      
      // 获取当前sing-box配置
      let targetConfig = {};
      const configPath = profileManager.getConfigPath();
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        targetConfig = JSON.parse(configContent);
      }
      
      // 应用映射
      const mappedConfig = profileManager.applyConfigMapping(userConfig, targetConfig);
      
      // 保存映射后的sing-box配置
      fs.writeFileSync(configPath, JSON.stringify(mappedConfig, null, 2), 'utf8');
      
      logger.info('配置映射已应用到sing-box配置');
      return { success: true };
    } catch (error) {
      logger.error('应用配置映射失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取映射定义路径
  ipcMain.handle('get-mapping-definition-path', async () => {
    try {
      const mappingPath = profileManager.getMappingDefinitionPath();
      return { success: true, path: mappingPath };
    } catch (error) {
      logger.error('获取映射定义路径失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 刷新Lvory同步配置
  ipcMain.handle('refresh-lvory-sync', async () => {
    try {
      const success = await profileManager.refreshLvorySyncConfig(true); // 强制刷新缓存
      if (success) {
        logger.info('Lvory同步配置刷新成功');
        
        // 通知前端配置已更新
        const mainWindow = utils.getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('profiles-changed');
          mainWindow.webContents.send('config-changed');
          mainWindow.webContents.send('dashboard-refresh');
        }
        
        return { success: true, message: 'Lvory同步配置已刷新，缓存已更新' };
      } else {
        return { success: false, error: '未找到Lvory同步配置或刷新失败' };
      }
    } catch (error) {
      logger.error('刷新Lvory同步配置失败:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 获取规则集
  ipcMain.handle('get-rule-sets', async () => {
    try {
      // 获取当前配置文件路径
      const configPath = profileManager.getConfigPath();
      if (!configPath || !fs.existsSync(configPath)) {
        return { success: false, error: '配置文件不存在' };
      }
      
      // 读取配置文件
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      // 使用引擎获取规则集
      const ruleSets = profileEngine.getValueByPath(config, 'route.rule_set');
      
      return {
        success: true,
        ruleSets: Array.isArray(ruleSets) ? ruleSets : []
      };
    } catch (error) {
      logger.error('获取规则集失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取节点组信息
  ipcMain.handle('get-node-groups', async () => {
    try {
      // 获取当前配置文件路径
      const configPath = profileManager.getConfigPath();
      if (!configPath || !fs.existsSync(configPath)) {
        return { success: false, error: '配置文件不存在' };
      }
      
      // 读取配置文件
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      // 获取outbounds数组
      const outbounds = profileEngine.getValueByPath(config, 'outbounds');
      if (!Array.isArray(outbounds)) {
        return { success: false, error: 'outbounds不是数组或不存在' };
      }
      
      // 区分节点和节点组
      const nodeGroups = [];
      const nodes = [];
      
      outbounds.forEach(outbound => {
        // 如果有outbounds属性且是数组，则视为节点组
        if (outbound.outbounds && Array.isArray(outbound.outbounds) && outbound.outbounds.length > 0) {
          nodeGroups.push({
            tag: outbound.tag,
            type: outbound.type,
            outbounds: outbound.outbounds,
            interval: outbound.interval,
            url: outbound.url,
            tolerance: outbound.tolerance
          });
        } else {
          // 普通节点
          nodes.push(outbound);
        }
      });
      
      // 为每个节点添加组信息
      const nodesWithGroup = nodes.map(node => {
        // 查找该节点属于哪些组
        const belongsToGroups = nodeGroups
          .filter(group => group.outbounds.includes(node.tag))
          .map(group => group.tag);
        
        return {
          ...node,
          groups: belongsToGroups
        };
      });
      
      return {
        success: true,
        nodeGroups: nodeGroups,
        nodes: nodesWithGroup
      };
    } catch (error) {
      logger.error('获取节点组信息失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取当前配置文件内容
  ipcMain.handle('get-current-config', async () => {
    try {
      const configPath = profileManager.getConfigPath();
      if (!configPath || !fs.existsSync(configPath)) {
        return { success: false, error: '配置文件不存在' };
      }
      
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      return {
        success: true,
        config: config,
        configPath: configPath
      };
    } catch (error) {
      logger.error('获取当前配置文件内容失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 载入本地文件
  ipcMain.handle('loadLocalProfile', async (event, { fileName, content, protocol }) => {
    try {
      if (!fileName || !content) {
        return { success: false, error: '文件名和内容不能为空' };
      }

      const configDir = utils.getConfigDir();
      
      // 确保配置目录存在
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // 构建完整文件路径
      const filePath = path.join(configDir, fileName);
      
      // 检查文件是否已存在
      if (fs.existsSync(filePath)) {
        return { success: false, error: `文件已存在: ${fileName}` };
      }

      // 根据协议类型验证和处理内容
      let validatedContent = content;
      if (protocol === 'lvory') {
        // 对于lvory协议，验证格式
        try {
          if (content.includes('lvory_sync:')) {
            // Lvory同步协议配置
            const yaml = require('js-yaml');
            const parsed = yaml.load(content);
            if (!parsed || !parsed.lvory_sync) {
              return { success: false, error: '无效的Lvory同步协议格式' };
            }
          } else if (content.includes('proxies:')) {
            // Clash格式配置
            const yaml = require('js-yaml');
            const parsed = yaml.load(content);
            if (!parsed || !parsed.proxies) {
              return { success: false, error: '无效的Clash配置格式' };
            }
          } else {
            logger.warn('文件内容可能不是有效的lvory格式');
          }
        } catch (err) {
          return { success: false, error: `无效的YAML格式: ${err.message}` };
        }
      } else if (protocol === 'mihomo') {
        // 对于mihomo协议，验证YAML格式
        try {
          const yaml = require('js-yaml');
          const parsed = yaml.load(content);

          // 验证Mihomo/Clash配置基本结构
          if (!parsed || (typeof parsed !== 'object')) {
            return { success: false, error: '无效的YAML配置格式' };
          }

          // 检查是否包含Clash/Mihomo的基本字段
          const hasValidStructure = parsed.proxies || parsed['proxy-groups'] ||
                                   parsed.rules || parsed.port || parsed['mixed-port'];

          if (!hasValidStructure) {
            logger.warn('文件内容可能不是有效的Mihomo/Clash配置格式');
          }

          // 保持原始YAML格式
          validatedContent = content;
        } catch (err) {
          return { success: false, error: `无效的YAML格式: ${err.message}` };
        }
      } else {
        // 对于singbox协议，验证JSON格式
        try {
          const parsedContent = JSON.parse(content);
          validatedContent = JSON.stringify(parsedContent, null, 2);

          // 验证SingBox配置基本结构
          if (!parsedContent.inbounds && !parsedContent.outbounds) {
            logger.warn('文件内容可能不是有效的SingBox配置格式');
          }
        } catch (err) {
          return { success: false, error: `无效的JSON格式: ${err.message}` };
        }
      }

      // 写入文件
      fs.writeFileSync(filePath, validatedContent, 'utf8');
      
      // 更新meta.cache记录
      const metaCache = utils.readMetaCache();
      metaCache[fileName] = {
        status: 'active',
        protocol: protocol,
        loadedAt: new Date().toISOString(),
        source: 'local'
      };
      utils.writeMetaCache(metaCache);

      logger.info(`本地文件已载入: ${fileName} (协议: ${protocol})`);

      // 通知前端配置文件列表已更新
      const mainWindow = utils.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('profiles-changed');
      }

      return { 
        success: true, 
        fileName: fileName,
        filePath: filePath,
        protocol: protocol
      };
    } catch (error) {
      logger.error(`载入本地文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  setup
}; 