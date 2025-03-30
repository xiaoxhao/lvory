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
  
  // 设置配置文件路径
  ipcMain.handle('set-config-path', async (event, filePath) => {
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
      
      // 使用profileManager的setConfigPath方法
      const success = profileManager.setConfigPath(fullPath);
      if (success) {
        logger.info(`设置当前配置文件路径: ${fullPath}`);
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
      
      const files = fs.readdirSync(configDir)
        // 仅显示JSON配置文件
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ext === '.json';
        })
        .map(file => {
          const filePath = path.join(configDir, file);
          const stats = fs.statSync(filePath);
          
          // 尝试获取元数据
          let status = 'active';
          try {
            const metaCache = utils.readMetaCache();
            if (metaCache[file] && metaCache[file].status) {
              status = metaCache[file].status;
            }
          } catch (err) {
            logger.error(`读取文件状态失败: ${err.message}`);
          }
          
          return {
            name: file,
            path: filePath,
            size: `${Math.round(stats.size / 1024)} KB`,
            createDate: new Date(stats.birthtime).toLocaleDateString(),
            modifiedDate: new Date(stats.mtime).toLocaleDateString(),
            status: status
          };
        });
      
      logger.info(`找到${files.length}个配置文件`);
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
}

module.exports = {
  setup
}; 